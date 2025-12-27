import { decode } from '@msgpack/msgpack';
import type { RawPaper, Paper, CCFVenue } from '@/types';

export async function decodePaperBin(data: ArrayBuffer): Promise<{
  papers: RawPaper[];
  filename?: string;
  stats?: Record<string, number>;
}> {
  const decoded = decode(new Uint8Array(data)) as RawPaper[] | { papers: RawPaper[]; filename?: string; stats?: Record<string, number> };
  
  // Handle both array format and object format
  if (Array.isArray(decoded)) {
    return { papers: decoded };
  }
  
  return {
    papers: decoded.papers || decoded as unknown as RawPaper[],
    filename: decoded.filename,
    stats: decoded.stats,
  };
}

export function augmentPapers(rawPapers: RawPaper[], ccfVenues: CCFVenue[]): Paper[] {
  return rawPapers.map(raw => {
    // Extract uppercase letters from publisher
    const pub = (raw.publisher || '').replace(/[^A-Z]/g, '');
    
    // Find matching CCF venue by key prefix
    const matchingVenue = ccfVenues.find(venue => 
      venue.crossref && raw.key && raw.key.startsWith(venue.crossref)
    );
    
    return {
      ...raw,
      pub,
      rank: matchingVenue?.rank?.trim() || undefined,
      category: matchingVenue?.category || undefined,
    };
  });
}

// Stopwords for keyword extraction
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'then', 'once', 'if', 'unless', 'until', 'while', 'about', 'after', 'before',
  'between', 'into', 'through', 'during', 'above', 'below', 'up', 'down', 'out',
  'off', 'over', 'under', 'again', 'further', 'any', 'based', 'using', 'via',
  'blockchain', // Excluded as per requirements
]);

export function extractKeywords(papers: Paper[], limit = 40): { word: string; count: number }[] {
  const wordCounts = new Map<string, number>();
  
  for (const paper of papers) {
    const words = paper.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
    
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
  
  return Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
