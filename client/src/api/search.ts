import type { SearchResponse } from '../types';

export async function searchProducts(q: string, mode?: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q });
  if (mode) params.set('mode', mode);

  const res = await fetch(`/api/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
