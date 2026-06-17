import { PAARow } from './types';

/**
 * Mock PAA (People Also Ask) data for testing
 * Reduces SerpAPI costs during development
 */
export const mockPAAData: Record<string, PAARow[]> = {
  // Generic coffee shop / cafe queries
  'coffee shop': [
    {
      question: 'What are the best coffee shops near me?',
      snippet: 'Discover top-rated coffee shops in your area with great ambiance and quality coffee.',
      title: 'Best Coffee Shops Near You',
      link: 'https://example.com/coffee-shops',
    },
    {
      question: 'What time do coffee shops open?',
      snippet: 'Most coffee shops open between 6:00 AM and 7:00 AM on weekdays, with slightly later hours on weekends.',
      title: 'Coffee Shop Hours',
      link: 'https://example.com/hours',
    },
    {
      question: 'Do coffee shops offer delivery?',
      snippet: 'Many coffee shops now offer delivery through third-party services like DoorDash and Uber Eats.',
      title: 'Coffee Shop Delivery Options',
      link: 'https://example.com/delivery',
    },
    {
      question: 'What types of coffee do coffee shops serve?',
      snippet: 'Coffee shops typically serve espresso, cappuccino, latte, americano, and various specialty drinks.',
      title: 'Coffee Shop Menu',
      link: 'https://example.com/menu',
    },
    {
      question: 'How much does coffee cost at coffee shops?',
      snippet: 'Coffee prices vary, but typically range from $3-6 for specialty drinks and $2-4 for regular coffee.',
      title: 'Coffee Shop Prices',
      link: 'https://example.com/prices',
    },
  ],
  
  // Generic restaurant queries
  'restaurant': [
    {
      question: 'What are the best restaurants in my area?',
      snippet: 'Find top-rated restaurants near you with excellent reviews and diverse cuisines.',
      title: 'Best Restaurants Near You',
      link: 'https://example.com/restaurants',
    },
    {
      question: 'Do restaurants take reservations?',
      snippet: 'Many restaurants accept reservations, especially for dinner service. Check their website or call ahead.',
      title: 'Restaurant Reservations',
      link: 'https://example.com/reservations',
    },
    {
      question: 'What are the restaurant hours?',
      snippet: 'Restaurant hours vary, but most are open for lunch (11 AM - 2 PM) and dinner (5 PM - 10 PM).',
      title: 'Restaurant Hours',
      link: 'https://example.com/hours',
    },
    {
      question: 'Do restaurants offer takeout?',
      snippet: 'Yes, most restaurants offer takeout and many also provide delivery through various platforms.',
      title: 'Restaurant Takeout Options',
      link: 'https://example.com/takeout',
    },
  ],
  
  // Generic minigolf queries
  'minigolf': [
    {
      question: 'What are the minigolf course hours?',
      snippet: 'Minigolf courses typically open at 10 AM and close around 9 PM, with extended hours on weekends.',
      title: 'Minigolf Hours',
      link: 'https://example.com/hours',
    },
    {
      question: 'How much does minigolf cost?',
      snippet: 'Minigolf prices typically range from $8-15 per person, with discounts for children and groups.',
      title: 'Minigolf Pricing',
      link: 'https://example.com/pricing',
    },
    {
      question: 'Do minigolf courses have food?',
      snippet: 'Many minigolf courses have snack bars or cafes offering drinks, snacks, and sometimes full meals.',
      title: 'Minigolf Food Options',
      link: 'https://example.com/food',
    },
    {
      question: 'Is minigolf suitable for kids?',
      snippet: 'Yes, minigolf is family-friendly and suitable for all ages, making it a great activity for kids.',
      title: 'Minigolf for Kids',
      link: 'https://example.com/kids',
    },
    {
      question: 'Do minigolf courses offer party packages?',
      snippet: 'Many minigolf courses offer birthday party packages and group event options with special rates.',
      title: 'Minigolf Party Packages',
      link: 'https://example.com/parties',
    },
  ],
};

/**
 * Get mock PAA data for a given seed query
 * Falls back to generic data if exact match not found
 */
export function getMockPAAData(seeds: string[]): PAARow[] {
  const allRows: PAARow[] = [];
  
  for (const seed of seeds) {
    const lowerSeed = seed.toLowerCase();
    
    // Try to find matching category
    let matched = false;
    for (const [category, rows] of Object.entries(mockPAAData)) {
      if (lowerSeed.includes(category)) {
        allRows.push(...rows);
        matched = true;
        break;
      }
    }
    
    // If no match, use generic coffee shop data as fallback
    if (!matched && allRows.length === 0) {
      allRows.push(...mockPAAData['coffee shop']);
    }
  }
  
  // Deduplicate by question
  const uniqueRows = new Map<string, PAARow>();
  for (const row of allRows) {
    if (!uniqueRows.has(row.question.toLowerCase())) {
      uniqueRows.set(row.question.toLowerCase(), row);
    }
  }
  
  return Array.from(uniqueRows.values());
}

/**
 * Mock entity data for testing
 */
export const mockEntityData: Record<string, any> = {
  'minigolf-vancouver': {
    id: 'minigolf-vancouver',
    name: 'Vancouver Mini Golf',
    meta: {
      entityType: 'location',
    },
    address: {
      line1: '123 Main Street',
      city: 'Vancouver',
      region: 'BC',
      postalCode: 'V6B 1A1',
    },
    localPhone: '(604) 555-1234',
    hours: {
      monday: { open: '10:00', close: '21:00' },
      tuesday: { open: '10:00', close: '21:00' },
      wednesday: { open: '10:00', close: '21:00' },
      thursday: { open: '10:00', close: '21:00' },
      friday: { open: '10:00', close: '22:00' },
      saturday: { open: '09:00', close: '22:00' },
      sunday: { open: '09:00', close: '21:00' },
    },
    amenities: ['Parking', 'Snack Bar', 'Party Room', 'Arcade Games'],
    services: ['Birthday Parties', 'Group Events', 'Corporate Events'],
    description: 'Family-friendly minigolf course in the heart of Vancouver with 18 challenging holes.',
    website: 'https://example.com/vancouver-minigolf',
  },
  
  'minigolf-montreal': {
    id: 'minigolf-montreal',
    name: 'Montreal Mini Golf',
    meta: {
      entityType: 'location',
    },
    address: {
      line1: '456 Rue Saint-Denis',
      city: 'Montreal',
      region: 'QC',
      postalCode: 'H2Y 1K4',
    },
    localPhone: '(514) 555-5678',
    hours: {
      monday: { open: '11:00', close: '20:00' },
      tuesday: { open: '11:00', close: '20:00' },
      wednesday: { open: '11:00', close: '20:00' },
      thursday: { open: '11:00', close: '20:00' },
      friday: { open: '11:00', close: '21:00' },
      saturday: { open: '10:00', close: '21:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    amenities: ['Parking', 'Cafe', 'Gift Shop'],
    services: ['Private Events', 'Team Building'],
    description: 'Premier minigolf destination in Montreal featuring themed courses and great food.',
    website: 'https://example.com/montreal-minigolf',
  },
};

/**
 * Get mock entity data by ID
 */
export function getMockEntityData(entityId: string): any {
  return mockEntityData[entityId] || null;
}

