const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/BSData/wh40k-10e/main/Imperium%20-%20Space%20Wolves.json', (res) => {
   let data = '';
   res.on('data', chunk => data += chunk);
   res.on('end', () => {
     const json = JSON.parse(data);
     const sharedEntries = json.catalogue.sharedSelectionEntries || [];
     let enh = [];
     for(const se of sharedEntries) {
         if (se.profiles) {
             for (const p of se.profiles) {
                 if (p.typeName === 'Enhancement') {
                     enh.push(p.name);
                 }
             }
         }
     }
     console.log('Enhancements from sharedSelectionEntries (type Enhancement):', enh);
     
     // Also check sharedSelectionEntryGroups
     let enh2 = [];
     const groups = json.catalogue.sharedSelectionEntryGroups || [];
     for(const g of groups) {
         if (g.name === 'Enhancements' || g.name === 'Enhancement') {
             if (g.selectionEntries) {
                 for (const se of g.selectionEntries) {
                     if (se.profiles) {
                         for (const p of se.profiles) {
                             enh2.push(p.name);
                         }
                     }
                 }
             }
         }
     }
     console.log('Enhancements from groups:', enh2);
   });
});
