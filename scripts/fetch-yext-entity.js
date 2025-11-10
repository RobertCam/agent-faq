/**
 * Standalone script to fetch a Yext entity and display its structure
 * Usage: node scripts/fetch-yext-entity.js <entityId>
 */

require('dotenv').config({ path: '.env.local' });

const YEXT_API_BASE = 'https://api.yextapis.com/v2';

function getCurrentVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function fetchEntity(entityId) {
  const apiKey = process.env.YEXT_API_KEY;
  const accountId = process.env.YEXT_ACCOUNT_ID;

  if (!apiKey) {
    throw new Error('YEXT_API_KEY environment variable is not set');
  }
  if (!accountId) {
    throw new Error('YEXT_ACCOUNT_ID environment variable is not set');
  }

  const version = getCurrentVersion();
  const url = `${YEXT_API_BASE}/accounts/${accountId}/entities/${entityId}?v=${version}&api_key=${apiKey}`;

  console.log(`Fetching entity ${entityId} from account ${accountId}...`);
  console.log(`URL: ${url.replace(apiKey, '***REDACTED***')}\n`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yext API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (data.meta.errors && data.meta.errors.length > 0) {
    throw new Error(`Yext API errors: ${data.meta.errors.map(e => e.message).join(', ')}`);
  }

  return data.response;
}

// Main execution
const entityId = process.argv[2] || '2011984706';

fetchEntity(entityId)
  .then(entity => {
    console.log('='.repeat(80));
    console.log('ENTITY STRUCTURE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(entity, null, 2));
    console.log('\n' + '='.repeat(80));
    console.log('KEY FIELDS:');
    console.log('='.repeat(80));
    console.log(`Entity Type: ${entity.meta?.entityType || 'N/A'}`);
    console.log(`Name: ${entity.name || 'N/A'}`);
    console.log(`ID: ${entity.meta?.id || 'N/A'}`);
    
    // Look for FAQ-related fields
    const faqFields = Object.keys(entity).filter(key => 
      key.toLowerCase().includes('faq') || 
      key.toLowerCase().includes('question') ||
      key.toLowerCase().includes('answer')
    );
    
    if (faqFields.length > 0) {
      console.log(`\nFAQ-related fields found: ${faqFields.join(', ')}`);
      faqFields.forEach(field => {
        console.log(`\n${field}:`);
        console.log(JSON.stringify(entity[field], null, 2));
      });
    } else {
      console.log('\nNo obvious FAQ fields found. All fields:');
      Object.keys(entity).forEach(key => {
        if (key !== 'meta') {
          const value = entity[key];
          if (Array.isArray(value)) {
            console.log(`  ${key}: [Array with ${value.length} items]`);
          } else if (typeof value === 'object' && value !== null) {
            console.log(`  ${key}: [Object]`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      });
    }
  })
  .catch(error => {
    console.error('Error fetching entity:', error.message);
    process.exit(1);
  });

