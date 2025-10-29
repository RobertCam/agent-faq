'use client';

import { useState } from 'react';

interface WorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedQuestions: any[];
  faqComponent: any;
}

interface Step {
  step: number;
  name: string;
  status: 'running' | 'completed';
  data?: any;
}

export default function Home() {
  const [brand, setBrand] = useState('Starbucks');
  const [vertical, setVertical] = useState('Coffee / QSR');
  const [region, setRegion] = useState('Vancouver');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    seeds: [],
    paaRows: [],
    rankedQuestions: [],
    faqComponent: null,
  });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!brand || !vertical || !region) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSteps([]);
    setDraftId(null);
    setWorkflowData({ seeds: [], paaRows: [], rankedQuestions: [], faqComponent: null });

    try {
      const response = await fetch('/api/run-demo-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brand, vertical, region }),
      });

      if (!response.ok) throw new Error('Failed to start agent');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'step') {
              setSteps((prev) => {
                const existing = prev.filter((s) => s.step !== data.data.step);
                return [...existing, data.data];
              });
            } else if (data.type === 'data') {
              setWorkflowData((prev) => ({ ...prev, ...data.data }));
            } else if (data.type === 'complete') {
              setDraftId(data.data.draftId);
            } else if (data.type === 'error') {
              throw new Error(data.data.message);
            }
          }
        }
      }
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

          {/* Real-time Steps */}
          {steps.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Steps</h2>
              <div className="space-y-3">
                {steps.map((step) => (
                  <div key={step.step} className={`p-4 rounded-lg border-2 ${step.status === 'completed' ? 'bg-green-50 border-green-300' : step.status === 'running' ? 'bg-yellow-50 border-yellow-300 animate-pulse' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      {step.status === 'completed' && <span className="text-green-600 text-2xl">✅</span>}
                      {step.status === 'running' && <span className="text-yellow-600 text-2xl animate-spin">⏳</span>}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{step.name}</p>
                        {step.status === 'completed' && <p className="text-sm text-gray-600">Completed</p>}
                        {step.status === 'running' && <p className="text-sm text-gray-600">In progress...</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow Data */}
          {workflowData.seeds.length > 0 && (
            <div className="mt-8 space-y-6">
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

              {workflowData.paaRows.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    📋 People Also Ask ({workflowData.paaRows.length})
                  </h3>
                  <div className="space-y-3">
                    {workflowData.paaRows.slice(0, 10).map((row: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <p className="font-medium text-gray-900">{row.question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
