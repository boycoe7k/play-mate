import React from 'react';
import { CategoryData, MovieResult } from '../types';
import MovieCard from './MovieCard';
import Loader from './Loader';
import { getOptimizedImageUrl, DEFAULT_FAVICON_FALLBACK } from '../utils/image';

const tabs = [
  { id: 'trending', label: 'Trending' },
  { id: 'short', label: 'Short TV' },
  { id: 'series', label: 'TV/Series' },
  { id: 'movies', label: 'Movie' },
  { id: 'music', label: 'Music' },
  { id: 'anime', label: 'Anime' },
];

const cleanTitle = (title: string) => title.replace(/[🔥🎬]/gu, '').trim();

const BannerRail: React.FC<{ movies: MovieResult[]; onMovieClick: (m: MovieResult) => void }> = ({ movies, onMovieClick }) => {
  if (!movies.length) return null;
  return (
    <section className="px-5 mt-5">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
        {movies.slice(0, 8).map((movie, index) => {
          const image = movie.cover || movie.thumbnail;
          return (
            <button key={`${movie.subjectId || movie.title}-${index}`} onClick={() => onMovieClick(movie)} className="relative flex-none w-[86vw] max-w-[520px] aspect-[1.9/1] overflow-hidden rounded-2xl text-left snap-start bg-slate-900 border border-white/10 shadow-xl">
              <img src={getOptimizedImageUrl(image, 900)} onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_FAVICON_FALLBACK; }} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                <div className="min-w-0"><p className="text-[11px] uppercase tracking-[.18em] font-black text-white/75">Featured tonight</p><h2 className="mt-1 text-xl sm:text-2xl font-black text-white truncate">{movie.title}</h2></div>
                <span className="shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-2 text-xs font-black text-slate-950"><i className="fa-solid fa-download mr-1" /> Download</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const MovieRail: React.FC<{ title: string; movies: MovieResult[]; onMovieClick: (m: MovieResult) => void; onSeeMore: () => void; tone?: 'movie' | 'tv' | 'default' }> = ({ title, movies, onMovieClick, onSeeMore, tone = 'default' }) => {
  if (!movies.length) return null;
  const badge = tone === 'movie' ? 'bg-orange-400' : tone === 'tv' ? 'bg-sky-400' : 'bg-emerald-400';
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-[var(--pm-text)]"><span className={`${badge} rounded-md px-2 py-1 text-[10px] uppercase font-black text-slate-900`}>{tone === 'tv' ? 'TV Show' : 'Movie'}</span>{cleanTitle(title)}</h2>
        <button onClick={onSeeMore} className="text-sm font-bold text-[var(--pm-muted)]">See all <i className="fa-solid fa-chevron-right text-xs ml-1" /></button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
        {movies.slice(0, 12).map((movie, index) => <div key={`${movie.subjectId || movie.title}-${index}`} className="flex-none w-[142px] sm:w-[170px]"><MovieCard movie={movie} onClick={onMovieClick} /></div>)}
      </div>
    </section>
  );
};

const HomePage: React.FC<{ heroMovies: MovieResult[]; categoriesData: CategoryData[]; onMovieClick: (m: MovieResult) => void; onToplistClick: (category?: string) => void; loading: boolean; }> = ({ heroMovies, categoriesData, onMovieClick, onToplistClick, loading }) => {
  const [activeTab, setActiveTab] = React.useState('trending');
  const rows = React.useMemo(() => categoriesData.filter((category) => category.movies?.length > 0), [categoriesData]);
  const visibleRows = React.useMemo(() => {
    if (activeTab === 'trending') return rows;
    const match = activeTab === 'series' ? ['series', 'tv'] : activeTab === 'short' ? ['short'] : [activeTab];
    const filtered = rows.filter((row) => `${row.title} ${row.movies.map((m) => m.type).join(' ')}`.toLowerCase().includes(match[0]));
    return filtered.length ? filtered : rows;
  }, [activeTab, rows]);

  if (loading) return <div className="min-h-screen pt-24"><div className="px-5"><div className="h-12 w-2/3 bg-black/10 rounded-xl animate-pulse" /><div className="mt-5 aspect-[1.9/1] rounded-2xl bg-black/10 animate-pulse" /></div>{[1, 2, 3].map((i) => <div key={i} className="mt-8 px-5"><div className="h-6 w-48 bg-black/10 rounded animate-pulse mb-4" /><Loader type="circle" inline /></div>)}</div>;

  return (
    <div className="min-h-screen pb-28 bg-[var(--pm-bg)]">
      <header className="px-5 pt-20 sm:pt-24">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-2xl bg-[var(--pm-soft)] border border-[var(--pm-border)] px-4 py-3 text-[var(--pm-muted)]"><i className="fa-solid fa-sliders text-lg" /><span className="text-sm font-bold">Find your next movie</span></div>
          <button className="w-12 h-12 rounded-2xl bg-[var(--pm-soft)] border border-[var(--pm-border)] text-[var(--pm-text)]" aria-label="Search" onClick={() => window.dispatchEvent(new CustomEvent('movielab:open-search'))}><i className="fa-solid fa-magnifying-glass text-lg" /></button>
        </div>
        <nav className="mt-5 flex gap-7 overflow-x-auto scrollbar-hide" aria-label="Movie categories">
          {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative shrink-0 pb-3 text-base font-bold ${activeTab === tab.id ? 'text-[var(--pm-text)]' : 'text-[var(--pm-muted)]'}`}>{tab.label}{activeTab === tab.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-[var(--pm-accent)]" />}</button>)}
        </nav>
      </header>
      <BannerRail movies={heroMovies.length ? heroMovies : rows[0]?.movies || []} onMovieClick={onMovieClick} />
      {visibleRows.map((row, index) => <MovieRail key={`${activeTab}-${row.title}-${index}`} title={row.title} movies={row.movies} onMovieClick={onMovieClick} onSeeMore={() => onToplistClick(row.query || row.title)} tone={row.title.toLowerCase().includes('series') || row.title.toLowerCase().includes('tv') ? 'tv' : index === 0 ? 'movie' : 'default'} />)}
      {!visibleRows.length && <div className="mx-5 mt-10 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] p-8 text-center"><i className="fa-solid fa-film text-3xl text-[var(--pm-accent)]" /><h2 className="mt-4 font-black text-[var(--pm-text)]">Films are loading</h2><p className="mt-2 text-sm text-[var(--pm-muted)]">Try refreshing the page in a moment.</p></div>}
    </div>
  );
};

export default HomePage;
