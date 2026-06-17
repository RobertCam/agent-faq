'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryCombobox } from '@/components/CategoryCombobox';
import { WorkflowDetails } from '@/components/WorkflowDetails';
import { getDefaultFieldId, getFieldIdLabel } from '@/lib/constants';
import { loadSession, saveSession, WorkflowData } from '@/lib/session-cache';
import { ContentType } from '@/lib/types';

interface YextEntity {
  id: string;
  name: string;
  entityType?: string;
  address?: { city?: string; region?: string; line1?: string };
}

interface Step {
  step: number;
  name: string;
  status: 'running' | 'completed';
  data?: any;
}

export default function Home() {
  const router = useRouter();
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Coffee shop');
  const [contentType, setContentType] = useState<ContentType>('FAQ');
  const [fieldId, setFieldId] = useState(getDefaultFieldId('FAQ'));
  const [customInstructions, setCustomInstructions] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    seeds: [],
    paaRows: [],
    rankedQuestions: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<YextEntity[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const cached = loadSession();
    if (cached) {
      if (cached.brand) setBrand(cached.brand);
      if (cached.category) setCategory(cached.category);
      if (cached.contentType) setContentType(cached.contentType as ContentType);
      if (cached.fieldId) setFieldId(cached.fieldId);
      if (cached.customInstructions) setCustomInstructions(cached.customInstructions);
      if (cached.testMode !== undefined) setTestMode(cached.testMode);
      if (cached.selectedEntityIds) setSelectedEntities(new Set(cached.selectedEntityIds));
      if (cached.steps) setSteps(cached.steps);
      if (cached.workflowData) setWorkflowData(cached.workflowData);
      if (cached.lastDraftId) setLastDraftId(cached.lastDraftId);
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!restored) return;
    saveSession({
      brand,
      category,
      contentType,
      fieldId,
      customInstructions,
      testMode,
      selectedEntityIds: Array.from(selectedEntities),
      steps,
      workflowData,
      lastDraftId,
    });
  }, [
    brand,
    category,
    contentType,
    fieldId,
    customInstructions,
    testMode,
    selectedEntities,
    steps,
    workflowData,
    lastDraftId,
    restored,
  ]);

  useEffect(() => {
    setFieldId(getDefaultFieldId(contentType));
  }, [contentType]);

  useEffect(() => {
    async function loadEntities() {
      setLoadingEntities(true);
      try {
        const res = await fetch('/api/yext/entities');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load entities');
        setEntities(data.entities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Yext entities');
      } finally {
        setLoadingEntities(false);
      }
    }
    loadEntities();
  }, []);

  const handleRun = async () => {
    if (!category.trim()) {
      setError('Please select a category');
      return;
    }
    if (selectedEntities.size === 0) {
      setError('Select at least one Yext entity');
      return;
    }
    if (!fieldId) {
      setError('Please enter a Yext field ID');
      return;
    }

    setLoading(true);
    setError(null);
    setSteps([]);
    setWorkflowData({ seeds: [], paaRows: [], rankedQuestions: [] });
    setLastDraftId(null);

    try {
      const response = await fetch('/api/run-demo-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(brand && { brand }),
          category: category.trim(),
          contentType,
          fieldId,
          customInstructions,
          testMode,
          selectedEntityIds: Array.from(selectedEntities),
        }),
      });

      if (!response.ok) throw new Error('Failed to start agent');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let buffer = '';
      let completedDraftId: string | null = null;
      let latestSteps: Step[] = [];
      let latestWorkflow: WorkflowData = { seeds: [], paaRows: [], rankedQuestions: [] };

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) return;
        const data = JSON.parse(jsonStr);

        if (data.type === 'step') {
          latestSteps = [...latestSteps.filter((s) => s.step !== data.data.step), data.data];
          setSteps(latestSteps);
        } else if (data.type === 'data') {
          latestWorkflow = { ...latestWorkflow, ...data.data };
          setWorkflowData(latestWorkflow);
        } else if (data.type === 'complete') {
          completedDraftId = data.data.draftId;
          setLastDraftId(data.data.draftId);
        } else if (data.type === 'error') {
          throw new Error(data.data.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: !done });

        const lines = buffer.split('\n');
        buffer = done ? '' : lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }

        if (done) {
          if (buffer.trim()) {
            for (const line of buffer.split('\n')) {
              processLine(line);
            }
          }
          break;
        }
      }

      if (completedDraftId) {
        saveSession({
          brand,
          category,
          contentType,
          fieldId,
          customInstructions,
          testMode,
          selectedEntityIds: Array.from(selectedEntities),
          steps: latestSteps,
          workflowData: latestWorkflow,
          lastDraftId: completedDraftId,
        });
        router.push(`/review/${completedDraftId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Content Generator</h1>
              <p className="text-gray-600 mt-2">
                Generate location-aware content templates and publish to your Yext Knowledge Graph.
              </p>
            </div>
            <a href="/docs" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Docs →
            </a>
          </div>

          {restored && lastDraftId && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-blue-800">Previous run cached — agent steps and workflow data preserved.</p>
              <a
                href={`/review/${lastDraftId}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap ml-4"
              >
                Resume review →
              </a>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Mini Golf Madness"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Primary Category
              </label>
              <CategoryCombobox value={category} onChange={setCategory} disabled={loading} />
            </div>

            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="FAQ">FAQ</option>
                <option value="COMPARISON">Product Comparison</option>
                <option value="BLOG">Blog Article</option>
              </select>
            </div>

            <div>
              <label htmlFor="fieldId" className="block text-sm font-medium text-gray-700 mb-2">
                {getFieldIdLabel(contentType)}
              </label>
              <input
                id="fieldId"
                type="text"
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="customInstructions" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Instructions <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="customInstructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                disabled={loading}
              />
              Test mode (mock PAA data, saves SerpAPI quota)
            </label>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Yext Entities ({selectedEntities.size} selected)
                </h3>
                {entities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEntities.size === entities.length) {
                        setSelectedEntities(new Set());
                      } else {
                        setSelectedEntities(new Set(entities.map((e) => e.id)));
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedEntities.size === entities.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {loadingEntities ? (
                <p className="text-sm text-gray-500">Loading entities from Yext...</p>
              ) : entities.length === 0 ? (
                <p className="text-sm text-red-600">No entities found. Check YEXT_API_KEY and YEXT_ACCOUNT_ID.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                  {entities.map((entity) => {
                    const isSelected = selectedEntities.has(entity.id);
                    return (
                      <label
                        key={entity.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const next = new Set(selectedEntities);
                            if (e.target.checked) next.add(entity.id);
                            else next.delete(entity.id);
                            setSelectedEntities(next);
                          }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{entity.name}</p>
                          <p className="text-xs text-gray-500">
                            {entity.address?.city}
                            {entity.address?.region ? `, ${entity.address.region}` : ''} · {entity.id}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading || loadingEntities || selectedEntities.size === 0}
            className="w-full mt-8 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate content'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
          )}

          {steps.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent steps</h2>
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.step}
                    className={`p-4 rounded-lg border-2 ${
                      step.status === 'completed'
                        ? 'bg-green-50 border-green-300'
                        : 'bg-yellow-50 border-yellow-300 animate-pulse'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{step.status === 'completed' ? '✅' : '⏳'}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{step.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{step.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <WorkflowDetails workflowData={workflowData} contentType={contentType} />
          </div>
        </div>
      </div>
    </div>
  );
}
