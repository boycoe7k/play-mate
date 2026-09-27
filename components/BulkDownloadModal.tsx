import React, { useEffect, useMemo, useState } from 'react';
import { useMovieDetails } from '../hooks/useMovieDetails';
import { Episode, MovieResult } from '../types';

interface BulkDownloadModalProps {
  movieId: string;
  movieData?: MovieResult;
  isMovie?: boolean;
  seasonNumber?: number;
  seasons?: number[];
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (urls: string[]) => void;
}

const QUALITY_OPTIONS = ['360P', '480P', '720P', '1080P'];

const BulkDownloadModal: React.FC<BulkDownloadModalProps> = ({
  movieId,
  movieData,
  isMovie = false,
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
  const { movie: fetchedMovie, loading } = useMovieDetails(dummyMovie);
  const movie = movieData?.title ? movieData : fetchedMovie;
  const availableSeasons = useMemo(() => {
    if (isMovie) return [1];
    const fromMovie = movie?.seasons?.map(season => season.seasonNumber) || [];
    return Array.from(new Set([...seasons, ...fromMovie, seasonNumber].filter((value): value is number => typeof value === 'number'))).sort((a, b) => a - b);
  }, [isMovie, movie?.seasons, seasonNumber, seasons]);
  const [activeSeason, setActiveSeason] = useState(seasonNumber || availableSeasons[0] || 1);
  const languageOptions = useMemo(() => movie?.dubs?.map(dub => dub.lanName).filter(Boolean) || ['English dub'], [movie?.dubs]);
  const [selectedLanguage, setSelectedLanguage] = useState('English dub');
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [selectedQuality, setSelectedQuality] = useState('720P');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  useEffect(() => {
    if (!isOpen) return;
    setActiveSeason(seasonNumber || availableSeasons[0] || 1);
    setSelectedLanguage(languageOptions[0] || 'English dub');
    setSelectedEpisodes([]);
    setSelectedQuality('720P');
    setIsProcessing(false);
  }, [availableSeasons, isOpen, languageOptions, seasonNumber]);

  const seasonData = movie?.seasons?.find(season => season.seasonNumber === activeSeason);
  const episodes: Episode[] = isMovie
    ? [{ episodeNumber: 1, title: 'Movie download' }]
    : seasonData?.episodes || Array.from(
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
        const requestedQuality = results.find((source: any) => `${String(source.quality || '').toUpperCase().replace(/\s/g, '').replace(/P$/, '')}P` === selectedQuality);
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
        <div className="relative h-24 overflow-hidden border-b border-white/10">
          {movie?.cover && <img src={movie.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#11131f] via-[#11131f]/55 to-black/20" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="text-xl font-extrabold">Download</h2>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="w-10 h-10 rounded-full bg-white/5 text-gray-300 hover:bg-white/10 transition disabled:opacity-40" aria-label="Close download dialog">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-5 rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-1">
              <p className="text-xl font-extrabold">Resources</p>
              <span className="text-sm text-gray-400">Uploaded by Movie Lab resources</span>
              <i className="fa-regular fa-circle-question ml-1 text-gray-500" />
            </div>
            <div className="mt-4 flex gap-3">
              <label className="relative">
                <span className="sr-only">Language</span>
                <select value={selectedLanguage} onChange={event => setSelectedLanguage(event.target.value)} disabled={isProcessing} className="appearance-none rounded-lg border border-white/25 bg-[#191b25] px-3 py-2.5 pr-9 text-sm font-semibold text-white outline-none focus:border-primary">
                  {languageOptions.map(language => <option key={language}>{language}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              </label>
              {!isMovie && <label className="relative">
                <span className="sr-only">Season</span>
                <select value={activeSeason} onChange={event => setActiveSeason(Number(event.target.value))} disabled={isProcessing} className="appearance-none rounded-lg border border-white/25 bg-[#191b25] px-3 py-2.5 pr-9 text-sm font-semibold text-white outline-none focus:border-primary">
                  {(availableSeasons.length ? availableSeasons : [activeSeason]).map(season => <option key={season} value={season}>Season {String(season).padStart(2, '0')}</option>)}
                </select>
                <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              </label>}
            </div>
            {loading && <p className="mt-2 text-xs text-gray-500">Loading episodes...</p>}
            <div className="my-4 border-t border-white/10" />
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_OPTIONS.map(quality => (
                <button key={quality} onClick={() => setSelectedQuality(quality)} disabled={isProcessing} className={`rounded-lg py-2.5 text-sm font-bold transition ${selectedQuality === quality ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-black' : 'bg-white/15 text-gray-200 hover:bg-white/25'}`}>
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
                const episodeData = episode as Episode & { size?: string; duration?: string };
                return (
                  <label key={episodeNumber} className={`flex items-center gap-4 border-b border-white/[0.06] px-1 py-3 transition cursor-pointer ${selected ? 'text-white' : 'text-gray-200'} ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary bg-primary/15' : 'border-gray-400'}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleEpisode(episodeNumber)} className="sr-only" />
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold">{isMovie ? 'Movie' : `S${String(activeSeason).padStart(2, '0')} E${String(episodeNumber).padStart(2, '0')}`}</p>
                      <p className="mt-1 text-sm text-gray-400">{episodeData.size || '—'}{episodeData.duration ? ` | ${episodeData.duration}` : ''}</p>
                    </div>
                  </label>
                );
              })}
              {!loading && episodes.length === 0 && <p className="rounded-2xl bg-white/5 py-8 text-center text-sm text-gray-500">No episodes available for this season.</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 bg-[#11131f]/95 px-5 py-4 backdrop-blur">
          <button onClick={toggleSelectAll} disabled={isProcessing || episodeNumbers.length === 0} className="flex-1 flex items-center gap-3 py-3 text-left text-sm font-bold text-gray-200 transition disabled:opacity-40">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${allSelected ? 'border-primary bg-primary/15' : 'border-gray-400'}`}>{allSelected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
            Select All
          </button>
          <button onClick={handleDownload} disabled={selectedEpisodes.length === 0 || isProcessing} className="flex-[1.35] rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 py-3 text-sm font-extrabold text-black shadow-[0_0_20px_rgba(0,229,255,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            <i className="fa-solid fa-download mr-2" />{isProcessing ? `${progress.current}/${progress.total}` : 'Download'}
          </button>
        </div>
        {isProcessing && <div className="h-1 bg-white/10"><div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} /></div>}
      </div>
    </div>
  );
};

export default BulkDownloadModal;
