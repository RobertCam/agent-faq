import {
  FAQComponentProps,
  ComparisonComponentProps,
  BlogComponentProps,
  ContentType,
} from './types';
import {
  customizeFAQForEntity,
  customizeComparisonForEntity,
  customizeBlogForEntity,
} from './mcp-tools';

export function renderContentForEntity(
  contentType: ContentType,
  content: any,
  entity: any
): FAQComponentProps | ComparisonComponentProps | BlogComponentProps {
  switch (contentType) {
    case 'FAQ':
      return customizeFAQForEntity(content as FAQComponentProps, entity);
    case 'COMPARISON':
      return customizeComparisonForEntity(content as ComparisonComponentProps, entity);
    case 'BLOG':
      return customizeBlogForEntity(content as BlogComponentProps, entity);
    default:
      return content;
  }
}
