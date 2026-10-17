import { resolveImageUrl } from '../utils/imageUrl';
import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, Upload, Trash2, Home, Plus, Folder, Image as ImageIcon, Pencil, FolderPlus } from 'lucide-react';
import { Chat } from '../types/roleplay';
import { onAuthStateChanged } from 'firebase/auth';
import { deleteObject, getDownloadURL, getMetadata, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, storage } from '../lib/firebase';

interface Album { id: string; name: string; coverImage: string; }
interface Picture { id?: string; title: string; url: string; albumId?: string; }
const ALBUMS_KEY = 'colorpop_gallery_albums_v1';
const GALLERY_KEY = 'colorpop_gallery_items_v1';
const readJson = <T,>(key: string, fallback: T): T => {
  try { const parsed = JSON.parse(localStorage.getItem(key) || 'null'); return parsed ?? fallback; } catch { return fallback; }
};
const GALLERY_DB_NAME = 'pretty-little-fantasies-gallery';
const GALLERY_DB_STORE = 'pictures';
const GALLERY_DB_KEY = 'saved-gallery';

function openGalleryDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GALLERY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(GALLERY_DB_STORE)) request.result.createObjectStore(GALLERY_DB_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open gallery storage.'));
  });
}

async function readGallerySnapshot(): Promise<Picture[] | null> {
  const database = await openGalleryDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(GALLERY_DB_STORE, 'readonly').objectStore(GALLERY_DB_STORE).get(GALLERY_DB_KEY);
      request.onsuccess = () => resolve(Array.isArray(request.result?.pictures) ? request.result.pictures : null);
      request.onerror = () => reject(request.error || new Error('Could not read gallery storage.'));
    });
  } finally { database.close(); }
}

async function writeGallerySnapshot(pictures: Picture[]): Promise<void> {
  const database = await openGalleryDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(GALLERY_DB_STORE, 'readwrite');
      transaction.objectStore(GALLERY_DB_STORE).put({ id: GALLERY_DB_KEY, pictures });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not save gallery storage.'));
      transaction.onabort = () => reject(transaction.error || new Error('Gallery save was aborted.'));
    });
  } finally { database.close(); }
}


interface SceneGeneratorModalProps {
  isOpen: boolean; onClose: () => void; chats: Chat[]; activeChatId?: string;
  onApplySceneBackground: (chatId: string, bgUrl: string) => void; fullPage?: boolean;
  homeImage?: string; onSetHomeImage?: (image: string) => void;
}

export const SceneGeneratorModal: React.FC<SceneGeneratorModalProps> = ({ isOpen, onClose, chats, activeChatId, onApplySceneBackground, fullPage = false, homeImage, onSetHomeImage }) => {
  const [selectedChatId, setSelectedChatId] = useState(activeChatId || chats[0]?.id || '');
  const [selectedImage, setSelectedImage] = useState(homeImage || '');
  const [uploaded, setUploaded] = useState<Picture[]>(() => readJson(GALLERY_KEY, []));
  const [galleryHydrated, setGalleryHydrated] = useState(false);
  const [albums, setAlbums] = useState<Album[]>(() => readJson(ALBUMS_KEY, []));
  const [activeAlbumId, setActiveAlbumId] = useState('all');
  const [albumName, setAlbumName] = useState('');
  const [cloudMessage, setCloudMessage] = useState('');
  const activeAlbum = albums.find((album) => album.id === activeAlbumId);
  const visiblePictures = useMemo(() => activeAlbumId === 'all' ? uploaded : uploaded.filter((picture) => picture.albumId === activeAlbumId), [activeAlbumId, uploaded]);

  const savePictures = (items: Picture[]) => {
    setUploaded(items);
    let browserStorageSaved = false;
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(items));
      browserStorageSaved = true;
    } catch {
      setCloudMessage('Browser storage is full. Saving the gallery to the larger local backup…');
    }
    void writeGallerySnapshot(items).then(() => {
      if (!browserStorageSaved) {
        setCloudMessage(auth.currentUser
          ? 'Gallery saved to the local backup and ready to sync with Firebase Storage.'
          : 'Gallery saved in this browser. Sign in to Firebase Cloud to back it up online.');
      }
    }).catch((error) => {
      if (!browserStorageSaved) {
        console.error('Could not persist the gallery:', error);
        setCloudMessage('The gallery could not save on this device. Free up device storage and try again.');
        window.alert('The gallery could not save because this browser is out of storage.');
      }
    });
  };
  const saveAlbums = (items: Album[]) => {
    setAlbums(items);
    try { localStorage.setItem(ALBUMS_KEY, JSON.stringify(items)); }
    catch { window.alert('Could not save your albums in this browser.'); }
    const user = auth.currentUser;
    if (user) void setDoc(doc(db, 'users', user.uid), { galleryAlbums: items }, { merge: true }).catch(() => setCloudMessage('Albums are saved on this device, but Firebase could not sync them.'));
  };
  useEffect(() => {
    let cancelled = false;
    const localPicturesPromise = readGallerySnapshot().catch((error) => {
      console.warn('Could not read the IndexedDB gallery backup:', error);
      return null;
    }).then((savedPictures) => {
      const localPictures = savedPictures ?? readJson<Picture[]>(GALLERY_KEY, []);
      if (!cancelled) {
        setUploaded(localPictures);
        setGalleryHydrated(true);
      }
      return localPictures;
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
    const browserPictures = await localPicturesPromise;
    if (cancelled) return;
    if (!user) { setCloudMessage('Sign in to Firebase to back up your pictures and albums.'); return; }
    try {
      const albumDoc = await getDoc(doc(db, 'users', user.uid));
      const cloudAlbums = albumDoc.data()?.galleryAlbums;
      if (Array.isArray(cloudAlbums)) { setAlbums(cloudAlbums); localStorage.setItem(ALBUMS_KEY, JSON.stringify(cloudAlbums)); }
      const result = await listAll(ref(storage, `users/${user.uid}/gallery`));
      const cloudPictures = await Promise.all(result.items.map(async (item): Promise<Picture> => {
        const [metadata, url] = await Promise.all([getMetadata(item), getDownloadURL(item)]);
        return { id: metadata.customMetadata?.id || item.name, title: metadata.customMetadata?.title || item.name, url, albumId: metadata.customMetadata?.albumId || undefined };
      }));
      let combined = [...browserPictures];
      for (const picture of cloudPictures) {
        const match = combined.findIndex((local) => local.id === picture.id);
        if (match >= 0) combined[match] = picture; else combined.push(picture);
      }
      // Move older browser-only photos into Firebase on the next signed-in visit.
      for (const local of combined.filter((picture) => picture.url.startsWith('data:'))) {
        const blob = await (await fetch(local.url)).blob();
        const id = local.id || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const cloudRef = ref(storage, `users/${user.uid}/gallery/${id}.jpg`);
        await uploadBytes(cloudRef, blob, { contentType: blob.type || 'image/jpeg', customMetadata: { id, title: local.title, albumId: local.albumId || '' } });
        local.id = id; local.url = await getDownloadURL(cloudRef);
      }
      setUploaded(combined);
      setGalleryHydrated(true);
      try { localStorage.setItem(GALLERY_KEY, JSON.stringify(combined)); } catch { /* IndexedDB keeps the full gallery when localStorage is full. */ }
      await writeGallerySnapshot(combined);
      setCloudMessage('Pictures and albums are backed up to Firebase Storage.');
    } catch { setCloudMessage('Firebase backup could not load. Your browser copies are still here; check Firebase sign-in and Storage rules.'); }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);
  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!galleryHydrated) {
      setCloudMessage('Loading your saved gallery. Try the upload again in a moment.');
      return;
    }
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    const newPictures: Picture[] = [];
    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const compressed = await new Promise<string>((resolve) => {
        const image = new Image();
        image.onload = () => { const scale = Math.min(1, 1400 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.82)); };
        image.onerror = () => resolve(dataUrl); image.src = dataUrl;
      });
      const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const title = file.name.replace(/\.[^.]+$/, '');
      let url = compressed;
      const user = auth.currentUser;
      if (user) {
        try {
          const blob = await (await fetch(compressed)).blob();
          const cloudRef = ref(storage, `users/${user.uid}/gallery/${id}.jpg`);
          await uploadBytes(cloudRef, blob, { contentType: 'image/jpeg', customMetadata: { id, title } });
          url = await getDownloadURL(cloudRef);
        } catch { setCloudMessage('Picture saved in this browser, but its Firebase upload failed. Check your connection and Storage rules.'); }
      } else setCloudMessage('Picture saved in this browser. Sign in to back it up to Firebase.');
      newPictures.push({ id, title, url });
    }
    if (newPictures.length) savePictures([...uploaded, ...newPictures]);
    event.target.value = '';
  };
  const createAlbum = () => {
    const name = albumName.trim(); if (!name) return;
    const id = `album_${Date.now()}`;
    saveAlbums([...albums, { id, name, coverImage: selectedImage || uploaded[0]?.url || '' }]);
    setAlbumName(''); setActiveAlbumId(id);
  };
  const deleteAlbum = () => {
    if (!activeAlbum || !window.confirm(`Delete the album “${activeAlbum.name}”? Its pictures will stay in All Photos.`)) return;
    saveAlbums(albums.filter((album) => album.id !== activeAlbum.id));
    savePictures(uploaded.map((picture) => picture.albumId === activeAlbum.id ? { ...picture, albumId: undefined } : picture));
    setActiveAlbumId('all');
  };
  const renameAlbum = () => {
    if (!activeAlbum) return;
    const name = window.prompt('Album name', activeAlbum.name)?.trim(); if (!name) return;
    saveAlbums(albums.map((album) => album.id === activeAlbum.id ? { ...album, name } : album));
  };
  const updateAlbumCover = () => {
    if (!activeAlbum || !selectedImage) return;
    saveAlbums(albums.map((album) => album.id === activeAlbum.id ? { ...album, coverImage: selectedImage } : album));
  };
  const putInAlbum = () => {
    if (!activeAlbum || !selectedImage) return;
    const updated = uploaded.map((picture) => picture.url === selectedImage ? { ...picture, albumId: activeAlbum.id } : picture);
    savePictures(updated);
    const picture = updated.find((item) => item.url === selectedImage);
    const user = auth.currentUser;
    if (user && picture?.id && !picture.url.startsWith('data:')) void updateMetadata(ref(storage, `users/${user.uid}/gallery/${picture.id}.jpg`), { customMetadata: { id: picture.id, title: picture.title, albumId: activeAlbum.id } }).catch(() => setCloudMessage('Photo moved in this browser, but the Firebase album update failed.'));
  };
  const deletePicture = (picture: Picture) => {
    savePictures(uploaded.filter((item) => item.url !== picture.url));
    const user = auth.currentUser;
    if (user && picture.id && !picture.url.startsWith('data:')) void deleteObject(ref(storage, `users/${user.uid}/gallery/${picture.id}.jpg`)).catch(() => setCloudMessage('Photo removed from this browser, but Firebase could not delete its cloud copy.'));
    if (selectedImage === picture.url) setSelectedImage('');
  };
  if (!isOpen) return null;
  const selectedTitle = uploaded.find((picture) => picture.url === selectedImage)?.title || 'Picture';
  const handleApply = () => { if (selectedChatId && selectedImage) { onApplySceneBackground(selectedChatId, selectedImage); onClose(); } };

  return <div className={fullPage ? 'w-full max-w-7xl mx-auto px-4 py-6' : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md'}>
    <section className={`relative w-full ${fullPage ? 'max-w-7xl min-h-[70vh]' : 'max-w-4xl max-h-[90vh]'} bg-[#140410] border-2 border-[#ff3399]/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(255,51,153,0.4)] flex flex-col overflow-hidden text-[#ffd6eb]`}>
      <header className="flex items-center justify-between border-b border-[#ff3399]/30 pb-4 mb-4">
        <div><h2 className="text-xl font-bold text-white">Picture Library</h2><p className="text-xs text-[#ffd6eb]/70">Organize your pictures into albums and choose album covers.</p></div>
        <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20" aria-label="Close"><X className="w-5 h-5" /></button>
      </header>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="cursor-pointer px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white text-xs font-bold flex items-center gap-2"><Upload className="w-4 h-4" /> Add pictures<input type="file" accept="image/*" multiple onChange={handlePictureUpload} className="hidden" /></label>
        <div className="flex gap-2"><input aria-label="New album name" value={albumName} onChange={(event) => setAlbumName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && createAlbum()} placeholder="Album name" className="w-36 sm:w-48 bg-[#12040e] border border-[#ff3399]/30 rounded-xl px-3 py-2 text-xs text-white" /><button onClick={createAlbum} disabled={!albumName.trim()} className="px-3 py-2 rounded-xl bg-[#00b4db]/20 border border-[#00b4db]/40 text-cyan-100 text-xs font-bold disabled:opacity-40 flex items-center gap-1"><FolderPlus className="w-4 h-4" /> Create album</button></div>
        <span className="text-[11px] text-[#ffd6eb]/60">{cloudMessage || 'Pictures and albums are saved in this browser.'}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        <button onClick={() => setActiveAlbumId('all')} className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold ${activeAlbumId === 'all' ? 'bg-[#ff007f]/25 border-[#ff3399] text-white' : 'bg-white/5 border-white/10 text-white/70'}`}><ImageIcon className="w-4 h-4 inline mr-1.5" />All Photos <span className="opacity-60">{uploaded.length}</span></button>
        {albums.map((album) => <button key={album.id} onClick={() => setActiveAlbumId(album.id)} className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${activeAlbumId === album.id ? 'bg-[#ff007f]/25 border-[#ff3399] text-white' : 'bg-white/5 border-white/10 text-white/70'}`}><span className="w-8 h-8 rounded-lg bg-black/30 overflow-hidden inline-flex items-center justify-center">{album.coverImage ? <img src={resolveImageUrl(album.coverImage)} className="w-full h-full object-cover" /> : <Folder className="w-4 h-4" />}</span>{album.name}<span className="opacity-60">{uploaded.filter((picture) => picture.albumId === album.id).length}</span></button>)}
      </div>
      {activeAlbum && <div className="flex flex-wrap items-center gap-2 p-3 mb-3 rounded-xl bg-[#1e071a] border border-[#ff3399]/20"><strong className="text-sm text-white mr-auto">{activeAlbum.name}</strong><button onClick={renameAlbum} className="px-2.5 py-1.5 text-xs rounded-lg bg-white/10 flex gap-1"><Pencil className="w-3.5 h-3.5" />Rename</button><button onClick={updateAlbumCover} disabled={!selectedImage} className="px-2.5 py-1.5 text-xs rounded-lg bg-cyan-500/20 text-cyan-100 disabled:opacity-40">Use selected as cover</button><button onClick={putInAlbum} disabled={!selectedImage} className="px-2.5 py-1.5 text-xs rounded-lg bg-pink-500/20 text-pink-100 disabled:opacity-40">Add selected photo</button><button onClick={deleteAlbum} className="px-2.5 py-1.5 text-xs rounded-lg bg-red-500/15 text-red-200 flex gap-1"><Trash2 className="w-3.5 h-3.5" />Delete album</button></div>}
      <div className="flex-1 min-h-[200px] overflow-y-auto pr-1">
        {visiblePictures.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{visiblePictures.map((picture, index) => <button key={picture.id || `${picture.url}_${index}`} onClick={() => setSelectedImage(picture.url)} className={`relative rounded-2xl overflow-hidden border-2 text-left aspect-[4/3] group ${selectedImage === picture.url ? 'border-[#00b4db] ring-2 ring-[#00b4db]/40' : 'border-[#ff3399]/25 hover:border-[#ff3399]'}`}><img src={resolveImageUrl(picture.url)} alt={picture.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />{selectedImage === picture.url && <span className="absolute top-2 right-2 rounded-full p-1 bg-cyan-500 text-white"><Check className="w-4 h-4" /></span>}<span className="absolute inset-x-0 bottom-0 p-2 pt-8 bg-gradient-to-t from-black/90 to-transparent text-xs font-semibold text-white truncate">{picture.title}</span><span onClick={(event) => { event.stopPropagation(); deletePicture(picture); }} role="button" aria-label={`Delete ${picture.title}`} className="absolute left-2 top-2 p-1.5 rounded-full bg-black/70 text-white"><Trash2 className="w-3.5 h-3.5" /></span></button>)}</div> : <div className="h-48 flex flex-col items-center justify-center text-center text-white/55"><ImageIcon className="w-8 h-8 mb-2 opacity-40" /><p className="text-sm">{activeAlbum ? 'This album is empty. Select a photo in All Photos, then choose Add selected photo.' : 'No pictures yet. Add pictures from your device to start your library.'}</p></div>}
      </div>
      <footer className="pt-4 mt-3 border-t border-[#ff3399]/30 flex flex-wrap items-center gap-2 justify-between"><p className="text-xs text-[#ffd6eb]/70">Selected: <strong className="text-white">{selectedTitle}</strong></p><div className="flex flex-wrap gap-2">{onSetHomeImage && <button onClick={() => selectedImage && onSetHomeImage(selectedImage)} disabled={!selectedImage} className="px-3 py-2 bg-[#ff007f]/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"><Home className="w-4 h-4" /> Set Home Picture</button>}<select aria-label="Target chat" value={selectedChatId} onChange={(event) => setSelectedChatId(event.target.value)} className="max-w-40 bg-[#12040e] border border-[#ff3399]/30 rounded-xl px-2.5 py-2 text-xs text-white">{chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.title}</option>)}</select><button onClick={handleApply} disabled={!selectedImage || !selectedChatId} className="px-4 py-2 bg-gradient-to-r from-[#00b4db] to-[#0083b0] text-white rounded-xl text-xs font-bold disabled:opacity-40">Set as Chat Backdrop</button></div></footer>
    </section>
  </div>;
};
