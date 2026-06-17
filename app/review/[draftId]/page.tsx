'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowDetails } from '@/components/WorkflowDetails';
import {
  PublishOverlay,
  EntityPublishState,
  EntityPublishStatus,
} from '@/components/PublishOverlay';
import { saveSession } from '@/lib/session-cache';
import {
  Draft,
  FAQComponentProps,
  ComparisonComponentProps,
  BlogComponentProps,
  ContentType,
} from '@/lib/types';

type PreviewTab = 'template' | 'example';

interface PublishProgress {
  index: number;
  total: number;
  entityId: string;
  entityName?: string;
  status: string;
  message: string;
}

interface PublishEntityResult {
  entityId: string;
  entityName?: string;
  success: boolean;
  error?: string;
  verification?: string;
  uuid?: string;
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.draftId as string;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('template');
  const [previewEntityId, setPreviewEntityId] = useState<string>('');
  const [renderedPreview, setRenderedPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishOverlayOpen, setPublishOverlayOpen] = useState(false);
  const [publishPhase, setPublishPhase] = useState<'publishing' | 'done'>('publishing');
  const [entityPublishStates, setEntityPublishStates] = useState<EntityPublishState[]>([]);
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [publishSummary, setPublishSummary] = useState<{ total: number; succeeded: number; failed: number } | null>(null);
  const [publishFatalError, setPublishFatalError] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/load-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load draft');
      setDraft(data.draft);
      setContent(data.draft.content);
      const firstEntity = data.draft.runContext?.selectedEntityIds?.[0];
      if (firstEntity) setPreviewEntityId(firstEntity);

      // Cache run context so Back preserves agent visibility on home
      if (data.draft.runContext) {
        saveSession({
          lastDraftId: draftId,
          category: data.draft.category || data.draft.vertical,
          brand: data.draft.brand || '',
          contentType: data.draft.contentType,
          fieldId: data.draft.fieldId || data.draft.runContext.fieldId,
          customInstructions: data.draft.runContext.customInstructions || '',
          testMode: data.draft.runContext.testMode || false,
          selectedEntityIds: data.draft.runContext.selectedEntityIds,
          steps: data.draft.runContext.steps,
          workflowData: {
            seeds: data.draft.runContext.seeds || [],
            paaRows: data.draft.runContext.paaRows || [],
            rankedQuestions: data.draft.runContext.rankedQuestions || [],
            faqComponent: data.draft.contentType === 'FAQ' ? data.draft.content : undefined,
            comparisonComponent: data.draft.contentType === 'COMPARISON' ? data.draft.content : undefined,
            blogComponent: data.draft.contentType === 'BLOG' ? data.draft.content : undefined,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const loadPreview = useCallback(async () => {
    if (!previewEntityId || !draftId) return;
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/preview-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, entityId: previewEntityId, content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRenderedPreview(data.rendered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }, [previewEntityId, draftId, content]);

  useEffect(() => {
    if (previewTab === 'example' && previewEntityId) {
      loadPreview();
    }
  }, [previewTab, previewEntityId, loadPreview]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/update-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDraft(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateEntityStatus = (
    entityId: string,
    patch: Partial<EntityPublishState>
  ) => {
    setEntityPublishStates((prev) =>
      prev.map((e) => (e.entityId === entityId ? { ...e, ...patch } : e))
    );
  };

  const handlePublish = async () => {
    const entities = draft?.runContext?.selectedEntities || [];
    const initialStates: EntityPublishState[] = entities.map((e) => ({
      entityId: e.id,
      entityName: e.name,
      city: e.city,
      status: 'pending' as EntityPublishStatus,
    }));

    setPublishing(true);
    setError(null);
    setPublishSummary(null);
    setPublishFatalError(null);
    setPublishProgress(null);
    setPublishPhase('publishing');
    setEntityPublishStates(initialStates);
    setPublishOverlayOpen(true);

    try {
      const response = await fetch('/api/publish-template-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, content }),
      });

      if (!response.ok) throw new Error('Failed to start publish');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let buffer = '';
      let finished = false;

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        const data = JSON.parse(line.slice(6).trim());

        if (data.type === 'start' && data.data.entities) {
          setEntityPublishStates(
            data.data.entities.map((e: { entityId: string; entityName?: string; city?: string }) => ({
              entityId: e.entityId,
              entityName: e.entityName || e.entityId,
              city: e.city,
              status: 'pending' as EntityPublishStatus,
            }))
          );
        } else if (data.type === 'progress') {
          const p = data.data as PublishProgress;
          setPublishProgress(p);
          updateEntityStatus(p.entityId, {
            entityName: p.entityName || p.entityId,
            status: p.status === 'verifying' ? 'verifying' : 'publishing',
            message: p.message,
          });
        } else if (data.type === 'entity_complete') {
          const r = data.data as PublishEntityResult;
          updateEntityStatus(r.entityId, {
            entityName: r.entityName || r.entityId,
            status: r.success ? 'success' : 'failed',
            verification: r.verification,
            uuid: r.uuid,
            error: r.error,
          });
        } else if (data.type === 'complete') {
          finished = true;
          setPublishSummary(data.data.summary);
          setPublishPhase('done');
          if (data.data.results) {
            const resultsMap = new Map(
              (data.data.results as PublishEntityResult[]).map((r) => [r.entityId, r])
            );
            setEntityPublishStates((prev) =>
              prev.map((e) => {
                const r = resultsMap.get(e.entityId);
                if (!r) return e;
                return {
                  ...e,
                  entityName: r.entityName || r.entityId,
                  status: r.success ? 'success' : 'failed',
                  verification: r.verification,
                  uuid: r.uuid,
                  error: r.error,
                };
              })
            );
          }
        } else if (data.type === 'error') {
          throw new Error(data.data.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        buffer = done ? '' : lines.pop() || '';
        for (const line of lines) processLine(line);
        if (done) {
          if (buffer.trim()) buffer.split('\n').forEach(processLine);
          break;
        }
      }

      if (!finished) {
        throw new Error('Publish stream ended unexpectedly');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      setPublishFatalError(message);
      setPublishPhase('done');
      setPublishSummary((prev) => prev || { total: initialStates.length, succeeded: 0, failed: initialStates.length });
    } finally {
      setPublishing(false);
    }
  };

  const closePublishOverlay = () => {
    setPublishOverlayOpen(false);
    setPublishPhase('publishing');
    setPublishProgress(null);
    setPublishFatalError(null);
  };

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading draft...
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  const entities = draft?.runContext?.selectedEntities || [];
  const contentType = draft?.contentType as ContentType;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Review &amp; Approve</h1>
            <p className="text-sm text-gray-600">
              {draft?.brand && `${draft.brand} · `}
              {draft?.category || draft?.vertical} · {contentType}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              ← Back to agent run
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save edits'}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : `Publish to ${entities.length} entities`}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: full agent context */}
        <aside className="lg:col-span-3 space-y-4">
          <section className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Run context</h2>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium">{draft?.category || draft?.vertical}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Field ID</dt>
                <dd className="font-mono text-xs">{draft?.fieldId || draft?.runContext?.fieldId}</dd>
              </div>
            </dl>
          </section>

          {draft?.runContext?.steps && (
            <section className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Agent steps</h2>
              <ol className="text-xs space-y-2">
                {draft.runContext.steps.map((s) => (
                  <li key={s.step} className="flex gap-2">
                    <span className="text-gray-400">{s.step}.</span>
                    <span>{s.name}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {draft?.runContext && (
            <WorkflowDetails
              compact
              contentType={contentType}
              workflowData={{
                seeds: draft.runContext.seeds || [],
                paaRows: draft.runContext.paaRows || [],
                rankedQuestions: draft.runContext.rankedQuestions || [],
                faqComponent: contentType === 'FAQ' ? content : undefined,
                comparisonComponent: contentType === 'COMPARISON' ? content : undefined,
                blogComponent: contentType === 'BLOG' ? content : undefined,
              }}
            />
          )}

          <section className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">
              Target entities ({entities.length})
            </h2>
            <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
              {entities.map((e) => (
                <li key={e.id} className="p-2 bg-gray-50 rounded">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-gray-500">
                    {e.city}
                    {e.region ? `, ${e.region}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* Center: editor */}
        <main className="lg:col-span-5">
          <section className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Edit template</h2>
            <p className="text-xs text-gray-500 mb-4">
              Use placeholders: {'{{entityName}}'}, {'{{city}}'}, {'{{address}}'}, {'{{phone}}'}, {'{{hours}}'}
            </p>
            {contentType === 'FAQ' && content && (
              <FAQEditor content={content as FAQComponentProps} onChange={setContent} />
            )}
            {contentType === 'COMPARISON' && content && (
              <ComparisonEditor content={content as ComparisonComponentProps} onChange={setContent} />
            )}
            {contentType === 'BLOG' && content && (
              <BlogEditor content={content as BlogComponentProps} onChange={setContent} />
            )}
          </section>
        </main>

        {/* Right: preview */}
        <aside className="lg:col-span-4">
          <section className="bg-white rounded-lg border p-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPreviewTab('template')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  previewTab === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Template
              </button>
              <button
                onClick={() => setPreviewTab('example')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  previewTab === 'example' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                }`}
              >
                Example entity
              </button>
            </div>

            {previewTab === 'example' && (
              <select
                value={previewEntityId}
                onChange={(e) => setPreviewEntityId(e.target.value)}
                className="w-full mb-4 px-3 py-2 border rounded-lg text-sm"
              >
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}

            {previewTab === 'template' ? (
              <ContentPreview contentType={contentType} content={content} />
            ) : previewLoading ? (
              <p className="text-sm text-gray-500">Loading preview...</p>
            ) : (
              <ContentPreview contentType={contentType} content={renderedPreview} />
            )}
          </section>

        </aside>
      </div>

      <PublishOverlay
        open={publishOverlayOpen}
        phase={publishPhase}
        contentType={contentType}
        fieldId={draft?.fieldId || draft?.runContext?.fieldId}
        category={draft?.category || draft?.vertical}
        entityStates={entityPublishStates}
        currentIndex={publishProgress?.index ?? 0}
        total={publishProgress?.total ?? entityPublishStates.length}
        currentMessage={publishProgress?.message}
        summary={publishSummary}
        fatalError={publishFatalError}
        onClose={closePublishOverlay}
        onBackToRun={handleBack}
        onStartNew={() => router.push('/')}
      />

      {error && (
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}

function FAQEditor({
  content,
  onChange,
}: {
  content: FAQComponentProps;
  onChange: (c: FAQComponentProps) => void;
}) {
  return (
    <div className="space-y-4">
      {content.items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <input
            value={item.question}
            onChange={(e) => {
              const items = [...content.items];
              items[i] = { ...items[i], question: e.target.value };
              onChange({ ...content, items });
            }}
            className="w-full px-3 py-2 border rounded text-sm font-medium"
            placeholder="Question"
          />
          <textarea
            value={item.answer}
            onChange={(e) => {
              const items = [...content.items];
              items[i] = { ...items[i], answer: e.target.value };
              onChange({ ...content, items });
            }}
            rows={3}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Answer (may include {{placeholders}})"
          />
        </div>
      ))}
    </div>
  );
}

function ComparisonEditor({
  content,
  onChange,
}: {
  content: ComparisonComponentProps;
  onChange: (c: ComparisonComponentProps) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {content.brand} vs {content.competitor}
      </p>
      {content.items.map((item, i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <input
            value={item.feature}
            onChange={(e) => {
              const items = [...content.items];
              items[i] = { ...items[i], feature: e.target.value };
              onChange({ ...content, items });
            }}
            className="px-2 py-1 border rounded text-sm"
          />
          <input
            value={item.brandValue}
            onChange={(e) => {
              const items = [...content.items];
              items[i] = { ...items[i], brandValue: e.target.value };
              onChange({ ...content, items });
            }}
            className="px-2 py-1 border rounded text-sm"
          />
          <input
            value={item.competitorValue || ''}
            onChange={(e) => {
              const items = [...content.items];
              items[i] = { ...items[i], competitorValue: e.target.value };
              onChange({ ...content, items });
            }}
            className="px-2 py-1 border rounded text-sm"
          />
        </div>
      ))}
    </div>
  );
}

function BlogEditor({
  content,
  onChange,
}: {
  content: BlogComponentProps;
  onChange: (c: BlogComponentProps) => void;
}) {
  return (
    <div className="space-y-4">
      <input
        value={content.title}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="w-full px-3 py-2 border rounded font-bold"
      />
      <textarea
        value={content.metaDescription}
        onChange={(e) => onChange({ ...content, metaDescription: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 border rounded text-sm"
        placeholder="Meta description"
      />
      {content.sections.map((section, i) => (
        <div key={i} className="border rounded p-3 space-y-2">
          <input
            value={section.heading}
            onChange={(e) => {
              const sections = [...content.sections];
              sections[i] = { ...sections[i], heading: e.target.value };
              onChange({ ...content, sections });
            }}
            className="w-full px-3 py-2 border rounded font-medium text-sm"
          />
          <textarea
            value={section.content}
            onChange={(e) => {
              const sections = [...content.sections];
              sections[i] = { ...sections[i], content: e.target.value };
              onChange({ ...content, sections });
            }}
            rows={4}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
      ))}
    </div>
  );
}

function ContentPreview({ contentType, content }: { contentType: ContentType; content: any }) {
  if (!content) return <p className="text-sm text-gray-500">No content</p>;

  if (contentType === 'FAQ') {
    const c = content as FAQComponentProps;
    return (
      <div className="space-y-3">
        {c.items?.map((item, i) => (
          <div key={i} className="border-b pb-3">
            <p className="font-medium text-gray-900 text-sm">{item.question}</p>
            <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{item.answer}</p>
          </div>
        ))}
      </div>
    );
  }

  if (contentType === 'COMPARISON') {
    const c = content as ComparisonComponentProps;
    return (
      <div className="text-sm">
        <p className="font-bold mb-2">
          {c.brand} vs {c.competitor}
        </p>
        {c.items?.map((item, i) => (
          <div key={i} className="grid grid-cols-3 gap-1 py-1 border-b text-xs">
            <span className="font-medium">{item.feature}</span>
            <span>{item.brandValue}</span>
            <span className="text-gray-600">{item.competitorValue}</span>
          </div>
        ))}
      </div>
    );
  }

  const c = content as BlogComponentProps;
  return (
    <div className="text-sm">
      <h3 className="font-bold text-lg mb-1">{c.title}</h3>
      <p className="text-gray-500 text-xs mb-4">{c.metaDescription}</p>
      {c.sections?.map((s, i) => (
        <div key={i} className="mb-4">
          <h4 className="font-semibold">{s.heading}</h4>
          <p className="text-gray-700 whitespace-pre-wrap mt-1">{s.content}</p>
        </div>
      ))}
    </div>
  );
}
