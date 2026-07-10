export interface ParsedUnit {
  id: string;
  name: string;
  points: number;
  category: string;
  modelCount: number;
  rawText: string;
  isDivider?: boolean;
  isWarlord?: boolean;
}

export interface RosterMeta {
  armyName: string;
  totalPoints: number;
  detachments: string[];
}

export interface ParseResult {
  meta: RosterMeta;
  units: ParsedUnit[];
}

export function parseRoster(rosterText: string): ParseResult {
  const units: ParsedUnit[] = [];
  const meta: RosterMeta = { armyName: 'Unknown Army', totalPoints: 0, detachments: [] };
  
  const lines = rosterText.split('\n');
  
  let currentCategory = 'Unknown';
  let currentUnit: ParsedUnit | null = null;
  
  // Matches "Unit Name [100 pts]:" or "Unit Name [100 pts]"
  const unitRegex = /^(.+?)\s*\[(\d+)\s*pts\]:?/;
  const categoryRegex = /^##\s+(.+)\s+\[/;
  const modelCountRegex = /^•\s+(\d+)x\s+/;

  let isFirstLine = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('# ++') || trimmed.startsWith('Battle Size:') || trimmed.startsWith('Show/Hide Options:')) {
      continue;
    }
    
    // Check for detachment
    if (trimmed.startsWith('Detachment')) {
      // E.g. "Detachment [3 Detachment Points]: Saga of the Hunter..."
      const detMatch = trimmed.match(/Detachment[^:]*:\s*(.+)/);
      if (detMatch) {
        const parsedDets = detMatch[1].split(',').map(d => d.trim()).filter(Boolean);
        meta.detachments.push(...parsedDets);
      }
      continue;
    }
    
    // Check if it's a category header e.g. "## Epic Hero [385 pts]"
    const catMatch = trimmed.match(categoryRegex);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      currentUnit = {
        id: currentCategory + '-' + Math.random().toString(36).substr(2, 9),
        name: currentCategory,
        points: 0,
        category: currentCategory,
        modelCount: 0,
        rawText: trimmed,
        isDivider: true,
        isWarlord: false
      };
      units.push(currentUnit);
      continue;
    }

    // Check if it's a sub-item (model count bullet) BEFORE checking for unitRegex
    // Because a sub-item might have "[5 pts]" in it and trigger unitRegex!
    if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
      if (currentUnit) {
        const countMatch = trimmed.match(modelCountRegex);
        if (countMatch) {
          currentUnit.modelCount += parseInt(countMatch[1], 10);
        } else if (trimmed.startsWith('•')) {
          currentUnit.modelCount += 1;
        }
        currentUnit.rawText += '\n' + trimmed;
      }
      isFirstLine = false;
      continue;
    }

    const match = trimmed.match(unitRegex);
    if (match) {
      const name = match[1].trim();
      const points = parseInt(match[2], 10);
      
      // If it's the very first match and it contains many hyphens or matches the very first line, it's likely the title
      if (isFirstLine) {
        meta.armyName = name;
        meta.totalPoints = points;
        isFirstLine = false;
        continue;
      }
      isFirstLine = false;

      const KNOWN_CATEGORIES = [
        'epic hero', 'character', 'infantry', 'vehicle', 'monster', 'swarm', 'battleline', 
        'dedicated transport', 'allied units', 'fortification', 'titanic', 'legends', 
        'warlord', 'primarch', 'supreme commander', 'mounted', 'beast'
      ];
      
      const isDivider = KNOWN_CATEGORIES.includes(name.toLowerCase());
      if (isDivider) {
         currentCategory = name.trim();
      }

      // If it's a new unit, save the previous one if it exists
      currentUnit = {
        id: name + '-' + Math.random().toString(36).substr(2, 9), // Unique ID for DnD
        name: name.replace(/\[?Warlord\]?/i, '').trim(),
        points: parseInt(match[2], 10),
        category: currentCategory,
        modelCount: 0, // We will count this in the following lines
        rawText: trimmed,
        isDivider: isDivider,
        isWarlord: trimmed.toLowerCase().includes('warlord')
      };
      units.push(currentUnit);
      continue;
    }

    // If it didn't match anything above, it's a continuation line (e.g. Warlord line, rules line)
    if (currentUnit) {
      if (trimmed.toLowerCase().includes('warlord')) {
        currentUnit.isWarlord = true;
      }
      currentUnit.rawText += '\n' + trimmed;
    }
    
    isFirstLine = false;
  }
  
  // For units that didn't have any bullet points, default to 1 model (e.g. single characters)
  units.forEach(u => {
    if (u.modelCount === 0) u.modelCount = 1;
  });

  return { meta, units };
}
