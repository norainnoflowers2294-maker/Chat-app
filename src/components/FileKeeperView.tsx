import React, { useEffect, useRef, useState } from 'react';
import { Download, FileArchive, FileText, Folder, FolderOpen, FolderPlus, Search, Trash2, Upload, X, MoveRight, ArchiveRestore } from 'lucide-react';
import { unzipSync, zipSync } from 'fflate';
import { onAuthStateChanged } from 'firebase/auth';
import { deleteObject, getBytes, getDownloadURL, getMetadata, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, storage } from '../lib/firebase';

interface KeptFile { id: string; name: string; type: string; size: number; savedAt: number; folderId?: string; blob?: Blob; cloudPath?: string; downloadURL?: string; }
interface KeptFolder { id: string; name: string; createdAt: number; }
const DB_NAME = 'colorpop-file-keeper';
const FILES_STORE = 'files';
const FOLDERS_STORE = 'folders';
function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILES_STORE)) database.createObjectStore(FILES_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(FOLDERS_STORE)) database.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openVault();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]); request.onerror = () => reject(request.error);
  });
}
async function putRecord(storeName: string, value: unknown): Promise<void> {
  const db = await openVault();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
async function removeRecord(storeName: string, id: string): Promise<void> {
  const db = await openVault();
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const FileKeeperView: React.FC = () => {
  const [files, setFiles] = useState<KeptFile[]>([]);
  const [folders, setFolders] = useState<KeptFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [query, setQuery] = useState('');
  const [folderName, setFolderName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveFolderList = async (nextFolders: KeptFolder[]) => {
    setFolders(nextFolders);
    await Promise.all(nextFolders.map((folder) => putRecord(FOLDERS_STORE, folder)));
    const user = auth.currentUser;
    if (user) await setDoc(doc(db, 'users', user.uid), { fileKeeperFolders: nextFolders }, { merge: true });
  };
  const refresh = async () => {
    try {
      const [localFiles, localFolders] = await Promise.all([getAll<KeptFile>(FILES_STORE), getAll<KeptFolder>(FOLDERS_STORE)]);
      const user = auth.currentUser;
      if (!user) { setFiles(localFiles.sort((a, b) => b.savedAt - a.savedAt)); setFolders(localFolders); setError('Sign in to Firebase to back up files and folders. This device copy remains available.'); return; }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const remoteFolders = userDoc.data()?.fileKeeperFolders;
      const activeFolders = Array.isArray(remoteFolders) ? remoteFolders as KeptFolder[] : localFolders;
      setFolders(activeFolders);
      await Promise.all(activeFolders.map((folder) => putRecord(FOLDERS_STORE, folder)));

      let cloud = await listAll(ref(storage, `users/${user.uid}/file-keeper`));
      const knownIds = new Set(await Promise.all(cloud.items.map(async (item) => (await getMetadata(item)).customMetadata?.id || item.name)));
      for (const local of localFiles.filter((file) => !knownIds.has(file.id) && file.blob)) {
        const path = `users/${user.uid}/file-keeper/${local.id}_${safeName(local.name)}`;
        await uploadBytes(ref(storage, path), local.blob!, { contentType: local.type, customMetadata: { id: local.id, originalName: local.name, savedAt: String(local.savedAt), folderId: local.folderId || '' } });
      }
      cloud = await listAll(ref(storage, `users/${user.uid}/file-keeper`));
      const cloudFiles = await Promise.all(cloud.items.map(async (item): Promise<KeptFile> => {
        const [metadata, downloadURL] = await Promise.all([getMetadata(item), getDownloadURL(item)]);
        return { id: metadata.customMetadata?.id || item.name, name: metadata.customMetadata?.originalName || item.name, type: metadata.contentType || 'application/octet-stream', size: metadata.size, savedAt: Number(metadata.customMetadata?.savedAt) || Date.now(), folderId: metadata.customMetadata?.folderId || undefined, cloudPath: item.fullPath, downloadURL };
      }));
      const cloudById = new Map(cloudFiles.map((file) => [file.id, file]));
      for (const local of localFiles) if (!cloudById.has(local.id)) cloudById.set(local.id, local);
      setFiles([...cloudById.values()].sort((a, b) => b.savedAt - a.savedAt)); setError('');
    } catch {
      const [localFiles, localFolders] = await Promise.all([getAll<KeptFile>(FILES_STORE).catch(() => []), getAll<KeptFolder>(FOLDERS_STORE).catch(() => [])]);
      setFiles(localFiles.sort((a, b) => b.savedAt - a.savedAt)); setFolders(localFolders);
      setError('Firebase could not sync. Your device copies are still available; check sign-in, Firestore rules, Storage rules, and connection.');
    }
  };
  useEffect(() => onAuthStateChanged(auth, () => { void refresh(); }), []);

  const uploadKeptFile = async (file: File | Blob, name: string, folderId?: string, id = makeId('file')) => {
    const kept: KeptFile = { id, name, type: file.type || 'application/octet-stream', size: file.size, savedAt: Date.now(), folderId, blob: file };
    await putRecord(FILES_STORE, kept);
    const user = auth.currentUser;
    if (user) {
      const path = `users/${user.uid}/file-keeper/${id}_${safeName(name)}`;
      try { await uploadBytes(ref(storage, path), file, { contentType: kept.type, customMetadata: { id, originalName: name, savedAt: String(kept.savedAt), folderId: folderId || '' } }); }
      catch { setError('Saved on this device. Firebase backup failed; check your connection, sign-in, and Storage rules.'); }
    }
  };
  const addFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []); setBusy(true); setError('');
    try { for (const file of selected) await uploadKeptFile(file, file.name, activeFolderId === 'all' ? undefined : activeFolderId); await refresh(); }
    catch { setError('The device copy was saved, but Firebase backup failed. Check connection, sign-in, Storage rules, and available storage.'); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  };
  const createFolder = async () => {
    const name = folderName.trim(); if (!name) return;
    const folder = { id: makeId('folder'), name, createdAt: Date.now() };
    try { await saveFolderList([...folders, folder]); setFolderName(''); setActiveFolderId(folder.id); setError(''); }
    catch { setError('The folder was created on this device, but Firebase could not sync it.'); }
  };
  const fileBytes = async (file: KeptFile) => {
    if (file.blob) return new Uint8Array(await file.blob.arrayBuffer());
    if (file.cloudPath) { const bytes = await getBytes(ref(storage, file.cloudPath)); return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); }
    if (file.downloadURL) return new Uint8Array(await (await fetch(file.downloadURL)).arrayBuffer());
    throw new Error(`Could not read ${file.name}`);
  };
  const removeKeptFile = async (file: KeptFile) => {
    if (file.cloudPath) await deleteObject(ref(storage, file.cloudPath));
    await removeRecord(FILES_STORE, file.id);
  };
  const deleteSelected = async () => {
    const targets = visible.filter((file) => selectedIds.includes(file.id)); if (!targets.length) return;
    if (!window.confirm(`Delete ${targets.length} selected file${targets.length === 1 ? '' : 's'} from this device and Firebase?`)) return;
    setBusy(true); setError('');
    try { for (const file of targets) await removeKeptFile(file); setSelectedIds([]); await refresh(); }
    catch { setError('Some files could not be deleted from Firebase. The list has been refreshed so you can retry.'); await refresh(); }
    finally { setBusy(false); }
  };
  const moveSelected = async (folderId: string) => {
    const targets = visible.filter((file) => selectedIds.includes(file.id)); setBusy(true); setError('');
    try {
      for (const file of targets) {
        const destinationFolderId = folderId === 'all' ? undefined : folderId || undefined;
        const moved = { ...file, folderId: destinationFolderId };
        if (file.cloudPath) await updateMetadata(ref(storage, file.cloudPath), { customMetadata: { id: file.id, originalName: file.name, savedAt: String(file.savedAt), folderId: moved.folderId || '' } });
        await putRecord(FILES_STORE, { ...moved, blob: file.blob });
      }
      setSelectedIds([]); await refresh();
    } catch { setError('Files were not all moved. Check Firebase permissions and try again.'); await refresh(); }
    finally { setBusy(false); }
  };
  const compressSelected = async () => {
    const targets = visible.filter((file) => selectedIds.includes(file.id)); if (!targets.length) return;
    setBusy(true); setError('');
    try {
      const entries: Record<string, Uint8Array> = {};
      for (const file of targets) {
        let name = file.name; let suffix = 2;
        while (entries[name]) { const dot = file.name.lastIndexOf('.'); name = dot > 0 ? `${file.name.slice(0, dot)} (${suffix++})${file.name.slice(dot)}` : `${file.name} (${suffix++})`; }
        entries[name] = await fileBytes(file);
      }
      const archive = new File([zipSync(entries, { level: 6 })], `files_${new Date().toISOString().slice(0, 10)}.zip`, { type: 'application/zip' });
      await uploadKeptFile(archive, archive.name, activeFolderId === 'all' ? undefined : activeFolderId);
      setSelectedIds([]); await refresh();
    } catch { setError('The selected files could not be compressed.'); }
    finally { setBusy(false); }
  };
  const unzipFile = async (file: KeptFile) => {
    setBusy(true); setError('');
    try {
      const entries = unzipSync(await fileBytes(file));
      const folderId = activeFolderId === 'all' ? file.folderId : activeFolderId;
      let extracted = 0;
      for (const [archivePath, bytes] of Object.entries(entries)) {
        if (archivePath.endsWith('/')) continue;
        const name = archivePath.split('/').filter(Boolean).pop(); if (!name) continue;
        await uploadKeptFile(new File([bytes], name, { type: 'application/octet-stream' }), name, folderId); extracted++;
      }
      if (!extracted) setError('This ZIP archive did not contain any files to extract.');
      await refresh();
    } catch { setError('Could not unzip this file. It may be damaged or use an unsupported archive format.'); }
    finally { setBusy(false); }
  };
  const deleteFolder = async () => {
    const folder = folders.find((item) => item.id === activeFolderId); if (!folder) return;
    const folderFiles = files.filter((file) => file.folderId === folder.id);
    if (!window.confirm(`Delete the folder “${folder.name}”? Its ${folderFiles.length} file${folderFiles.length === 1 ? '' : 's'} will stay in All Files.`)) return;
    setBusy(true);
    try {
      for (const file of folderFiles) {
        const moved = { ...file, folderId: undefined };
        if (file.cloudPath) await updateMetadata(ref(storage, file.cloudPath), { customMetadata: { id: file.id, originalName: file.name, savedAt: String(file.savedAt), folderId: '' } });
        await putRecord(FILES_STORE, moved);
      }
      const next = folders.filter((item) => item.id !== folder.id);
      await removeRecord(FOLDERS_STORE, folder.id); await saveFolderList(next); setActiveFolderId('all'); await refresh();
    } catch { setError('The folder could not be deleted or synced. Try again.'); }
    finally { setBusy(false); }
  };
  const download = (file: KeptFile) => { const url = file.blob ? URL.createObjectURL(file.blob) : file.downloadURL; if (!url) return; const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); if (file.blob) window.setTimeout(() => URL.revokeObjectURL(url), 1000); };

  const visible = files.filter((file) => (activeFolderId === 'all' || file.folderId === activeFolderId) && file.name.toLowerCase().includes(query.toLowerCase()));
  const selectedCount = visible.filter((file) => selectedIds.includes(file.id)).length;
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  return <main className="max-w-6xl mx-auto px-4 py-6">
    <section className="rounded-3xl border border-[#ff3399]/50 bg-[#140410] p-5 sm:p-7 text-[#ffd6eb] shadow-[0_0_35px_rgba(255,51,153,0.18)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#ff3399]/25 pb-5 mb-5">
        <span className="rounded-2xl p-3 bg-[#00b4db]/20 text-cyan-200"><FolderOpen className="w-6 h-6" /></span>
        <div className="mr-auto"><h1 className="text-2xl font-bold text-white">File Keeper</h1><p className="text-sm text-white/60">Store, organize, compress, and extract files.</p></div>
        <button disabled={busy} onClick={() => inputRef.current?.click()} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff007f] to-[#ff3399] text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50"><Upload className="w-4 h-4" /> Add files</button>
        <input ref={inputRef} type="file" multiple onChange={addFiles} className="hidden" />
      </header>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => { setActiveFolderId('all'); setSelectedIds([]); }} className={`px-3 py-2 rounded-xl border text-xs font-semibold ${activeFolderId === 'all' ? 'bg-[#ff007f]/25 border-[#ff3399] text-white' : 'bg-white/5 border-white/10 text-white/70'}`}><FolderOpen className="w-4 h-4 inline mr-1.5" />All Files <span className="opacity-60">{files.length}</span></button>
        {folders.map((folder) => <button key={folder.id} onClick={() => { setActiveFolderId(folder.id); setSelectedIds([]); }} className={`px-3 py-2 rounded-xl border text-xs font-semibold ${activeFolderId === folder.id ? 'bg-[#ff007f]/25 border-[#ff3399] text-white' : 'bg-white/5 border-white/10 text-white/70'}`}><Folder className="w-4 h-4 inline mr-1.5" />{folder.name}<span className="opacity-60">{files.filter((file) => file.folderId === folder.id).length}</span></button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input aria-label="New folder name" value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void createFolder()} placeholder="New folder name" className="w-40 bg-[#0d030b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white" />
        <button disabled={!folderName.trim() || busy} onClick={() => void createFolder()} className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-300/20 text-cyan-100 text-xs flex items-center gap-1 disabled:opacity-40"><FolderPlus className="w-4 h-4" />Create folder</button>
        {activeFolder && <button disabled={busy} onClick={() => void deleteFolder()} className="px-3 py-2 rounded-xl bg-red-500/10 text-red-200 text-xs flex items-center gap-1"><Trash2 className="w-4 h-4" />Delete folder</button>}
        <label className="relative mb-0 ml-auto w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" /><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIds([]); }} placeholder="Search saved files" className="w-full rounded-xl bg-[#0d030b] border border-white/10 py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-[#ff3399]/60" /></label>
      </div>
      {selectedCount > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#00b4db]/10 border border-cyan-300/15 p-3 mb-4"><span className="text-xs text-cyan-100 mr-auto">{selectedCount} selected</span><select aria-label="Move selected files to folder" defaultValue="" onChange={(event) => { if (event.target.value !== '') void moveSelected(event.target.value); event.currentTarget.value = ''; }} className="bg-[#12040e] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"><option value="" disabled>Move to folder…</option><option value="all">All Files</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><button disabled={busy} onClick={() => void compressSelected()} className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-100 text-xs flex gap-1"><FileArchive className="w-3.5 h-3.5" />Compress ZIP</button><button disabled={busy} onClick={() => void deleteSelected()} className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-200 text-xs flex gap-1"><Trash2 className="w-3.5 h-3.5" />Delete selected</button><button onClick={() => setSelectedIds([])} className="p-1.5 rounded-lg hover:bg-white/10" title="Clear selection"><X className="w-4 h-4" /></button></div>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 border border-red-400/20 p-3 text-sm text-red-200">{error}</p>}
      {visible.length ? <><div className="mb-2"><label className="inline-flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={visible.length > 0 && selectedCount === visible.length} onChange={(event) => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...visible.map((file) => file.id)])] : selectedIds.filter((id) => !visible.some((file) => file.id === id)))} />Select all in this view</label></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{visible.map((file) => <article key={file.id} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3"><input aria-label={`Select ${file.name}`} type="checkbox" checked={selectedIds.includes(file.id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, file.id] : selectedIds.filter((id) => id !== file.id))} /><span className="shrink-0 rounded-xl bg-[#ff007f]/15 p-3 text-pink-200">{file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip') ? <FileArchive className="w-5 h-5" /> : <FileText className="w-5 h-5" />}</span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-white" title={file.name}>{file.name}</h2><p className="text-xs text-white/50">{formatSize(file.size)} · {new Date(file.savedAt).toLocaleDateString()} · {file.cloudPath ? 'Firebase + device' : 'Device copy'}</p></div>{file.name.toLowerCase().endsWith('.zip') && <button disabled={busy} onClick={() => void unzipFile(file)} className="p-2 rounded-lg hover:bg-white/10 text-pink-200" title="Unzip here"><ArchiveRestore className="w-4 h-4" /></button>}<button onClick={() => download(file)} className="p-2 rounded-lg hover:bg-white/10 text-cyan-200" title="Download"><Download className="w-4 h-4" /></button><button disabled={busy} onClick={async () => { if (window.confirm(`Remove “${file.name}” from File Keeper?`)) { try { await removeKeptFile(file); setSelectedIds((ids) => ids.filter((id) => id !== file.id)); await refresh(); } catch { setError('Could not delete the file from Firebase. Check Storage rules and try again.'); } } }} className="p-2 rounded-lg hover:bg-red-500/15 text-red-200" title="Delete"><Trash2 className="w-4 h-4" /></button></article>)}</div></> : <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/55"><FolderOpen className="w-9 h-9 mx-auto mb-2 opacity-40" /><p>{query ? 'No files match that search.' : activeFolder ? `No files in ${activeFolder.name} yet.` : 'No files saved yet. Add files or create folders to start.'}</p></div>}
      <p className="mt-5 text-xs text-white/40">Files and folders are stored on this device and backed up to Firebase for signed-in users. ZIPs can be created from selected files and extracted into the open folder.</p>
    </section>
  </main>;
};
