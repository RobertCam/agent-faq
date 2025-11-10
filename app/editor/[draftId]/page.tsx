'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Puck, Render, Data } from '@measured/puck';
import '@measured/puck/dist/index.css';
import { config } from '@/app/puck-config';
import { Draft } from '@/lib/types';

export default function EditorPage() {
  const params = useParams();
  const draftId = params.draftId as string;
  
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [puckData, setPuckData] = useState<Data | null>(null);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [entityId, setEntityId] = useState<string>('');
  const getDefaultFieldId = (contentType?: string) => {
    switch (contentType) {
      case 'FAQ':
        return 'c_minigolfMadness_locations_faqSection';
      case 'COMPARISON':
        return 'c_minigolfMadnessProductComparison';
      case 'BLOG':
        return 'c_minigolfMandnessBlogs';
      default:
        return 'c_minigolfMadness_locations_faqSection';
    }
  };
  
  const [fieldId, setFieldId] = useState<string>('');
  const [yextApiKey, setYextApiKey] = useState<string>('');
  const [yextAccountId, setYextAccountId] = useState<string>('');
  const [approving, setApproving] = useState(false);

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
        
        // Pre-populate entityId if stored in draft
        if (data.draft.entityId) {
          setEntityId(data.draft.entityId);
        }
        
        // Set default field ID based on content type
        setFieldId(getDefaultFieldId(data.draft.contentType));
        
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
    // Show form for all content types that support Yext
    if (draft?.contentType && ['FAQ', 'COMPARISON', 'BLOG'].includes(draft.contentType)) {
      setShowApprovalForm(true);
      return;
    }
    
    // For unsupported content types, show error
    setError('This content type does not support Yext publishing');
  };

  const submitApproval = async () => {
    if (!draft?.contentType || !['FAQ', 'COMPARISON', 'BLOG'].includes(draft.contentType)) {
      setError('Content type does not support Yext publishing');
      return;
    }
    
    if (!entityId) {
      setError('Entity ID is required');
      return;
    }
    if (!yextApiKey) {
      setError('Yext API Key is required');
      return;
    }
    if (!yextAccountId) {
      setError('Yext Account ID is required');
      return;
    }

    setApproving(true);
    setError(null);

    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          draftId,
          entityId: entityId || draft?.entityId,
          fieldId: fieldId || getDefaultFieldId(draft?.contentType),
          yextApiKey,
          yextAccountId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setApproved(true);
        setIsEditing(false);
        setShowApprovalForm(false);
        // Clear credentials from state for security
        setYextApiKey('');
        setYextAccountId('');
        console.log('Approved content:', draft?.content);
      } else {
        throw new Error(data.error || 'Failed to approve draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setApproving(false);
    }
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
          <h2 className="text-2xl font-bold text-green-800 mb-4">✅ Published to Yext!</h2>
          <p className="text-green-700 mb-2">
            The {draft?.contentType || 'content'} has been successfully published to Yext Knowledge Graph.
          </p>
          {entityId && (
            <p className="text-sm text-green-600 mb-6">
              Entity: <strong>{entityId}</strong>
            </p>
          )}
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
                Review & Edit {draft.contentType === 'FAQ' ? 'FAQ' : draft.contentType === 'COMPARISON' ? 'Comparison' : 'Blog Article'}
              </h1>
              <p className="text-sm text-gray-600">
                {draft.brand && `Brand: ${draft.brand} | `}Vertical: {draft.vertical} | Region: {draft.region}
                {draft.entityId && ` | Entity ID: ${draft.entityId}`}
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
                disabled={approving}
                className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving ? 'Publishing...' : 'Approve & Publish to Yext'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Form Modal */}
      {showApprovalForm && draft?.contentType && ['FAQ', 'COMPARISON', 'BLOG'].includes(draft.contentType) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Publish to Yext Knowledge Graph
            </h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="yextApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Yext API Key <span className="text-red-500">*</span>
                </label>
                <input
                  id="yextApiKey"
                  type="password"
                  value={yextApiKey}
                  onChange={(e) => setYextApiKey(e.target.value)}
                  placeholder="Enter your Yext API key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your Yext API key for authentication
                </p>
              </div>

              <div>
                <label htmlFor="yextAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                  Yext Account ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="yextAccountId"
                  type="text"
                  value={yextAccountId}
                  onChange={(e) => setYextAccountId(e.target.value)}
                  placeholder="Enter your Yext account ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your Yext account ID
                </p>
              </div>

              <div>
                <label htmlFor="entityId" className="block text-sm font-medium text-gray-700 mb-2">
                  Entity ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="entityId"
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="e.g., minigolf-vancouver"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The Yext entity ID to update (e.g., "minigolf-vancouver")
                </p>
              </div>

              <div>
                <label htmlFor="fieldId" className="block text-sm font-medium text-gray-700 mb-2">
                  Field ID
                </label>
                <input
                  id="fieldId"
                  type="text"
                  value={fieldId || getDefaultFieldId(draft?.contentType)}
                  onChange={(e) => setFieldId(e.target.value)}
                  placeholder={getDefaultFieldId(draft?.contentType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The custom field ID where {draft?.contentType === 'FAQ' ? 'FAQs' : draft?.contentType === 'COMPARISON' ? 'product comparisons' : 'blogs'} are stored (default: {getDefaultFieldId(draft?.contentType)})
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalForm(false);
                  setError(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitApproval}
                disabled={approving || !entityId || !yextApiKey || !yextAccountId}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving ? 'Publishing...' : 'Publish to Yext'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 text-center">
                <h1 className="text-4xl font-bold mb-4">
                  Frequently Asked Questions
                </h1>
                <p className="text-xl text-blue-100">
                  {draft.brand ? `About ${draft.brand} in ${draft.region}` : `In ${draft.region}`}
                </p>
              </div>

              {/* FAQ Content */}
              <div className="p-8">
                <Render config={config} data={puckData} />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <p className="text-sm text-gray-600 text-center">
                  {draft.brand ? `For more information, contact ${draft.brand} in ${draft.region}` : `For more information in ${draft.region}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
