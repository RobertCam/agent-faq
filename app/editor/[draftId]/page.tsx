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
                Review & Edit {draft.contentType === 'FAQ' ? 'FAQ' : draft.contentType === 'COMPARISON' ? 'Comparison' : 'Blog Article'}
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
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-12 text-center">
                <h1 className="text-4xl font-bold mb-4">
                  Frequently Asked Questions
                </h1>
                <p className="text-xl text-blue-100">
                  About {draft.brand} in {draft.region}
                </p>
              </div>

              {/* FAQ Content */}
              <div className="p-8">
                <Render config={config} data={puckData} />
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
    </div>
  );
}
