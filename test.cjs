const https = require('https');
const { JSDOM } = require('jsdom'); // Oh, jsdom is not installed.
// Let's just use regex to find sharedSelectionEntryGroups named "Enhancements"
https.get('https://raw.githubusercontent.com/BSData/wh40k-10e/main/Imperium%20-%20Space%20Marines.cat', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const idx = data.indexOf('name="Gladius Task Force Enhancements"');
    if (idx !== -1) {
       console.log(data.substring(idx, idx + 2000));
    } else {
       console.log('Group not found');
    }
  });
});
