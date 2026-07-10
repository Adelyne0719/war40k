import fs from 'fs';
import https from 'https';

const API_KEY = process.argv[2];
if (!API_KEY) {
  console.error('Usage: node scripts/classify_rules.js <OPENAI_API_KEY>');
  process.exit(1);
}

const FACTION_URLS = [
  'https://raw.githubusercontent.com/BSData/wh40k-11e/main/Imperium%20-%20Space%20Wolves.json',
  'https://raw.githubusercontent.com/BSData/wh40k-11e/main/Imperium%20-%20Space%20Marines.json'
];

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function extractAbilities(data) {
  const abilities = new Map();

  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.typeName === 'Abilities' || obj.typeName === 'Ability' || obj.typeName === 'Enhancement') {
       if (obj.characteristics) {
         const descChar = obj.characteristics.find(c => c.name === 'Description');
         if (descChar && descChar.$text) {
            abilities.set(obj.name, descChar.$text);
         }
       }
    }
    
    if (Array.isArray(obj)) {
       obj.forEach(traverse);
    } else {
       Object.values(obj).forEach(traverse);
    }
  }

  traverse(data);
  return abilities;
}

async function classifyWithAI(batch) {
  const prompt = `You are a Warhammer 40k 10th/11e rules expert. 
Classify the following abilities into one of these categories:
- "my": Only active or primarily used during the PLAYER'S own turn (e.g., shooting, charging, movement).
- "opp": Only active or primarily used during the OPPONENT'S turn (e.g., defensive buffs, "when targeted by an attack", "fight on death", "heroic intervention", "feel no pain").
- "both": Active during BOTH turns (e.g., aura buffs, permanent stat changes, generic fight phase buffs that don't specify whose turn).
- "ignore": Setup abilities, deep strike, leader, keywords that don't need to be on a phase checklist.

Input (JSON):
${JSON.stringify(batch)}

Output MUST be a valid JSON object where keys are ability names and values are the category ("my", "opp", "both", "ignore"). Do not include markdown formatting or any other text.`;

  const data = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant that only outputs valid raw JSON objects without markdown." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const respJson = JSON.parse(body);
          if (respJson.error) {
              reject(respJson.error.message);
              return;
          }
          const content = respJson.choices[0].message.content.trim();
          const cleanContent = content.replace(/^```json/, '').replace(/```$/, '');
          resolve(JSON.parse(cleanContent));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Fetching faction data...');
  const allAbilities = new Map();
  
  for (const url of FACTION_URLS) {
    try {
      console.log(`Fetching ${url}...`);
      const data = await fetchJson(url);
      const abilities = extractAbilities(data);
      for (const [k, v] of abilities.entries()) {
        allAbilities.set(k, v);
      }
    } catch (e) {
      console.error(`Failed to fetch ${url}:`, e);
    }
  }

  console.log(`Found ${allAbilities.size} unique abilities. Starting AI classification...`);

  const abilityEntries = Array.from(allAbilities.entries());
  const batchSize = 20;
  let finalClassifications = {};

  for (let i = 0; i < abilityEntries.length; i += batchSize) {
    const batchArr = abilityEntries.slice(i, i + batchSize);
    const batchObj = Object.fromEntries(batchArr);
    
    console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(abilityEntries.length / batchSize)}...`);
    try {
       const result = await classifyWithAI(batchObj);
       finalClassifications = { ...finalClassifications, ...result };
    } catch (e) {
       console.error('Batch failed:', e);
    }
  }

  const outputPath = './public/ai_classification.json';
  fs.writeFileSync(outputPath, JSON.stringify(finalClassifications, null, 2), 'utf8');
  console.log(`Saved classifications to ${outputPath}`);
}

main();
