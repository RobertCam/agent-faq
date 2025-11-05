'use client';

import { useState, useEffect } from 'react';
import { expandTroubleshootingSeeds, fetchPAA, rankTroubleshootingIssues } from '@/lib/mcp-tools';
import { RankedIssue } from '@/lib/types';

export default function IssuesRankingPage() {
  const [brand, setBrand] = useState('Starbucks');
  const [vertical, setVertical] = useState('Coffee / QSR');
  const [region, setRegion] = useState('Vancouver');
  const [loading, setLoading] = useState(false);
  const [rankedIssues, setRankedIssues] = useState<RankedIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'issueType'>('score');

  const handleFetch = async () => {
    if (!brand || !vertical || !region) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setRankedIssues([]);

    try {
      // Step 1: Expand troubleshooting seeds
      const seedsResult = await expandTroubleshootingSeeds({ brand, vertical, region });
      
      // Step 2: Fetch PAA
      const paaResult = await fetchPAA({
        seeds: seedsResult.seeds,
        location: region,
        hl: 'en',
        troubleshootingMode: true,
      });
      
      // Step 3: Rank issues
      const rankedResult = await rankTroubleshootingIssues({
        brand,
        rows: paaResult.rows,
      });
      
      setRankedIssues(rankedResult.top);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = rankedIssues.filter(issue => {
    if (filterType === 'all') return true;
    return issue.issueType === filterType;
  });

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'score') {
      return b.score - a.score;
    } else {
      return (a.issueType || '').localeCompare(b.issueType || '');
    }
  });

  const issueTypes = Array.from(new Set(rankedIssues.map(issue => issue.issueType).filter(Boolean)));

  const exportToCSV = () => {
    const headers = ['Issue', 'Score', 'Issue Type', 'Reasoning', 'Snippet'];
    const rows = sortedIssues.map(issue => [
      issue.question,
      issue.score.toString(),
      issue.issueType || 'general',
      issue.reasoning,
      issue.snippet || '',
    ]);
    
    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `troubleshooting-issues-${brand}-${region}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                SERP Issues Ranking
              </h1>
              <p className="text-gray-600 mt-2">
                Discover and rank common troubleshooting issues from search results
              </p>
            </div>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm px-4 py-2 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              ← Back to Generator
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
            onClick={handleFetch}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Fetching and ranking issues...' : 'Fetch Issues from SERPs'}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {rankedIssues.length > 0 && (
          <div className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Ranked Issues ({sortedIssues.length})
                </h2>
                <p className="text-gray-600 mt-1">
                  Found {rankedIssues.length} issues from search results
                </p>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {issueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'issueType')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="score">Sort by Score</option>
                  <option value="issueType">Sort by Type</option>
                </select>

                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {sortedIssues.map((issue, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <h3 className="text-xl font-semibold text-gray-900">{issue.question}</h3>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          Score: {issue.score}
                        </span>
                        {issue.issueType && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {issue.issueType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {issue.snippet && (
                    <p className="text-gray-600 mt-3 mb-2">{issue.snippet}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      <strong>Reasoning:</strong> {issue.reasoning}
                    </p>
                    {issue.link && (
                      <a
                        href={issue.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                      >
                        View source →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sortedIssues.length === 0 && filterType !== 'all' && (
              <div className="text-center py-12 text-gray-500">
                No issues found for the selected filter. Try selecting "All Types".
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

