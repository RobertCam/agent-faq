'use client';

import { ContentType } from '@/lib/types';

export type EntityPublishStatus = 'pending' | 'publishing' | 'verifying' | 'success' | 'failed';

export interface EntityPublishState {
  entityId: string;
  entityName: string;
  city?: string;
  status: EntityPublishStatus;
  message?: string;
  verification?: string;
  uuid?: string;
  error?: string;
}

interface PublishOverlayProps {
  open: boolean;
  phase: 'publishing' | 'done';
  contentType: ContentType;
  fieldId?: string;
  category?: string;
  entityStates: EntityPublishState[];
  currentIndex: number;
  total: number;
  currentMessage?: string;
  summary: { total: number; succeeded: number; failed: number } | null;
  fatalError?: string | null;
  onClose: () => void;
  onBackToRun: () => void;
  onStartNew: () => void;
}

function StatusIcon({ status }: { status: EntityPublishStatus }) {
  switch (status) {
    case 'success':
      return <span className="text-green-600 font-bold">✓</span>;
    case 'failed':
      return <span className="text-red-600 font-bold">✕</span>;
    case 'publishing':
    case 'verifying':
      return <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    default:
      return <span className="text-gray-300">○</span>;
  }
}

function statusLabel(status: EntityPublishStatus): string {
  switch (status) {
    case 'pending':
      return 'Waiting';
    case 'publishing':
      return 'Publishing…';
    case 'verifying':
      return 'Verifying in Yext…';
    case 'success':
      return 'Verified';
    case 'failed':
      return 'Failed';
  }
}

export function PublishOverlay({
  open,
  phase,
  contentType,
  fieldId,
  category,
  entityStates,
  currentIndex,
  total,
  currentMessage,
  summary,
  fatalError,
  onClose,
  onBackToRun,
  onStartNew,
}: PublishOverlayProps) {
  if (!open) return null;

  const progressPct = total > 0 ? Math.round((currentIndex / total) * 100) : 0;
  const allSuccess = summary && summary.failed === 0 && !fatalError;
  const allFailed = (summary && summary.succeeded === 0) || !!fatalError;
  const partial = summary && summary.failed > 0 && summary.succeeded > 0 && !fatalError;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto overflow-hidden">
        {phase === 'publishing' ? (
          <>
            <div className="shrink-0 px-8 pt-10 pb-6 border-b">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <h2 className="text-2xl font-bold text-gray-900">Publishing to Yext</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {contentType} content → <code className="text-xs bg-gray-100 px-1 rounded">{fieldId}</code>
                {category && ` · ${category}`}
              </p>
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{currentMessage || 'Starting…'}</span>
                  <span>
                    {currentIndex} / {total}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 py-6 space-y-2">
              {entityStates.map((e) => (
                <li
                  key={e.entityId}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    e.status === 'publishing' || e.status === 'verifying'
                      ? 'border-blue-300 bg-blue-50'
                      : e.status === 'success'
                        ? 'border-green-200 bg-green-50'
                        : e.status === 'failed'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="mt-0.5 w-5 flex justify-center">
                    <StatusIcon status={e.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{e.entityName}</p>
                    <p className="text-xs text-gray-500">
                      {e.city ? `${e.city} · ` : ''}
                      {e.entityId}
                    </p>
                    <p className="text-xs mt-1 text-gray-600">{statusLabel(e.status)}</p>
                    {e.error && <p className="text-xs mt-1 text-red-700">{e.error}</p>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="shrink-0 px-8 py-5 border-t bg-gray-50 text-center text-sm text-gray-500">
              Please keep this tab open until publishing finishes
            </div>
          </>
        ) : (
          <>
            <div
              className={`shrink-0 px-8 pt-10 pb-8 border-b ${
                allSuccess ? 'bg-green-50' : allFailed ? 'bg-red-50' : 'bg-amber-50'
              }`}
            >
              <div className="text-5xl mb-4">{allSuccess ? '✓' : allFailed ? '✕' : '⚠'}</div>
              <h2
                className={`text-3xl font-bold ${
                  allSuccess ? 'text-green-800' : allFailed ? 'text-red-800' : 'text-amber-800'
                }`}
              >
                {fatalError
                  ? 'Publish interrupted'
                  : allSuccess
                    ? 'Published & verified'
                    : allFailed
                      ? 'Publish failed'
                      : 'Published with issues'}
              </h2>
              <p
                className={`mt-3 text-base ${
                  allSuccess ? 'text-green-700' : allFailed ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {fatalError
                  ? fatalError
                  : summary
                    ? `${summary.succeeded} of ${summary.total} entities updated and verified in Yext Knowledge Graph.`
                    : 'Publish complete.'}
              </p>
              {partial && (
                <p className="text-xs text-amber-800 mt-2">
                  {summary?.failed} entit{summary?.failed === 1 ? 'y' : 'ies'} could not be verified. Review details
                  below.
                </p>
              )}
            </div>

            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 py-6 space-y-3">
              {entityStates.map((e) => (
                <li
                  key={e.entityId}
                  className={`p-4 rounded-lg border ${
                    e.status === 'success' ? 'border-green-200 bg-white' : 'border-red-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon status={e.status} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{e.entityName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{e.entityId}</p>
                      {e.status === 'success' ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-green-700">{e.verification || 'Content verified in Yext'}</p>
                          {e.uuid && (
                            <p className="text-xs text-gray-500 font-mono">Yext UUID: {e.uuid}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-red-700 mt-2">{e.error || 'Unknown error'}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="shrink-0 px-8 py-6 border-t bg-gray-50 flex flex-wrap gap-3 justify-end">
              {!allFailed && (
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-white"
                >
                  Back to review
                </button>
              )}
              <button
                onClick={onBackToRun}
                className="px-5 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-white"
              >
                Back to agent run
              </button>
              <button
                onClick={onStartNew}
                className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start new run
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
