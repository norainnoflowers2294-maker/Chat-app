import React, { useState } from 'react';
import { ExternalLink, Globe2, Link2, Save, Sparkles } from 'lucide-react';

const PERCHANCE_URL_KEY = 'colorpop_perchance_url_v1';

function readSavedUrl(): string {
  try {
    return localStorage.getItem(PERCHANCE_URL_KEY) || '';
  } catch {
    return '';
  }
}

export const PerchanceView: React.FC = () => {
  const [savedUrl, setSavedUrl] = useState(readSavedUrl);
  const [draftUrl, setDraftUrl] = useState(savedUrl);
  const [error, setError] = useState('');

  const saveUrl = () => {
    const value = draftUrl.trim();
    if (!value) {
      setError('Paste your Perchance link first.');
      return;
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setError('Use a web link that starts with https:// or http://.');
        return;
      }
      setSavedUrl(parsed.toString());
      setDraftUrl(parsed.toString());
      localStorage.setItem(PERCHANCE_URL_KEY, parsed.toString());
      setError('');
    } catch {
      setError('That link does not look valid. Check it and try again.');
    }
  };

  const clearUrl = () => {
    setSavedUrl('');
    setDraftUrl('');
    setError('');
    try {
      localStorage.removeItem(PERCHANCE_URL_KEY);
    } catch {
      // The page remains usable if browser storage is unavailable.
    }
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 text-[#ffd6eb]">
      <section className="overflow-hidden rounded-3xl border-2 border-[#ff3399]/50 bg-[#140410]/95 shadow-[0_0_35px_rgba(255,51,153,0.2)]">
        <div className="border-b border-[#ff3399]/30 bg-[#0d020b]/80 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#9b51e0] text-white shadow-[0_0_18px_rgba(255,0,128,0.45)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Perchance AI</h1>
              <p className="text-xs text-[#ffd6eb]/70">Open your Perchance project from inside ColorPop.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="rounded-2xl border border-[#ff3399]/30 bg-[#1e0818] p-4 sm:p-5">
            <label htmlFor="perchance-project-url" className="mb-2 block text-xs font-bold text-[#ff99cc]">
              Perchance project link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ff99cc]/70" />
                <input
                  id="perchance-project-url"
                  type="url"
                  inputMode="url"
                  placeholder="Paste your Perchance link here when it’s ready"
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') saveUrl(); }}
                  className="w-full rounded-xl border border-[#ff3399]/40 bg-[#12040e] py-3 pl-10 pr-3 text-sm text-white placeholder:text-white/35 focus:border-[#ff007f] focus:outline-none"
                />
              </div>
              <button onClick={saveUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] px-4 py-3 text-xs font-bold text-white shadow-[0_0_15px_rgba(255,0,128,0.35)] hover:brightness-110">
                <Save className="h-4 w-4" /> Save link
              </button>
            </div>
            {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-300">{error}</p>}
            <p className="mt-2 text-[11px] text-[#ffd6eb]/60">The link is saved in this browser. You can replace it whenever your project link changes.</p>
          </div>

          {savedUrl ? (
            <div className="overflow-hidden rounded-2xl border border-[#ff3399]/30 bg-[#0d020b]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2 text-xs text-[#ffd6eb]/80">
                  <Globe2 className="h-4 w-4 shrink-0 text-[#ff99cc]" />
                  <span className="truncate">{savedUrl}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={clearUrl} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[#ffd6eb]/70 hover:bg-white/10 hover:text-white">Remove link</button>
                  <a href={savedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff007f]/20 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#ff007f]/40">
                    Open Perchance <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <div className="relative h-[65vh] min-h-[420px] bg-[#12040e]">
                <iframe
                  title="Perchance AI project"
                  src={savedUrl}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
              <p className="border-t border-white/10 px-4 py-2 text-[10px] text-[#ffd6eb]/55">
                If Perchance blocks embedding, use “Open Perchance” to launch the project in a new tab.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#ff3399]/35 bg-[#0d020b]/60 px-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff007f]/15 text-[#ff99cc]">
                <Globe2 className="h-7 w-7" />
              </div>
              <h2 className="text-base font-bold text-white">Your Perchance page is ready to connect</h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-[#ffd6eb]/70">
                When your Perchance AI project is finished, paste its link above. The page will save it here and try to display it inside ColorPop.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
