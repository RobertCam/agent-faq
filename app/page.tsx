'use client';

import { useState } from 'react';

interface WorkflowData {
  seeds: string[];
  paaRows: any[];
  rankedQuestions: any[];
  faqComponent?: any;
  comparisonComponent?: any;
  blogComponent?: any;
}

interface Step {
  step: number;
  name: string;
  status: 'running' | 'completed';
  data?: any;
}

export default function Home() {
  const [brand, setBrand] = useState('');
  const [vertical, setVertical] = useState('Coffee / QSR');
  const [region, setRegion] = useState('Vancouver');
  const [contentType, setContentType] = useState<'FAQ' | 'COMPARISON' | 'BLOG'>('FAQ');
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
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [entityDrafts, setEntityDrafts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Yext integration state
  const [yextApiKey, setYextApiKey] = useState('');
  const [yextAccountId, setYextAccountId] = useState('');
  const [yextFieldId, setYextFieldId] = useState('c_minigolfMadness_locations_faqSection');
  const [genericContent, setGenericContent] = useState(false);
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [showEntitySelection, setShowEntitySelection] = useState(false);
  const [fetchingEntities, setFetchingEntities] = useState(false);

  const handleRun = async () => {
    if (!vertical) {
      setError('Please fill in vertical (region is optional if using generic content)');
      return;
    }

    if (!genericContent && !region) {
      setError('Please fill in region or enable generic content mode');
      return;
    }

    // Note: Entities will be fetched automatically during the workflow if credentials are provided

    setLoading(true);
    setError(null);
    setSteps([]);
    setDraftId(null);
    setWorkflowData({ seeds: [], paaRows: [], rankedQuestions: [], faqComponent: null, comparisonComponent: null, blogComponent: null });

    try {
      const response = await fetch('/api/run-demo-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...(brand && { brand }),
          vertical, 
          ...(region && !genericContent && { region }),
          contentType, 
          customInstructions,
          genericContent,
          ...(yextApiKey && yextAccountId && {
            yextApiKey,
            yextAccountId,
            yextFieldId,
            selectedEntityIds: selectedEntities.size > 0 ? Array.from(selectedEntities) : undefined,
          }),
        }),
      });

      if (!response.ok) throw new Error('Failed to start agent');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
        }
        
        if (done) {
          // Process remaining buffer when stream ends
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr) continue;
                  const data = JSON.parse(jsonStr);
                  // Process data (same logic as below)
                  if (data.type === 'step') {
                    setSteps((prev) => {
                      const existing = prev.filter((s) => s.step !== data.data.step);
                      return [...existing, data.data];
                    });
                  } else if (data.type === 'data') {
                    if (data.data.yextEntities) {
                      setEntities(data.data.yextEntities);
                      setShowEntitySelection(true);
                    }
                    if (data.data.autoSelectedEntities) {
                      setSelectedEntities(new Set(data.data.autoSelectedEntities));
                    }
                    setWorkflowData((prev) => ({ ...prev, ...data.data }));
                  } else if (data.type === 'complete') {
                    if (data.data.multiEntity) {
                      setDraftIds(data.data.draftIds || []);
                      setEntityDrafts(data.data.entityDrafts || []);
                    } else {
                      setDraftId(data.data.draftId);
                    }
                  } else if (data.type === 'error') {
                    throw new Error(data.data.message);
                  }
                } catch (parseError) {
                  console.error('[handleRun] JSON parse error in final buffer:', parseError);
                }
              }
            }
          }
          break;
        }
        
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue; // Skip empty lines
              
              const data = JSON.parse(jsonStr);

            if (data.type === 'step') {
              setSteps((prev) => {
                const existing = prev.filter((s) => s.step !== data.data.step);
                return [...existing, data.data];
              });
            } else if (data.type === 'data') {
              // Handle Yext entities from stream
              if (data.data.yextEntities) {
                setEntities(data.data.yextEntities);
                setShowEntitySelection(true);
              }
              // Handle auto-selected entities
              if (data.data.autoSelectedEntities) {
                setSelectedEntities(new Set(data.data.autoSelectedEntities));
              }
              setWorkflowData((prev) => ({ ...prev, ...data.data }));
            } else if (data.type === 'complete') {
              if (data.data.multiEntity) {
                setDraftIds(data.data.draftIds || []);
                setEntityDrafts(data.data.entityDrafts || []);
              } else {
                setDraftId(data.data.draftId);
              }
            } else if (data.type === 'error') {
              throw new Error(data.data.message);
            }
            } catch (parseError) {
              // Log JSON parse errors but don't break the entire workflow
              console.error('[handleRun] JSON parse error:', parseError);
              console.error('[handleRun] Problematic line:', line.substring(0, 200));
              // Continue processing other lines
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
                Brand Name <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Starbucks (leave empty for generic content)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to generate generic content for the category and region
              </p>
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
                Region <span className="text-gray-500 font-normal">(Optional if generic content)</span>
              </label>
              <input
                type="text"
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Vancouver"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || genericContent}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty if using generic content mode
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="genericContent"
                checked={genericContent}
                onChange={(e) => setGenericContent(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="genericContent" className="ml-2 block text-sm text-gray-700">
                Generate Generic Content (not region-specific)
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-2 mb-4">
              Generic content can be customized per entity and works across all locations
            </p>

            {/* Yext Integration Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yext Integration (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Connect to Yext to select entities and automatically publish content
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="yextApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                    Yext API Key
                  </label>
                  <input
                    type="password"
                    id="yextApiKey"
                    value={yextApiKey}
                    onChange={(e) => setYextApiKey(e.target.value)}
                    placeholder="Enter your Yext API key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="yextAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                    Yext Account ID
                  </label>
                  <input
                    type="text"
                    id="yextAccountId"
                    value={yextAccountId}
                    onChange={(e) => setYextAccountId(e.target.value)}
                    placeholder="Enter your Yext account ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="yextFieldId" className="block text-sm font-medium text-gray-700 mb-2">
                    FAQ Field ID
                  </label>
                  <input
                    type="text"
                    id="yextFieldId"
                    value={yextFieldId}
                    onChange={(e) => setYextFieldId(e.target.value)}
                    placeholder="c_minigolfMadness_locations_faqSection"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The custom field ID where FAQs are stored in your Yext entities
                  </p>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Entities will be automatically fetched when you start the workflow
                </p>
              </div>
            </div>

            {/* Entity Selection UI */}
            {showEntitySelection && entities.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Entities ({selectedEntities.size} of {entities.length} selected)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEntities.size === entities.length) {
                          setSelectedEntities(new Set());
                        } else {
                          setSelectedEntities(new Set(entities.map((e: any) => e.id || e.meta?.id)));
                        }
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {selectedEntities.size === entities.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-2">
                  {entities.map((entity: any) => {
                    const entityId = entity.id || entity.meta?.id;
                    const entityName = entity.name || 'Unnamed Entity';
                    const entityCity = entity.address?.city || entity.geomodifier || 'Unknown';
                    const entityRegion = entity.address?.region || '';
                    const isSelected = selectedEntities.has(entityId);
                    
                    return (
                      <label
                        key={entityId}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedEntities);
                            if (e.target.checked) {
                              newSelected.add(entityId);
                            } else {
                              newSelected.delete(entityId);
                            }
                            setSelectedEntities(newSelected);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">{entityName}</div>
                          <div className="text-sm text-gray-500">
                            {entityCity}{entityRegion ? `, ${entityRegion}` : ''}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                
                {selectedEntities.size > 0 && (
                  <p className="mt-3 text-sm text-gray-600">
                    {selectedEntities.size} entity{selectedEntities.size !== 1 ? 'ies' : ''} selected. 
                    Content will be customized for each entity.
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as 'FAQ' | 'COMPARISON' | 'BLOG')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="FAQ">FAQ</option>
                <option value="COMPARISON">Product Comparison</option>
                <option value="BLOG">Blog Article</option>
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

          {entityDrafts.length > 0 && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                ✅ Generated {entityDrafts.length} Customized Drafts
              </h3>
              <p className="text-blue-800 text-sm mb-4">
                Content has been customized for each selected entity. Review and approve individually or publish all at once.
              </p>
              
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {entityDrafts.map((entityDraft: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{entityDraft.entityName || entityDraft.entityId}</p>
                      <p className="text-xs text-gray-500">Entity ID: {entityDraft.entityId}</p>
                    </div>
                    <a
                      href={`/editor/${entityDraft.draftId}`}
                      className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Review →
                    </a>
                  </div>
                ))}
              </div>

              {yextApiKey && yextAccountId && (
                <div className="mt-4 pt-4 border-t border-blue-300">
                  <button
                    onClick={async (e) => {
                      if (!yextFieldId) {
                        alert('❌ Please enter a Field ID');
                        return;
                      }
                      
                      const button = e.currentTarget;
                      const originalText = button.textContent;
                      button.disabled = true;
                      button.textContent = 'Publishing...';
                      
                      try {
                        const response = await fetch('/api/bulk-approve', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            draftIds: entityDrafts.map((ed: any) => ed.draftId),
                            fieldId: yextFieldId,
                            yextApiKey,
                            yextAccountId,
                          }),
                        });

                        const data = await response.json();
                        
                        if (data.success) {
                          const { succeeded, failed } = data.summary;
                          if (failed === 0) {
                            alert(`✅ Successfully published ${succeeded} items to Yext!`);
                          } else {
                            const failedEntities = data.results
                              .filter((r: any) => !r.success)
                              .map((r: any) => `${r.entityName || r.entityId}: ${r.error}`)
                              .join('\n');
                            alert(`⚠️ Published ${succeeded} items. ${failed} failed:\n${failedEntities}`);
                          }
                        } else {
                          alert(`❌ Error: ${data.error}`);
                        }
                      } catch (err) {
                        alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                      } finally {
                        button.disabled = false;
                        if (originalText) button.textContent = originalText;
                      }
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Publish All to Yext ({entityDrafts.length} entities)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
