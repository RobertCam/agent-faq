import { Config } from '@measured/puck';
import { FAQComponentProps, ComparisonComponentProps, BlogComponentProps } from '@/lib/types';
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
  },
};

export type Props = {
  FaqComponent: FAQComponentProps;
  ComparisonComponent: ComparisonComponentProps;
  BlogComponent: BlogComponentProps;
};

