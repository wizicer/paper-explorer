import type { Category, CCFVenue } from '@/types';

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export async function loadCategories(): Promise<Category[]> {
  const response = await fetch('/category.csv');
  const text = await response.text();
  const rows = parseCSV(text);
  
  // Skip header row
  return rows.slice(1)
    .filter(row => row[0] && row[0].trim())
    .map(row => ({
      id: parseInt(row[0], 10),
      icon: row[1] || '',
      title: row[2] || '',
      url: row[3] || '',
    }));
}

export async function loadCCFVenues(): Promise<CCFVenue[]> {
  const response = await fetch('/ccf2019.csv');
  const text = await response.text();
  const rows = parseCSV(text);
  
  // Skip header row
  return rows.slice(1)
    .filter(row => row[0] && row[0].trim())
    .map(row => {
      const url = row[4] || '';
      // Extract crossref from URL
      const match = url.match(/https?:\/\/dblp\.uni-trier\.de\/db\/((conf|journals)\/.*?)(\/|$)/);
      const crossref = match ? match[1] : '';
      
      return {
        id: parseInt(row[0], 10),
        title: row[1] || '',
        fulname: row[2] || '',
        publisher: row[3] || '',
        url,
        rank: row[5] || '',
        type: row[6] === 'Journal' ? 'Journal' : 'Meeting',
        category: parseInt(row[7], 10) || 0,
        crossref,
      };
    });
}
