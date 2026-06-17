import { ContentType } from './types';

export function getDefaultFieldId(contentType: ContentType): string {
  switch (contentType) {
    case 'FAQ':
      return 'c_minigolfMadness_locations_faqSection';
    case 'COMPARISON':
      return 'c_minigolfMadnessProductComparison';
    case 'BLOG':
      return 'c_minigolfMandnessBlogs';
    default:
      return 'c_minigolfMadness_locations_faqSection';
  }
}

export function getFieldIdLabel(contentType: ContentType): string {
  switch (contentType) {
    case 'FAQ':
      return 'FAQ Field ID';
    case 'COMPARISON':
      return 'Comparison Field ID';
    case 'BLOG':
      return 'Blog Field ID';
    default:
      return 'Field ID';
  }
}
