import { fetchFactionData } from './src/utils/githubFetcher.js';

async function test() {
   const data = await fetchFactionData('Imperium - Space Wolves.json');
   const armyEnhancements = data.detachments.find(d => d.name === 'Army Enhancements');
   if (armyEnhancements) {
       console.log('Found army enhancements:', armyEnhancements.rules.map(r => r.name));
   } else {
       console.log('No army enhancements found');
   }
}

test().catch(console.error);
