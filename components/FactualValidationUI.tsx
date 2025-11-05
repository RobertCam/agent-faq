'use client';

import { TroubleshootingItem, FactualConfidence, TroubleshootingSource } from '@/lib/types';

interface FactualValidationUIProps {
  item: TroubleshootingItem;
  onVerify?: (item: TroubleshootingItem) => void;
  onMarkForReview?: (item: TroubleshootingItem) => void;
}

export default function FactualValidationUI({ 
  item, 
  onVerify, 
  onMarkForReview 
}: FactualValidationUIProps) {
  const getConfidenceColor = (confidence?: FactualConfidence) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'missing':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConfidenceIcon = (confidence?: FactualConfidence) => {
    switch (confidence) {
      case 'high':
        return '✅';
      case 'medium':
        return '⚠️';
      case 'low':
        return '⚠️';
      case 'missing':
        return '❌';
      default:
        return '❓';
    }
  };

  const getConfidenceDescription = (confidence?: FactualConfidence) => {
    switch (confidence) {
      case 'high':
        return 'Verifiable from sources';
      case 'medium':
        return 'Likely accurate but uncertain';
      case 'low':
        return 'Speculative - needs verification';
      case 'missing':
        return 'Cannot verify - needs manual review';
      default:
        return 'Unknown confidence level';
    }
  };

  const confidence = item.factualConfidence || 'missing';
  const hasSources = item.sources && item.sources.length > 0;

  return (
    <div className={`border-2 rounded-lg p-4 ${getConfidenceColor(confidence)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getConfidenceIcon(confidence)}</span>
          <div>
            <h4 className="font-semibold text-sm uppercase">
              Factual Confidence: {confidence}
            </h4>
            <p className="text-xs opacity-80 mt-1">
              {getConfidenceDescription(confidence)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {onVerify && (
            <button
              onClick={() => onVerify(item)}
              className="px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-100 rounded text-xs font-medium transition-colors"
              title="Mark as verified"
            >
              ✓ Verify
            </button>
          )}
          {onMarkForReview && confidence !== 'high' && (
            <button
              onClick={() => onMarkForReview(item)}
              className="px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-100 rounded text-xs font-medium transition-colors"
              title="Flag for manual review"
            >
              🔍 Review
            </button>
          )}
        </div>
      </div>

      {/* Sources Section */}
      {hasSources ? (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <h5 className="font-semibold text-sm mb-2">Sources ({item.sources!.length})</h5>
          <div className="space-y-2">
            {item.sources!.map((source: TroubleshootingSource, index: number) => (
              <div key={index} className="bg-white bg-opacity-30 rounded p-2 text-xs">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:text-blue-900 underline font-medium"
                  >
                    {source.title || source.url}
                  </a>
                ) : (
                  <span className="font-medium">{source.title || 'Source'}</span>
                )}
                {source.snippet && (
                  <p className="text-xs mt-1 opacity-90 line-clamp-2">
                    {source.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <p className="text-xs opacity-80">
            ⚠️ No sources available for verification
          </p>
        </div>
      )}

      {/* Warning for missing/low confidence */}
      {(confidence === 'missing' || confidence === 'low') && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="bg-white bg-opacity-50 rounded p-3">
            <p className="text-xs font-semibold mb-1">⚠️ Action Required</p>
            <p className="text-xs opacity-90">
              This solution cannot be verified from available sources. Consider adding manual content or reviewing the information.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

