import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, LockKeyhole, Play, AlertTriangle } from 'lucide-react';

interface AdultViewProps {
  onBack: () => void;
  onPlayStream?: (title: string, sources: Array<{ title: string; videoUrl: string; isM3u8?: boolean }>, posterUrl?: string) => void;
}

/** A privacy-first landing page for age-restricted titles. */
export const AdultView: React.FC<AdultViewProps> = ({ onBack }) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <main className="min-h-screen bg-[#080b12] text-white px-4 sm:px-6 pt-24 pb-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(236,72,153,0.18),transparent_55%)]" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft size={16} /> Back to Movie Lab
        </button>

        <section className="mt-8 rounded-[2rem] border border-pink-400/20 bg-white/[0.04] p-6 sm:p-10 shadow-2xl shadow-pink-950/20">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-pink-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-pink-300">
                <LockKeyhole size={13} /> 18+ Videos
              </div>
              <h1 className="mt-5 text-4xl sm:text-6xl font-black tracking-tight">Private viewing, clearly marked.</h1>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-gray-300">
                This section is reserved for adults. Movie Lab keeps age-restricted titles separate from the main catalog and does not autoplay or preview them.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 min-w-[220px]">
              <div className="flex items-center gap-3 text-emerald-300"><ShieldCheck size={21} /><span className="font-bold">Age notice active</span></div>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">Only continue if you are 18 or older and local access is permitted where you live.</p>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            {!confirmed ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button onClick={() => setConfirmed(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-6 py-3 font-black text-white hover:bg-pink-400 transition">
                  <Play size={17} /> I am 18 or older
                </button>
                <button onClick={onBack} className="rounded-xl border border-white/15 px-6 py-3 font-bold text-gray-300 hover:bg-white/10 transition">Return to movies</button>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={20} /><div><h2 className="font-black">18+ catalog is being prepared</h2><p className="mt-1 text-sm text-gray-300">No age-restricted titles are available in this release yet. The page is ready for the catalog feed and will remain separated from general movie browsing.</p></div></div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdultView;
