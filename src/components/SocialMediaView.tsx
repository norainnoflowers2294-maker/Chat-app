import React, { useMemo, useState } from 'react';
import { Heart, MessageCircle, Plus, UsersRound, X } from 'lucide-react';
import type { Character, Chat, Persona } from '../types/roleplay';
import type { SocialMediaWorld, SocialPost, SocialProfile } from '../lib/socialMedia';

interface SocialMediaViewProps {
  world: SocialMediaWorld;
  characters: Character[];
  personas: Persona[];
  activeChat: Chat | null;
  onUpdateWorld: (world: SocialMediaWorld) => void;
  onToggleChat: (enabled: boolean) => void;
}

export const SocialMediaView: React.FC<SocialMediaViewProps> = ({
  world, characters, personas, activeChat, onUpdateWorld, onToggleChat,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState('all');
  const [postText, setPostText] = useState('');
  const [postingAs, setPostingAs] = useState(world.profiles[0]?.id || '');
  const [showComposer, setShowComposer] = useState(false);

  const profileAvatar = (profile: SocialProfile) => {
    const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
    const aliases: Record<string, string[]> = {
      lucious: ['lucious', 'lucius', 'luciousvance', 'luciouswillhelm'],
      emmy: ['emmy', 'emberlee', 'emberleeelizabeth'],
      val: ['val', 'valorie'],
      kyla: ['kyla'],
    };
    const profileNames = new Set([normalize(profile.name), ...(aliases[profile.id] || [])]);
    const character = characters.find((item) =>
      [item.name, ...(item.nicknames || [])].some((name) => {\n        const candidate = normalize(name);\n        return [...profileNames].some((profileName) => candidate === profileName || candidate.startsWith(profileName));\n      })
    );
    if (character?.avatar) return character.avatar;
    const persona = personas.find((item) =>
      [item.name, item.display_name || '', ...(item.nicknames || '').split(',')].some((name) => {\n        const candidate = normalize(name);\n        return [...profileNames].some((profileName) => candidate === profileName || candidate.startsWith(profileName));\n      })
    );
    if (persona?.avatar) return persona.avatar;
    const defaults: Record<string, string> = {
      lucious: '/lucious.jpg',\n      emmy: '/characters/emmy.svg',
      vic: '/characters/vic.svg',
      abel: '/characters/abel.svg',
      reese: '/characters/reese.svg',
      ryker: '/characters/ryker.svg',
      kaylynn: '/characters/kaylynn.svg',\n      kyla: '/characters/kyla.svg',\n      luca: '/characters/luca.svg',\n      kyle: '/characters/kyle.svg',\n      matt: '/characters/matt.svg',\n      val: '/characters/val.svg',
      asha: '/characters/asha.svg',
      bri: '/characters/bri.svg',
    };
    return profile.avatar || defaults[profile.id] || '/colorpop_hero.jpg';
  };
  const posts = useMemo(() => [...world.posts]
    .filter((post) => selectedProfileId === 'all' || post.profileId === selectedProfileId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [world.posts, selectedProfileId]);
  const updatePost = (next: SocialPost) => onUpdateWorld({ ...world, posts: world.posts.map((post) => post.id === next.id ? next : post) });
  const publishPost = (event: React.FormEvent) => {
    event.preventDefault();
    const text = postText.trim();
    if (!text || !postingAs) return;
    onUpdateWorld({
      ...world,
      posts: [{ id: `social_post_${Date.now()}`, profileId: postingAs, text, createdAt: new Date().toISOString(), likes: 0 }, ...world.posts],
    });
    setPostText('');
    setShowComposer(false);
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 px-4 py-5 text-white">
      <header className="rounded-3xl border border-[#ff66b2]/35 bg-gradient-to-br from-[#1e0818] via-[#140410] to-[#231036] p-5 shadow-[0_0_28px_rgba(255,0,128,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-[#ff007f]/20 p-3 text-[#ff99cc]"><UsersRound className="h-6 w-6" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ff99cc]">A separate world</p><h1 className="text-2xl font-black">Social Media</h1><p className="mt-1 max-w-xl text-sm text-[#ffd6eb]/70">Profiles and posts live here on their own. Nothing from this feed enters a chat unless you turn it on for that chat.</p></div>
          </div>
          <button type="button" onClick={() => { setPostingAs(world.profiles[0]?.id || ''); setShowComposer(true); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] px-4 py-2.5 text-sm font-bold shadow-[0_0_16px_rgba(255,0,128,.25)]"><Plus className="h-4 w-4" />Create post</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div><p className="text-sm font-semibold">Use this world in the active chat</p><p className="text-[11px] text-[#ffd6eb]/60">{activeChat ? 'The selected chat can reference profiles and recent posts when enabled.' : 'Open a chat first to connect it.'}</p></div>
          <button type="button" disabled={!activeChat} aria-pressed={Boolean(activeChat?.socialMediaEnabled)} onClick={() => onToggleChat(!activeChat?.socialMediaEnabled)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeChat?.socialMediaEnabled ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/40' : 'bg-white/10 text-white hover:bg-white/20'} disabled:cursor-not-allowed disabled:opacity-40`}>
            {activeChat?.socialMediaEnabled ? 'Connected to chat' : 'Off for this chat'}
          </button>
        </div>
      </header>

      <div className="rounded-3xl border border-[#ff66b2]/25 bg-[#140410]/90 p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Profiles <span className="text-xs font-normal text-[#ffd6eb]/55">({world.profiles.length})</span></h2><span className="text-[10px] text-[#ffd6eb]/55">Choose a profile to filter the feed</span></div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button type="button" onClick={() => setSelectedProfileId('all')} className={`flex min-w-[76px] flex-col items-center gap-1 rounded-xl p-2 ${selectedProfileId === 'all' ? 'bg-[#ff007f]/20' : 'hover:bg-white/5'}`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#ff66b2] bg-[#ff007f]/15 text-sm font-bold">All</span><span className="text-[10px]">All posts</span>
          </button>
          {world.profiles.map((profile) => (
            <button key={profile.id} type="button" onClick={() => setSelectedProfileId(profile.id)} aria-pressed={selectedProfileId === profile.id}
              className={`flex min-w-[76px] flex-col items-center gap-1 rounded-xl p-2 ${selectedProfileId === profile.id ? 'bg-[#ff007f]/20' : 'hover:bg-white/5'}`}>
              <img src={profileAvatar(profile)} alt="" className="h-12 w-12 rounded-full border-2 border-[#ff66b2]/70 object-cover" /><span className="max-w-[72px] truncate text-[10px]">{profile.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((post) => {
          const profile = world.profiles.find((item) => item.id === post.profileId);
          if (!profile) return null;
          return <article key={post.id} className="rounded-3xl border border-[#ff66b2]/25 bg-[#140410]/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,.2)]">
            <div className="flex items-center gap-3">
              <img src={profileAvatar(profile)} alt="" className="h-11 w-11 rounded-full border border-[#ff66b2]/60 object-cover" />
              <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{profile.name}</h3><p className="truncate text-[10px] text-[#ffd6eb]/55">{profile.relationship || 'Member'} · {new Date(post.createdAt).toLocaleString()}</p></div>
            </div>
            <p className="whitespace-pre-wrap py-4 text-sm leading-relaxed text-white/90">{post.text}</p>
            <div className="flex items-center gap-4 border-t border-white/10 pt-3">
              <button type="button" aria-pressed={Boolean(post.likedByUser)} onClick={() => updatePost({ ...post, likedByUser: !post.likedByUser, likes: Math.max(0, post.likes + (post.likedByUser ? -1 : 1)) })} className={`flex items-center gap-1.5 text-xs ${post.likedByUser ? 'text-pink-300' : 'text-white/65 hover:text-pink-300'}`}><Heart className={`h-4 w-4 ${post.likedByUser ? 'fill-current' : ''}`} />{post.likes} likes</button>
              <span className="flex items-center gap-1.5 text-xs text-white/45"><MessageCircle className="h-4 w-4" />Comments are coming later</span>
            </div>
          </article>;
        })}
        {!posts.length && <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-[#ffd6eb]/65">No posts for this profile yet.</p>}
      </div>

      {showComposer && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowComposer(false)}>
        <form role="dialog" aria-modal="true" aria-label="Create social media post" onClick={(event) => event.stopPropagation()} onSubmit={publishPost} className="w-full max-w-lg space-y-3 rounded-2xl border border-[#ff66b2]/45 bg-[#140410] p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold">Create a post</h2><button type="button" aria-label="Close post composer" onClick={() => setShowComposer(false)} className="rounded-lg bg-white/10 p-2"><X className="h-4 w-4" /></button></div>
          <label className="block text-xs font-semibold">Post as</label>
          <select value={postingAs} onChange={(event) => setPostingAs(event.target.value)} className="w-full rounded-xl border border-white/15 bg-[#1e0818] p-3 text-sm">{world.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
          <label className="block text-xs font-semibold">What's happening?</label>
          <textarea autoFocus maxLength={1200} rows={4} value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="Write a post..." className="w-full resize-y rounded-xl border border-white/15 bg-[#1e0818] p-3 text-sm" />
          <div className="flex justify-end"><button type="submit" disabled={!postText.trim()} className="rounded-xl bg-[#ff007f] px-4 py-2 text-sm font-bold disabled:opacity-50">Post</button></div>
        </form>
      </div>}
    </section>
  );
};
