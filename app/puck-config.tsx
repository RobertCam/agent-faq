import { Config } from '@measured/puck';
import { FAQComponentProps, ComparisonComponentProps, BlogComponentProps, TroubleshootingComponentProps, FactualConfidence } from '@/lib/types';
import React from 'react';

export const config: Config = {
  components: {
    FaqComponent: {
      fields: {
        brand: {
          type: 'text',
          label: 'Brand',
        },
        region: {
          type: 'text',
          label: 'Region',
        },
        items: {
          type: 'array',
          label: 'FAQ Items',
          getItemSummary: (item: any) => item.question,
          arrayFields: {
            question: {
              type: 'text',
              label: 'Question',
            },
            answer: {
              type: 'textarea',
              label: 'Answer',
            },
          },
        },
      },
      defaultProps: {
        brand: '',
        region: '',
        items: [],
      },
      render: (props: FAQComponentProps) => {
        const { brand, region, items, schemaOrg } = props;
        return (
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-3xl font-bold mb-6">
              Frequently Asked Questions about {brand} in {region}
            </h2>
            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">
                    {item.question}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },
    ComparisonComponent: {
      fields: {
        brand: {
          type: 'text',
          label: 'Brand',
        },
        competitor: {
          type: 'text',
          label: 'Competitor',
        },
        category: {
          type: 'text',
          label: 'Category',
        },
        region: {
          type: 'text',
          label: 'Region',
        },
        items: {
          type: 'array',
          label: 'Comparison Items',
          getItemSummary: (item: any) => item.feature,
          arrayFields: {
            feature: {
              type: 'text',
              label: 'Feature',
            },
            brandValue: {
              type: 'text',
              label: 'Brand Value',
            },
            competitorValue: {
              type: 'text',
              label: 'Competitor Value',
            },
          },
        },
      },
      defaultProps: {
        brand: '',
        competitor: '',
        category: '',
        region: '',
        items: [],
      },
      render: (props: ComparisonComponentProps) => {
        const { brand, competitor, category, region, items } = props;
        return (
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-3xl font-bold mb-6">
              {brand} vs {competitor}
            </h2>
            <p className="text-gray-600 mb-8">
              Comparing {category} options in {region}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-left p-4 font-semibold">{brand}</th>
                    <th className="text-left p-4 font-semibold">{competitor}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-4 font-medium">{item.feature}</td>
                      <td className="p-4">{item.brandValue}</td>
                      <td className="p-4">{item.competitorValue || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      },
    },
    BlogComponent: {
      fields: {
        title: {
          type: 'text',
          label: 'Title',
        },
        brand: {
          type: 'text',
          label: 'Brand',
        },
        vertical: {
          type: 'text',
          label: 'Vertical',
        },
        region: {
          type: 'text',
          label: 'Region',
        },
        metaDescription: {
          type: 'textarea',
          label: 'Meta Description',
        },
        sections: {
          type: 'array',
          label: 'Sections',
          getItemSummary: (item: any) => item.heading,
          arrayFields: {
            heading: {
              type: 'text',
              label: 'Heading',
            },
            content: {
              type: 'textarea',
              label: 'Content',
            },
            order: {
              type: 'number',
              label: 'Order',
            },
          },
        },
      },
      defaultProps: {
        title: '',
        brand: '',
        vertical: '',
        region: '',
        metaDescription: '',
        sections: [],
      },
      render: (props: BlogComponentProps) => {
        const { title, brand, vertical, region, metaDescription, sections } = props;
        const sortedSections = [...sections].sort((a, b) => a.order - b.order);
        return (
          <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-4xl font-bold mb-4">{title}</h1>
            <p className="text-gray-600 mb-8">{metaDescription}</p>
            <div className="space-y-8">
              {sortedSections.map((section, index) => (
                <div key={index}>
                  <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },
    TroubleshootingComponent: {
      fields: {
        title: {
          type: 'text',
          label: 'Title',
        },
        brand: {
          type: 'text',
          label: 'Brand',
        },
        vertical: {
          type: 'text',
          label: 'Vertical',
        },
        region: {
          type: 'text',
          label: 'Region',
        },
        supportCategory: {
          type: 'text',
          label: 'Support Category',
        },
        parentCategory: {
          type: 'text',
          label: 'Parent Category (Optional)',
        },
        sitemapPriority: {
          type: 'number',
          label: 'Sitemap Priority (0.0 - 1.0)',
        },
        breadcrumbs: {
          type: 'array',
          label: 'Breadcrumbs',
          getItemSummary: (item: any) => item.label,
          arrayFields: {
            label: {
              type: 'text',
              label: 'Label',
            },
            url: {
              type: 'text',
              label: 'URL (Optional)',
            },
          },
        },
        items: {
          type: 'array',
          label: 'Troubleshooting Items',
          getItemSummary: (item: any) => `${item.issue} (${item.factualConfidence || 'missing'})`,
          arrayFields: {
            issue: {
              type: 'text',
              label: 'Issue',
            },
            solution: {
              type: 'textarea',
              label: 'Solution',
            },
            steps: {
              type: 'array',
              label: 'Steps (Optional)',
              getItemSummary: (step: string, index: number) => step || `Step ${index + 1}`,
              arrayFields: {
                step: {
                  type: 'text',
                  label: 'Step',
                },
              },
            },
            factualConfidence: {
              type: 'select',
              label: 'Factual Confidence',
              options: [
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
                { label: 'Missing', value: 'missing' },
              ],
            },
            sources: {
              type: 'array',
              label: 'Sources (Optional)',
              getItemSummary: (source: any) => source.url || 'Source',
              arrayFields: {
                url: {
                  type: 'text',
                  label: 'URL',
                },
                snippet: {
                  type: 'textarea',
                  label: 'Snippet',
                },
                title: {
                  type: 'text',
                  label: 'Title (Optional)',
                },
              },
            },
            userGenerated: {
              type: 'checkbox',
              label: 'User Generated',
            },
          },
        },
      },
      defaultProps: {
        title: '',
        brand: '',
        vertical: '',
        region: '',
        supportCategory: 'Technical Support',
        breadcrumbs: [],
        sitemapPriority: 0.7,
        items: [],
      },
      render: (props: TroubleshootingComponentProps) => {
        const { title, brand, region, supportCategory, breadcrumbs, items } = props;
        
        const getConfidenceBadge = (confidence?: FactualConfidence) => {
          const colors = {
            high: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-orange-100 text-orange-800',
            missing: 'bg-red-100 text-red-800',
          };
          return colors[confidence || 'missing'];
        };
        
        return (
          <div className="max-w-4xl mx-auto p-8">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <nav className="mb-6 text-sm text-gray-600">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && <span className="mx-2">/</span>}
                      {crumb.url ? (
                        <a href={crumb.url} className="hover:text-gray-900">
                          {crumb.label}
                        </a>
                      ) : (
                        <span>{crumb.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            
            {/* Title and Category */}
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-3">
                {supportCategory}
              </span>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
              {region && (
                <p className="text-gray-600">Troubleshooting {brand} issues in {region}</p>
              )}
            </div>
            
            {/* Troubleshooting Items */}
            <div className="space-y-8">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-2xl font-semibold text-gray-900 flex-1">
                      {item.issue}
                    </h2>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceBadge(item.factualConfidence)}`}>
                      {item.factualConfidence || 'missing'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed mb-4">{item.solution}</p>
                    
                    {item.steps && item.steps.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Steps to resolve:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                          {item.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="text-gray-700">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {item.sources && item.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Sources:</h4>
                        <ul className="space-y-2">
                          {item.sources.map((source, sourceIndex) => (
                            <li key={sourceIndex} className="text-sm">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {source.title || source.url}
                                </a>
                              ) : (
                                <span className="text-gray-600">{source.title || 'Source'}</span>
                              )}
                              {source.snippet && (
                                <p className="text-gray-500 text-xs mt-1 ml-4">{source.snippet}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {item.userGenerated && (
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      User Generated
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      },
    },
  },
};

export type Props = {
  FaqComponent: FAQComponentProps;
  ComparisonComponent: ComparisonComponentProps;
  BlogComponent: BlogComponentProps;
  TroubleshootingComponent: TroubleshootingComponentProps;
};

