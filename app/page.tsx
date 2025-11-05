'use client';

import { useState } from 'react';

interface WorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedQuestions?: any[];
  rankedIssues?: any[];
  faqComponent?: any;
  comparisonComponent?: any;
  blogComponent?: any;
  troubleshootingComponent?: any;
}

interface Step {
  step: number;
  name: string;
  status: 'running' | 'completed';
  data?: any;
}

// Helper functions for export
function generateTroubleshootingHTML(component: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .confidence { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 10px; }
    .high { background: #dcfce7; color: #166534; }
    .medium { background: #fef3c7; color: #92400e; }
    .low { background: #fed7aa; color: #9a3412; }
    .missing { background: #fee2e2; color: #991b1b; }
    .item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .steps { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 10px 0; }
    .sources { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
    .sources a { color: #2563eb; text-decoration: none; }
    .sources a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${component.title}</h1>
  <p><strong>Category:</strong> ${component.supportCategory}</p>
  <p><strong>Brand:</strong> ${component.brand}${component.region ? ` | Region: ${component.region}` : ''}</p>
  
  ${component.items.map((item: any, index: number) => `
    <div class="item">
      <h2>${index + 1}. ${item.issue} <span class="confidence ${item.factualConfidence || 'missing'}">${item.factualConfidence || 'missing'}</span></h2>
      <p>${item.solution}</p>
      ${item.steps && item.steps.length > 0 ? `
        <div class="steps">
          <strong>Steps to resolve:</strong>
          <ol>
            ${item.steps.map((step: string) => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      ` : ''}
      ${item.sources && item.sources.length > 0 ? `
        <div class="sources">
          <strong>Sources:</strong>
          <ul>
            ${item.sources.map((source: any) => `
              <li>
                ${source.url ? `<a href="${source.url}" target="_blank">${source.title || source.url}</a>` : source.title || 'Source'}
                ${source.snippet ? `<br><small>${source.snippet}</small>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`;
}

function generateTroubleshootingText(component: any): string {
  let text = `${component.title}\n`;
  text += `Category: ${component.supportCategory}\n`;
  text += `Brand: ${component.brand}${component.region ? ` | Region: ${component.region}` : ''}\n\n`;
  
  component.items.forEach((item: any, index: number) => {
    text += `${index + 1}. ${item.issue} [${item.factualConfidence || 'missing'}]\n`;
    text += `${item.solution}\n`;
    if (item.steps && item.steps.length > 0) {
      text += `Steps:\n`;
      item.steps.forEach((step: string, stepIndex: number) => {
        text += `  ${stepIndex + 1}. ${step}\n`;
      });
    }
    if (item.sources && item.sources.length > 0) {
      text += `Sources:\n`;
      item.sources.forEach((source: any) => {
        text += `  - ${source.url || source.title || 'Source'}\n`;
        if (source.snippet) text += `    ${source.snippet}\n`;
      });
    }
    text += `\n`;
  });
  
  return text;
}

function generateIssuesRankingHTML(issues: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ranked Issues from SERPs</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
    .issue { border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 20px 0; background: #fff7ed; }
    .rank { font-size: 24px; font-weight: bold; color: #f97316; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin: 0 5px; }
    .score { background: #fef3c7; color: #92400e; }
    .type { background: #dbeafe; color: #1e40af; }
    .snippet { color: #666; margin: 10px 0; }
    .reasoning { color: #888; font-size: 12px; margin-top: 10px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Ranked Issues from SERPs (${issues.length})</h1>
  
  ${issues.map((issue: any, index: number) => `
    <div class="issue">
      <div class="rank">#${index + 1}</div>
      <h2>${issue.question}</h2>
      ${issue.snippet ? `<p class="snippet">${issue.snippet}</p>` : ''}
      <div>
        <span class="badge score">Score: ${issue.score}</span>
        ${issue.issueType ? `<span class="badge type">${issue.issueType}</span>` : ''}
      </div>
      <p class="reasoning">Reasoning: ${issue.reasoning}</p>
      ${issue.link ? `<a href="${issue.link}" target="_blank">View source →</a>` : ''}
    </div>
  `).join('')}
</body>
</html>`;
}

function generateIssuesRankingText(issues: any[]): string {
  let text = `Ranked Issues from SERPs (${issues.length})\n\n`;
  
  issues.forEach((issue: any, index: number) => {
    text += `#${index + 1} - ${issue.question}\n`;
    text += `Score: ${issue.score}${issue.issueType ? ` | Type: ${issue.issueType}` : ''}\n`;
    if (issue.snippet) text += `${issue.snippet}\n`;
    text += `Reasoning: ${issue.reasoning}\n`;
    if (issue.link) text += `Source: ${issue.link}\n`;
    text += `\n`;
  });
  
  return text;
}

function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [brand, setBrand] = useState('Starbucks');
  const [vertical, setVertical] = useState('Coffee / QSR');
  const [region, setRegion] = useState('Vancouver');
  const [contentType, setContentType] = useState<'FAQ' | 'COMPARISON' | 'BLOG' | 'TROUBLESHOOTING'>('FAQ');
  const [customInstructions, setCustomInstructions] = useState('');
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
    setWorkflowData({ seeds: [], paaRows: [], rankedQuestions: [], rankedIssues: [], faqComponent: null, comparisonComponent: null, blogComponent: null, troubleshootingComponent: null });

    try {
      const response = await fetch('/api/run-demo-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brand, vertical, region, contentType, customInstructions }),
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI-Driven Content Generator
              </h1>
              <p className="text-gray-600 mt-2">
                Generate FAQs, comparisons, and blog articles using AI agent orchestration with MCP tools.
              </p>
            </div>
            <a
              href="/docs"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm px-4 py-2 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Documentation →
            </a>
          </div>

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

            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as 'FAQ' | 'COMPARISON' | 'BLOG' | 'TROUBLESHOOTING')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="FAQ">FAQ</option>
                <option value="COMPARISON">Product Comparison</option>
                <option value="BLOG">Blog Article</option>
                <option value="TROUBLESHOOTING">Troubleshooting Article</option>
              </select>
            </div>

            <div>
              <label htmlFor="customInstructions" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Instructions (Optional)
              </label>
              <textarea
                id="customInstructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Focus on vegan options, Emphasize sustainability, Include menu prices"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Add extra instructions to guide the AI generation (tone, specific topics, formatting, etc.)
              </p>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating content...' : 'Run 7-day fetch now'}
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

              {(workflowData.rankedQuestions && workflowData.rankedQuestions.length > 0) && (
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

              {(workflowData.rankedIssues && workflowData.rankedIssues.length > 0) && (
                <div className="border border-orange-300 rounded-lg p-6 bg-orange-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      🔧 Ranked Issues from SERPs ({workflowData.rankedIssues.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const html = generateIssuesRankingHTML(workflowData.rankedIssues);
                          downloadHTML(html, `${brand}-issues-ranking-${Date.now()}.html`);
                        }}
                        className="text-orange-600 hover:text-orange-800 font-medium text-sm px-4 py-2 border border-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        Export HTML
                      </button>
                      <button
                        onClick={() => {
                          const text = generateIssuesRankingText(workflowData.rankedIssues);
                          navigator.clipboard.writeText(text);
                          alert('Copied to clipboard!');
                        }}
                        className="text-orange-600 hover:text-orange-800 font-medium text-sm px-4 py-2 border border-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {workflowData.rankedIssues.map((issue: any, index: number) => (
                      <div key={index} className="p-4 bg-white rounded-lg border border-orange-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-orange-600">#{index + 1}</span>
                              <p className="font-semibold text-gray-900">{issue.question}</p>
                            </div>
                            {issue.snippet && (
                              <p className="text-sm text-gray-600 mt-2 mb-2">{issue.snippet}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                Score: {issue.score}
                              </span>
                              {issue.issueType && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {issue.issueType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Reasoning: {issue.reasoning}</p>
                            {issue.link && (
                              <a
                                href={issue.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                              >
                                View source →
                              </a>
                            )}
                          </div>
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

              {workflowData.comparisonComponent && (
                <div className="border border-blue-300 rounded-lg p-6 bg-blue-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ✅ Generated Product Comparison
                  </h3>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {workflowData.comparisonComponent.brand} vs {workflowData.comparisonComponent.competitor}
                    </h4>
                    <div className="space-y-3">
                      {workflowData.comparisonComponent.items.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
                          <div className="font-medium text-gray-900">{item.feature}</div>
                          <div className="text-gray-700">{item.brandValue}</div>
                          <div className="text-gray-600">{item.competitorValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {workflowData.blogComponent && (
                <div className="border border-orange-300 rounded-lg p-6 bg-orange-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ✅ Generated Blog Article
                  </h3>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{workflowData.blogComponent.title}</h4>
                    <p className="text-sm text-gray-600 mb-4">{workflowData.blogComponent.metaDescription}</p>
                    <div className="space-y-4">
                      {workflowData.blogComponent.sections.map((section: any, index: number) => (
                        <div key={index}>
                          <h5 className="font-semibold text-gray-900 mb-2">{section.heading}</h5>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {workflowData.troubleshootingComponent && (
                <div className="border border-purple-300 rounded-lg p-6 bg-purple-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      ✅ Generated Troubleshooting Article ({workflowData.troubleshootingComponent.items.length} items)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const html = generateTroubleshootingHTML(workflowData.troubleshootingComponent);
                          downloadHTML(html, `${brand}-troubleshooting-${Date.now()}.html`);
                        }}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm px-4 py-2 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        Export HTML
                      </button>
                      <button
                        onClick={() => {
                          const text = generateTroubleshootingText(workflowData.troubleshootingComponent);
                          navigator.clipboard.writeText(text);
                          alert('Copied to clipboard!');
                        }}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm px-4 py-2 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{workflowData.troubleshootingComponent.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Category: {workflowData.troubleshootingComponent.supportCategory}
                    </p>
                    <div className="space-y-4 mt-4">
                      {workflowData.troubleshootingComponent.items.map((item: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 flex-1">{item.issue}</h5>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.factualConfidence === 'high' ? 'bg-green-100 text-green-800' :
                              item.factualConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              item.factualConfidence === 'low' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.factualConfidence || 'missing'}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{item.solution}</p>
                          {item.steps && item.steps.length > 0 && (
                            <div className="text-xs text-gray-600 mt-2">
                              <strong>Steps:</strong> {item.steps.length} step(s)
                            </div>
                          )}
                          {item.sources && item.sources.length > 0 && (
                            <div className="text-xs text-gray-600 mt-2">
                              <strong>Sources:</strong> {item.sources.length} source(s)
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {draftId && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm mb-3">
                ✅ Content generated successfully!
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
