// Test BrowserAdapter with existing Instagram session
// Run from backend directory: npx ts-node test-browser-adapter.ts

import { BrowserAdapter } from './src/services/instagram';

const EMAIL = 'rqyifln350@aplus.edu.pl';
const PASSWORD = 'FeedFlow2026!';

async function testBrowserAdapter() {
  console.log('=== Testing FeedFlow BrowserAdapter ===');
  console.log('This will launch a browser and test Instagram automation\n');

  const adapter = new BrowserAdapter();

  try {
    // 1. Connect
    console.log('[1/4] Connecting to Instagram via browser...');
    const session = await adapter.connect(EMAIL, PASSWORD);
    console.log('✓ Connected:', session);

    // 2. Get profile
    console.log('\n[2/4] Fetching profile snapshot...');
    const profile = await adapter.getProfileSnapshot();
    console.log('✓ Profile:', profile);

    // 3. Like posts
    console.log('\n[3/4] Liking posts for #technology...');
    const likeResults = await adapter.likeByTopic('technology', 2);
    likeResults.forEach(r => {
      console.log(`  ${r.success ? '✓' : '✗'} ${r.actionType} - ${r.success ? 'success' : r.error}`);
    });

    // 4. Follow users
    console.log('\n[4/4] Following users from #ai...');
    const followResults = await adapter.followByTopic('ai', 1);
    followResults.forEach(r => {
      console.log(`  ${r.success ? '✓' : '✗'} ${r.actionType} - ${r.success ? 'success' : r.error}`);
    });

    console.log('\n=== Test Complete ===');
    console.log('BrowserAdapter is working! Ready for FeedFlow hackathon demo.');

  } catch (error: any) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await adapter.disconnect();
    console.log('\nBrowser closed.');
  }
}

testBrowserAdapter().catch(console.error);
