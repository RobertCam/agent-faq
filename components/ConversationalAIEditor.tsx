'use client';

import { useState } from 'react';
import { TroubleshootingItem } from '@/lib/types';

interface ConversationalAIEditorProps {
  issue: string;
  brand: string;
  vertical?: string;
  region?: string;
  onSave: (item: TroubleshootingItem) => void;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ConversationalAIEditor({
  issue,
  brand,
  vertical,
  region,
  onSave,
  onClose,
}: ConversationalAIEditorProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `I'll help you create a troubleshooting solution for: "${issue}". What information would you like to include in the solution?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedSolution, setGeneratedSolution] = useState<{
    solution: string;
    steps: string[];
  } | null>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call OpenAI API to generate response
      const response = await fetch('/api/conversational-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            issue,
            brand,
            vertical,
            region,
          },
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);

      // Check if response contains a complete solution
      if (data.solution) {
        setGeneratedSolution({
          solution: data.solution,
          steps: data.steps || [],
        });
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (generatedSolution) {
      const item: TroubleshootingItem = {
        issue,
        solution: generatedSolution.solution,
        steps: generatedSolution.steps,
        factualConfidence: 'medium', // User-generated content starts as medium
        userGenerated: true,
      };
      onSave(item);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Solution with AI</h2>
              <p className="text-sm text-gray-600 mt-1">Issue: {issue}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generated Solution Preview */}
        {generatedSolution && (
          <div className="p-6 border-t border-gray-200 bg-green-50">
            <h3 className="font-semibold text-gray-900 mb-3">Generated Solution Preview:</h3>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-gray-700 mb-3">{generatedSolution.solution}</p>
              {generatedSolution.steps.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    {generatedSolution.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Save Solution
              </button>
              <button
                onClick={() => setGeneratedSolution(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        {!generatedSolution && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the solution or ask questions about how to fix this issue..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

