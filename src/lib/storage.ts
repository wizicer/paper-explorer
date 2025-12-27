import type { SearchState } from '@/types';

const SEARCH_KEY = 'SEARCH';

const DEFAULT_STATE: SearchState = {
  perPage: 20,
  filters: [],
};

export function loadSearchState(): SearchState {
  try {
    const stored = localStorage.getItem(SEARCH_KEY);
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_STATE;
}

export function saveSearchState(state: SearchState): void {
  try {
    localStorage.setItem(SEARCH_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}
