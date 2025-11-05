'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Puck, Render, Data } from '@measured/puck';
import '@measured/puck/dist/index.css';
import { config } from '@/app/puck-config';
import { Draft, TroubleshootingItem, TroubleshootingComponentProps } from '@/lib/types';
import FactualValidationUI from '@/components/FactualValidationUI';
import ConversationalAIEditor from '@/components/ConversationalAIEditor';

export default function EditorPage() {
  const params = useParams();
  const draftId = params.draftId as string;
  
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [puckData, setPuckData] = useState<Data | null>(null);
  const [showAIEditor, setShowAIEditor] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        const response = await fetch(`/api/load-draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ draftId }),
        });

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load draft');
        }

        setDraft(data.draft);
        
        // Convert to PUCK data format based on content type
        if (data.draft.contentType === 'FAQ') {
          setPuckData({
            content: [
              {
                type: 'FaqComponent',
                props: data.draft.content,
              },
            ],
            root: { props: {}, title: 'FAQ Page' },
          });
        } else if (data.draft.contentType === 'COMPARISON') {
          setPuckData({
            content: [
              {
                type: 'ComparisonComponent',
                props: data.draft.content,
              },
            ],
            root: { props: {}, title: 'Comparison Page' },
          });
        } else if (data.draft.contentType === 'BLOG') {
          setPuckData({
            content: [
              {
                type: 'BlogComponent',
                props: data.draft.content,
              },
            ],
            root: { props: {}, title: 'Blog Article' },
          });
        } else if (data.draft.contentType === 'TROUBLESHOOTING') {
          setPuckData({
            content: [
              {
                type: 'TroubleshootingComponent',
                props: data.draft.content,
              },
            ],
            root: { props: {}, title: 'Troubleshooting Article' },
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (draftId) {
      loadDraft();
    }
  }, [draftId]);

  const handleApprove = async () => {
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftId }),
      });

      const data = await response.json();
      
      if (data.success) {
        setApproved(true);
        setIsEditing(false);
        console.log('Approved content:', draft?.content);
      } else {
        throw new Error(data.error || 'Failed to approve draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAddSolution = (issue: string) => {
    setSelectedIssue(issue);
    setShowAIEditor(true);
  };

  const handleSaveAIGeneratedItem = (item: TroubleshootingItem) => {
    if (!puckData || draft?.contentType !== 'TROUBLESHOOTING') return;

    const troubleshootingContent = puckData.content[0]?.props as TroubleshootingComponentProps;
    if (troubleshootingContent) {
      const updatedContent = {
        ...troubleshootingContent,
        items: [...troubleshootingContent.items, item],
      };

      setPuckData({
        ...puckData,
        content: [
          {
            ...puckData.content[0],
            props: updatedContent,
          },
        ],
      });
    }

    setShowAIEditor(false);
    setSelectedIssue(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading draft...</div>
      </div>
    );
  }

  if (error || !draft || !puckData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Error: {error || 'Draft not found'}</div>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-green-800 mb-4">✅ Approved!</h2>
          <p className="text-green-700 mb-6">
            The FAQ has been approved and logged to the console (simulated publish).
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Generate Another FAQ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Review & Edit {draft.contentType === 'FAQ' ? 'FAQ' : draft.contentType === 'COMPARISON' ? 'Comparison' : draft.contentType === 'BLOG' ? 'Blog Article' : 'Troubleshooting Article'}
              </h1>
              <p className="text-sm text-gray-600">
                Brand: {draft.brand} | Vertical: {draft.vertical} | Region: {draft.region}
              </p>
            </div>
            <div className="flex gap-3">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              )}
              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Preview
                </button>
              )}
              <button
                onClick={handleApprove}
                className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        {isEditing && puckData ? (
          <div className="max-w-7xl mx-auto">
            <Puck
              config={config}
              data={puckData}
              onChange={setPuckData}
              onPublish={() => {
                console.log('Publishing FAQ...');
              }}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6">
            {/* Preview Mode - Show as full webpage */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Hero Section */}
              <div className={`bg-gradient-to-r text-white p-12 text-center ${
                draft.contentType === 'TROUBLESHOOTING' ? 'from-purple-600 to-pink-600' :
                draft.contentType === 'COMPARISON' ? 'from-blue-600 to-cyan-600' :
                draft.contentType === 'BLOG' ? 'from-orange-600 to-red-600' :
                'from-blue-600 to-purple-600'
              }`}>
                <h1 className="text-4xl font-bold mb-4">
                  {draft.contentType === 'TROUBLESHOOTING' ? 'Troubleshooting Guide' :
                   draft.contentType === 'COMPARISON' ? 'Product Comparison' :
                   draft.contentType === 'BLOG' ? 'Blog Article' :
                   'Frequently Asked Questions'}
                </h1>
                <p className="text-xl text-blue-100">
                  {draft.contentType === 'TROUBLESHOOTING' ? `Resolving ${draft.brand} Issues` :
                   draft.contentType === 'COMPARISON' ? `Comparing ${draft.brand} Options` :
                   draft.contentType === 'BLOG' ? `About ${draft.brand}` :
                   `About ${draft.brand} in ${draft.region}`}
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                {draft.contentType === 'TROUBLESHOOTING' && puckData ? (
                  <div>
                    <Render config={config} data={puckData} />
                    
                    {/* Show factual validation UI for items with missing/low confidence */}
                    {(() => {
                      const troubleshootingContent = puckData.content[0]?.props as TroubleshootingComponentProps;
                      if (!troubleshootingContent) return null;
                      
                      const itemsNeedingReview = troubleshootingContent.items.filter(
                        item => item.factualConfidence === 'missing' || item.factualConfidence === 'low'
                      );
                      
                      if (itemsNeedingReview.length === 0) return null;
                      
                      return (
                        <div className="mt-8 border-t border-gray-200 pt-8">
                          <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Items Requiring Review
                          </h3>
                          <div className="space-y-4">
                            {itemsNeedingReview.map((item, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">{item.issue}</h4>
                                <FactualValidationUI
                                  item={item}
                                  onMarkForReview={() => {
                                    // Could implement review workflow here
                                    console.log('Marked for review:', item);
                                  }}
                                />
                                <button
                                  onClick={() => handleAddSolution(item.issue)}
                                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                  Add Solution with AI
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <Render config={config} data={puckData} />
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  For more information, contact {draft.brand} in {draft.region}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversational AI Editor Modal */}
      {showAIEditor && selectedIssue && draft && (
        <ConversationalAIEditor
          issue={selectedIssue}
          brand={draft.brand}
          vertical={draft.vertical}
          region={draft.region}
          onSave={handleSaveAIGeneratedItem}
          onClose={() => {
            setShowAIEditor(false);
            setSelectedIssue(null);
          }}
        />
      )}
    </div>
  );
}
