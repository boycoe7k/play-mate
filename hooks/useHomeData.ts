import { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api';
import { CategoryData, MovieResult } from '../types';
interface HomeData {
  categories: CategoryData[];
  hero: MovieResult[];
}
export const useHomeData = () => {
  const [data, setData] = useState<HomeData>({ categories: [], hero: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    const loadHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        let result = await ApiService.getHomeData();
        const movieCount = (result.categories || []).reduce((total, category) => total + (category.movies?.length || 0), 0);
        if (movieCount === 0 && (result.hero || []).length === 0) {
          const fallback = await ApiService.getRankingList('trending', 1, 18);
          if (fallback.results?.length) {
            result = {
              hero: fallback.results.slice(0, 6),
              categories: [{ title: 'Trending Movies', query: 'trending', movies: fallback.results }]
            };
          }
        }
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error('Home data loading failed:', err);
          setError('Failed to load home data');
          setLoading(false);
        }
      }
    };
    loadHomeData();
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return { data, loading, error };
};
