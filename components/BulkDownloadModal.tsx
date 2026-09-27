import React, { useEffect, useMemo, useState } from 'react';
import { useMovieDetails } from '../hooks/useMovieDetails';
import { Episode, MovieResult } from '../types';

interface BulkDownloadModalProps {
  movieId: string;
  seasonNumber?: number;
  seasons?: number[];
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (urls: string[]) => void;
}

const QUALITY_OPTIONS = ['360P', '480P', '720P', '1080P'];

const BulkDownloadModal: React.FC<BulkDownloadModalProps> = ({
  movieId,
  seasonNumber,
  seasons = [],
  isOpen,
  onClose,
  onDownload
}) => {
  const dummyMovie: MovieResult = {
    subjectId: movieId,
    detailPath: movieId,
    title: '',
    cover: '',
    thumbnail: '',
    type: 'Series'
  };
  const { movie, loading } = useMovieDetails(dummyMovie);
  const availableSeasons = useMemo(() => {
    const fromMovie = movie?.seasons?.map(season => season.seasonNumber) || [];
    return Array.from(new Set([...seasons, ...fromMovie, seasonNumber].filter((value): value is number => typeof value === 'number'))).sort((a, b) => a - b);
  }, [movie?.seasons, seasonNumber, seasons]);
  const [activeSeason, setActiveSeason] = useState(seasonNumber || availableSeasons[0] || 1);
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState('720P');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  useEffect(() => {
    if (!isOpen) return;
    setActiveSeason(seasonNumber || availableSeasons[0] || 1);
    setSelectedEpisodes([]);
    setSelectedQuality('720P');
    setIsProcessing(false);
  }, [availableSeasons, isOpen, seasonNumber]);

  const seasonData = movie?.seasons?.find(season => season.seasonNumber === activeSeason);
  const episodes: Episode[] = seasonData?.episodes || Array.from(
    { length: seasonData?.episodeCount || (activeSeason === seasonNumber ? 0 : 0) },
    (_, index) => ({ episodeNumber: index + 1 })
  );
  const episodeNumbers = episodes.map((episode, index) => episode.episodeNumber || index + 1);
  const allSelected = episodeNumbers.length > 0 && selectedEpisodes.length === episodeNumbers.length;

  useEffect(() => {
    setSelectedEpisodes(previous => previous.filter(episode => episodeNumbers.includes(episode)));
  }, [activeSeason, episodeNumbers.join(',')]);

  const toggleEpisode = (episodeNumber: number) => {
    setSelectedEpisodes(previous => previous.includes(episodeNumber)
      ? previous.filter(episode => episode !== episodeNumber)
      : [...previous, episodeNumber].sort((a, b) => a - b));
  };

  const toggleSelectAll = () => {
    setSelectedEpisodes(allSelected ? [] : episodeNumbers);
  };

  const triggerDownload = (url: string, filename: string) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => anchor.remove(), 100);
  };

  const handleDownload = async () => {
    if (selectedEpisodes.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedEpisodes.length, status: 'Preparing downloads...' });
    const openedUrls: string[] = [];

    for (let index = 0; index < selectedEpisodes.length; index += 1) {
      const episodeNumber = selectedEpisodes[index];
      const sourceUrl = `/api/sources/${movieId}?season=${activeSeason}&episode=${episodeNumber}`;
      try {
        const response = await fetch(sourceUrl);
        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];
        const requestedQuality = results.find((source: any) => String(source.quality || '').toUpperCase().replace(/\s/g, '') === selectedQuality);
        const best = requestedQuality || results.reduce((previous: any, current: any) => {
          const previousQuality = parseInt(String(previous?.quality || 0), 10) || 0;
          const currentQuality = parseInt(String(current?.quality || 0), 10) || 0;
          return currentQuality > previousQuality ? current : previous;
        }, null);
        const downloadUrl = best?.download || best?.direct || best?.url || best?.stream;
        if (downloadUrl) {
          const filename = `${movie?.title || 'Video'}_S${String(activeSeason).padStart(2, '0')}_E${String(episodeNumber).padStart(2, '0')}.mp4`;
          openedUrls.push(downloadUrl);
          window.setTimeout(() => triggerDownload(downloadUrl, filename), index * 450);
        }
      } catch (error) {
        console.error('Failed to prepare episode download', episodeNumber, error);
      }
      setProgress(previous => ({ ...previous, current: index + 1 }));
    }

    if (openedUrls.length === 0) {
      setProgress({ current: 0, total: selectedEpisodes.length, status: 'No downloadable source found.' });
      setIsProcessing(false);
      return;
    }

    setProgress({ current: selectedEpisodes.length, total: selectedEpisodes.length, status: `${openedUrls.length} download${openedUrls.length === 1 ? '' : 's'} started` });
    window.setTimeout(() => {
      setIsProcessing(false);
      onClose();
    }, Math.max(900, selectedEpisodes.length * 450));
  };

  if (!isOpen || !movieId) return null;

  return (
    <div className="fixed inset-0 z-[2600] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Download">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-hidden rounded-t-[28px] sm:rounded-[28px] bg-[#11131f] text-white border border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-extrabold">Download</h2>
            <p className="mt-1 text-xs text-gray-400 truncate max-w-[260px]">{movie?.title || 'Resources'}</p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="w-10 h-10 rounded-full bg-white/5 text-gray-300 hover:bg-white/10 transition disabled:opacity-40" aria-label="Close download dialog">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Resource</p>
            <p className="mt-1 text-sm text-gray-300">Uploaded by Movie Lab resources</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">English dub</span>
              {loading && <span className="text-xs text-gray-500">Loading episodes...</span>}
            </div>
          </div>

          <div className="px-5 pt-5">
            <p className="mb-2 text-xs font-bold text-gray-400">Season</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(availableSeasons.length ? availableSeasons : [activeSeason]).map(season => (
                <button key={season} onClick={() => setActiveSeason(season)} disabled={isProcessing} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${activeSeason === season ? 'bg-primary text-black' : 'bg-white/8 text-gray-300 hover:bg-white/15'}`}>
                  Season {String(season).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pt-5">
            <p className="mb-2 text-xs font-bold text-gray-400">Quality</p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_OPTIONS.map(quality => (
                <button key={quality} onClick={() => setSelectedQuality(quality)} disabled={isProcessing} className={`rounded-xl border py-2.5 text-sm font-bold transition ${selectedQuality === quality ? 'border-primary bg-primary text-black' : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'}`}>
                  {quality}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pt-5 pb-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Episodes</p>
                <p className="text-xs text-gray-500">{selectedEpisodes.length} of {episodeNumbers.length} selected</p>
              </div>
              <button onClick={toggleSelectAll} disabled={isProcessing || episodeNumbers.length === 0} className="text-xs font-bold text-primary hover:text-white transition disabled:opacity-40">
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {episodes.map((episode, index) => {
                const episodeNumber = episode.episodeNumber || index + 1;
                const selected = selectedEpisodes.includes(episodeNumber);
                return (
                  <label key={episodeNumber} className={`flex items-center gap-3 rounded-2xl border p-3 transition cursor-pointer ${selected ? 'border-primary/60 bg-primary/10' : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.08]'} ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleEpisode(episodeNumber)} className="h-4 w-4 accent-[var(--pm-accent)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">S{String(activeSeason).padStart(2, '0')} E{String(episodeNumber).padStart(2, '0')}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{episode.title || 'Ready for download'}</p>
                    </div>
                    <i className={`fa-solid fa-download text-xs ${selected ? 'text-primary' : 'text-gray-600'}`} />
                  </label>
                );
              })}
              {!loading && episodes.length === 0 && <p className="rounded-2xl bg-white/5 py-8 text-center text-sm text-gray-500">No episodes available for this season.</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 bg-[#11131f]/95 px-5 py-4 backdrop-blur">
          <button onClick={toggleSelectAll} disabled={isProcessing || episodeNumbers.length === 0} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-gray-200 hover:bg-white/10 transition disabled:opacity-40">
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button onClick={handleDownload} disabled={selectedEpisodes.length === 0 || isProcessing} className="flex-[1.35] rounded-xl bg-primary py-3 text-sm font-extrabold text-black shadow-[0_0_20px_rgba(0,229,255,0.2)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
            {isProcessing ? `${progress.current}/${progress.total}` : `Download${selectedEpisodes.length ? ` (${selectedEpisodes.length})` : ''}`}
          </button>
        </div>
        {isProcessing && <div className="h-1 bg-white/10"><div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} /></div>}
      </div>
    </div>
  );
};

export default BulkDownloadModal;
