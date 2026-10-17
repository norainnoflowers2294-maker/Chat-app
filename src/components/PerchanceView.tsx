import React, { useState } from 'react';
import { ExternalLink, Globe2, Link2, Save, Sparkles, Trash2 } from 'lucide-react';

const PERCHANCE_LINKS_KEY = 'pretty_little_fantasies_perchance_links_v2';
const LEGACY_PERCHANCE_URL_KEY = 'colorpop_perchance_url_v1';
interface PerchanceLink { id: string; name: string; url: string; }

function readSavedLinks(): PerchanceLink[] {
  try {
    const saved = localStorage.getItem(PERCHANCE_LINKS_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((item): item is PerchanceLink =>
        item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.url === 'string');
    }
    const legacyUrl = localStorage.getItem(LEGACY_PERCHANCE_URL_KEY);
    if (legacyUrl) {
      const migrated = [{ id: `perchance-${Date.now()}`, name: 'Perchance project', url: legacyUrl }];
      localStorage.setItem(PERCHANCE_LINKS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // Keep the page usable if browser storage is unavailable or contains invalid data.
  }
  return [];
}

export const PerchanceView: React.FC = () => {
  const [links, setLinks] = useState(readSavedLinks);
  const [activeId, setActiveId] = useState(() => readSavedLinks()[0]?.id || '');
  const [draftName, setDraftName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [error, setError] = useState('');
  const activeLink = links.find((link) => link.id === activeId) || links[0] || null;

  const persist = (nextLinks: PerchanceLink[]) => {
    setLinks(nextLinks);
    try { localStorage.setItem(PERCHANCE_LINKS_KEY, JSON.stringify(nextLinks)); }
    catch { setError('Could not save links in this browser. Check your available storage.'); }
  };

  const saveLink = () => {
    const name = draftName.trim();
    const value = draftUrl.trim();
    if (!name) { setError('Give this link a name first.'); return; }
    if (!value) { setError('Paste a Perchance link first.'); return; }
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        setError('Use a web link that starts with https:// or http://.');
        return;
      }
      const nextLinks = [...links, { id: `perchance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, url: parsed.toString() }];
      persist(nextLinks);
      setActiveId(nextLinks[nextLinks.length - 1].id);
      setDraftName('');
      setDraftUrl('');
      setError('');
    } catch {
      setError('That link does not look valid. Check it and try again.');
    }
  };

  const removeLink = (id: string) => {
    const nextLinks = links.filter((link) => link.id !== id);
    persist(nextLinks);
    if (activeId === id) setActiveId(nextLinks[0]?.id || '');
    setError('');
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 text-[#ffd6eb]">
      <section className="overflow-hidden rounded-3xl border-2 border-[#ff3399]/50 bg-[#140410]/95 shadow-[0_0_35px_rgba(255,51,153,0.2)]">
        <div className="border-b border-[#ff3399]/30 bg-[#0d020b]/80 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff007f] to-[#9b51e0] text-white shadow-[0_0_18px_rgba(255,0,128,0.45)]"><Sparkles className="h-5 w-5" /></div>
            <div><h1 className="text-xl font-bold text-white sm:text-2xl">Perchance AI</h1><p className="text-xs text-[#ffd6eb]/70">Save and open all your Perchance projects from one place.</p></div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="rounded-2xl border border-[#ff3399]/30 bg-[#1e0818] p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-white">Add a Perchance link</h2>
            <div className="grid gap-2 sm:grid-cols-[minmax(160px,0.7fr)_minmax(0,1.6fr)_auto]">
              <input aria-label="Name for Perchance link" value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveLink(); }} placeholder="Link name" maxLength={80} className="min-w-0 rounded-xl border border-[#ff3399]/40 bg-[#12040e] px-3 py-3 text-sm text-white placeholder:text-white/35 focus:border-[#ff007f] focus:outline-none" />
              <div className="relative min-w-0"><Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ff99cc]/70" /><input aria-label="Perchance project link" type="url" inputMode="url" value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveLink(); }} placeholder="Paste your Perchance link" className="w-full rounded-xl border border-[#ff3399]/40 bg-[#12040e] py-3 pl-10 pr-3 text-sm text-white placeholder:text-white/35 focus:border-[#ff007f] focus:outline-none" /></div>
              <button type="button" onClick={saveLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] px-4 py-3 text-xs font-bold text-white shadow-[0_0_15px_rgba(255,0,128,0.35)] hover:brightness-110"><Save className="h-4 w-4" /> Add link</button>
            </div>
            {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-300">{error}</p>}
            <p className="mt-2 text-[11px] text-[#ffd6eb]/60">Give each project a name so it’s easy to find later. Links are saved in this browser.</p>
          </div>

          {links.length > 0 ? <>
            <section aria-label="Saved Perchance links">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-white">Your links</h2><span className="text-[11px] text-[#ffd6eb]/60">{links.length} saved</span></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{links.map((link) => (
                <div key={link.id} className={`flex items-center gap-2 rounded-xl border p-2 ${activeLink?.id === link.id ? 'border-pink-400/70 bg-pink-500/15' : 'border-white/10 bg-[#0d020b]/70'}`}>
                  <button type="button" onClick={() => setActiveId(link.id)} aria-pressed={activeLink?.id === link.id} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 text-left hover:bg-white/5"><Globe2 className="h-4 w-4 shrink-0 text-[#ff99cc]" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{link.name}</span><span className="block truncate text-[10px] text-white/45">{link.url}</span></span></button>
                  <button type="button" onClick={() => removeLink(link.id)} aria-label={`Remove ${link.name}`} title="Remove link" className="rounded-lg p-2 text-white/50 hover:bg-rose-500/15 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}</div>
            </section>

            {activeLink && <div className="overflow-hidden rounded-2xl border border-[#ff3399]/30 bg-[#0d020b]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2 text-xs text-[#ffd6eb]/80"><Globe2 className="h-4 w-4 shrink-0 text-[#ff99cc]" /><span className="truncate font-bold text-white">{activeLink.name}</span><span className="hidden truncate sm:inline">{activeLink.url}</span></div>
                <a href={activeLink.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff007f]/20 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#ff007f]/40">Open link <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
              <div className="relative h-[65vh] min-h-[420px] bg-[#12040e]"><iframe title={activeLink.name} src={activeLink.url} className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" allow="clipboard-read; clipboard-write" /></div>
              <p className="border-t border-white/10 px-4 py-2 text-[10px] text-[#ffd6eb]/55">If the project blocks embedding, use “Open link” to launch it in a new tab.</p>
            </div>}
          </> : <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#ff3399]/35 bg-[#0d020b]/60 px-6 text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff007f]/15 text-[#ff99cc]"><Globe2 className="h-7 w-7" /></div><h2 className="text-base font-bold text-white">Add your first Perchance link</h2><p className="mt-2 max-w-md text-xs leading-relaxed text-[#ffd6eb]/70">Name your project, paste its link, and it will appear here for easy access.</p></div>}
        </div>
      </section>
    </main>
  );
};
