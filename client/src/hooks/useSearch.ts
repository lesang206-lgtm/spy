import { useState, useCallback } from 'react';
import type { SearchResponse } from '../types';
import { searchProducts } from '../api/search';

export function useSearch() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await searchProducts(q);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, search };
}
