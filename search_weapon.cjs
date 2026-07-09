const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/BSData/wh40k-11e/main/Imperium%20-%20Space%20Wolves.cat', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/name="[^"]*Helfrost[^"]*"/ig);
    if(matches) {
       console.log(Array.from(new Set(matches)));
    }
  });
});
