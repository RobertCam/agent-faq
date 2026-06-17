'use client';

import { ContentType } from '@/lib/types';
import { WorkflowData } from '@/lib/session-cache';

interface WorkflowDetailsProps {
  workflowData: WorkflowData;
  contentType?: ContentType;
  compact?: boolean;
}

export function WorkflowDetails({ workflowData, contentType, compact }: WorkflowDetailsProps) {
  const hasData =
    workflowData.seeds.length > 0 ||
    workflowData.paaRows.length > 0 ||
    workflowData.rankedQuestions.length > 0;

  if (!hasData) return null;

  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      {workflowData.seeds.length > 0 && (
        <section className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-gray-900 mb-2">
            Seed queries ({workflowData.seeds.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {workflowData.seeds.slice(0, compact ? 10 : 20).map((seed, i) => (
              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                {seed}
              </span>
            ))}
            {workflowData.seeds.length > (compact ? 10 : 20) && (
              <span className="text-xs text-gray-500">
                +{workflowData.seeds.length - (compact ? 10 : 20)} more
              </span>
            )}
          </div>
        </section>
      )}

      {workflowData.paaRows.length > 0 && (
        <section className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-gray-900 mb-2">
            People Also Ask ({workflowData.paaRows.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {workflowData.paaRows.slice(0, compact ? 8 : 15).map((row: any, i: number) => (
              <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                <p className="font-medium text-gray-900">{row.question}</p>
                {row.snippet && <p className="text-xs text-gray-500 mt-1">{row.snippet}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {workflowData.rankedQuestions.length > 0 && (
        <section className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-gray-900 mb-2">
            Top ranked questions ({workflowData.rankedQuestions.length})
          </h3>
          <div className="space-y-2">
            {workflowData.rankedQuestions.map((q: any, i: number) => (
              <div key={i} className="p-2 bg-yellow-50 rounded text-sm">
                <p className="font-medium text-gray-900">{q.question}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Score: {q.score} · {q.reasoning}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {workflowData.faqComponent && (
        <GeneratedContentPreview
          title={`Generated FAQ (${workflowData.faqComponent.items?.length || 0} items)`}
          contentType="FAQ"
          data={workflowData.faqComponent}
        />
      )}
      {workflowData.comparisonComponent && (
        <GeneratedContentPreview
          title="Generated comparison"
          contentType="COMPARISON"
          data={workflowData.comparisonComponent}
        />
      )}
      {workflowData.blogComponent && (
        <GeneratedContentPreview
          title="Generated blog"
          contentType="BLOG"
          data={workflowData.blogComponent}
        />
      )}
    </div>
  );
}

function GeneratedContentPreview({
  title,
  contentType,
  data,
}: {
  title: string;
  contentType: ContentType;
  data: any;
}) {
  return (
    <section className="border border-green-200 rounded-lg p-4 bg-green-50">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {contentType === 'FAQ' &&
        data.items?.slice(0, 3).map((item: any, i: number) => (
          <div key={i} className="bg-white p-3 rounded mb-2 text-sm">
            <p className="font-medium">{item.question}</p>
            <p className="text-gray-600 mt-1">{item.answer}</p>
          </div>
        ))}
      {contentType === 'FAQ' && data.items?.length > 3 && (
        <p className="text-xs text-gray-500">+{data.items.length - 3} more items in template</p>
      )}
    </section>
  );
}
