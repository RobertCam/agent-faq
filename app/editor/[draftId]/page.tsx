'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Render } from '@measured/puck';
import { config } from '@/app/puck-config.tsx';
import { Draft } from '@/lib/types';

export default function EditorPage() {
  const params = useParams();
  const draftId = params.draftId as string;
  
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

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
        console.log('Approved FAQ component:', draft?.faqComponent);
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

  if (error || !draft) {
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

  // Convert draft to PUCK data format
  const puckData = {
    content: [
      {
        type: 'FaqComponent',
        props: draft.faqComponent,
      },
    ],
    root: { props: {} },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Review FAQ Draft
              </h1>
              <p className="text-sm text-gray-600">
                Brand: {draft.brand} | Vertical: {draft.vertical} | Region: {draft.region}
              </p>
            </div>
            <button
              onClick={handleApprove}
              className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Approve FAQ
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        <Render config={config} data={puckData} />
      </div>
    </div>
  );
}

