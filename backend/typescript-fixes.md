// Quick TypeScript fix for BrowserAdapter
// Replace the problematic lines in services/instagram/index.ts

// Line ~299 in BrowserAdapter.connect():
// OLD: const playwright = require('playwright');
// NEW: 
// eslint-disable-next-line @typescript-eslint/no-var-requires
const playwright = require('playwright');

// Line ~303:
// OLD: headless: process.env.NODE_ENV === 'production',
// NEW:
headless: (process as any).env.NODE_ENV === 'production',

// Line ~424 in page.evaluate():
// OLD: clickable.click();
// NEW:
(clickable as any).click();

// Line ~562 in searchHashtag:
// OLD: }, topic);
// NEW:
}, topic as string);