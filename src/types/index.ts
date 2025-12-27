export interface Category {
  id: number;
  icon: string;
  title: string;
  url: string;
}

export interface CCFVenue {
  id: number;
  title: string;
  fulname: string;
  publisher: string;
  url: string;
  rank: string;
  type: string;
  category: number;
  crossref: string;
}

export interface RawPaper {
  type: string;
  title: string;
  doi: string;
  year: number;
  publisher: string;
  key: string;
  authors: string[];
  filename?: string;
  stats?: Record<string, number>;
}

export interface Paper extends RawPaper {
  pub: string;
  rank?: string;
  category?: number;
}

export interface PaperFile {
  id: string;
  name: string;
  data: ArrayBuffer;
  timestamp: number;
}

export interface SearchState {
  perPage: number;
  filters: { field: string; filter: string | number }[];
}

export type RankFilter = 'Any' | 'ABC' | 'A' | 'B' | 'C' | 'NotABC';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: keyof Paper | null;
  direction: SortDirection;
}
