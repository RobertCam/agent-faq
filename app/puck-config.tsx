import { Config } from '@measured/puck';
import { FAQComponentProps } from '@/lib/types';
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
  },
};

export type Props = {
  FaqComponent: FAQComponentProps;
};

