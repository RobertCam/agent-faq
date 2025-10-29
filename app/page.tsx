'use client';

import { useState } from 'react';

interface WorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedQuestions: any[];
  faqComponent: any;
}

export default function Home() {
  const [brand, setBrand] = useState('Starbucks');
  const [vertical, setVertical] = useState('Coffee / QSR');
  const [region, setRegion] = useState('Vancouver');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!brand || !vertical || !region) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setLogs([]);
    setDraftId(null);
    setWorkflowData(null);

    try {
      const response = await fetch('/api/run-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brand, vertical, region }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to run agent');
      }

      setDraftId(data.draftId);
      setLogs(data.logs || []);
      setWorkflowData(data.workflowData || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            AI-Driven FAQ Generator
          </h1>
          <p className="text-gray-600 mb-8">
            Generate FAQs automatically using AI agent orchestration with MCP tools.
          </p>

          <div className="space-y-6 mb-8">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Starbucks"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="vertical" className="block text-sm font-medium text-gray-700 mb-2">
                Vertical
              </label>
              <input
                type="text"
                id="vertical"
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                placeholder="e.g., Coffee / QSR"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <input
                type="text"
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Vancouver"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating FAQ...' : 'Run 7-day fetch now'}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Status Log</h2>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {workflowData && (
            <div className="mt-8 space-y-6">
              {/* Generated Seeds */}
              {workflowData.seeds.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    🔍 Generated Seed Queries ({workflowData.seeds.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {workflowData.seeds.slice(0, 15).map((seed, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {seed}
                      </span>
                    ))}
                    {workflowData.seeds.length > 15 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        +{workflowData.seeds.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* PAA Questions */}
              {workflowData.paaRows.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📋 People Also Ask Questions ({workflowData.paaRows.length})
                  </h3>
                  <div className="space-y-3">
                    {workflowData.paaRows.slice(0, 10).map((row: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <p className="font-medium text-gray-900">{row.question}</p>
                        {row.snippet && (
                          <p className="text-sm text-gray-600 mt-1">{row.snippet.substring(0, 100)}...</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranked Questions */}
              {workflowData.rankedQuestions.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    ⭐ Top Ranked Questions ({workflowData.rankedQuestions.length})
                  </h3>
                  <div className="space-y-3">
                    {workflowData.rankedQuestions.map((q: any, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{q.question}</p>
                          <p className="text-xs text-gray-500 mt-1">Score: {q.score} • {q.reasoning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated FAQ */}
              {workflowData.faqComponent && (
                <div className="border border-green-300 rounded-lg p-6 bg-green-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ✅ Generated FAQ ({workflowData.faqComponent.items.length} items)
                  </h3>
                  <div className="space-y-4">
                    {workflowData.faqComponent.items.map((item: any, index: number) => (
                      <div key={index} className="bg-white p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">{item.question}</h4>
                        <p className="text-gray-700 text-sm">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {draftId && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm mb-3">
                ✅ FAQ generated successfully!
              </p>
              <a
                href={`/editor/${draftId}`}
                className="inline-block bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Open draft in PUCK editor →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
