import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Upload, Save, RefreshCw, Trash2, File as FileIcon, Type, Palette, FileText, Image as ImageIcon } from 'lucide-react';
import { auth, db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface ScratchpadAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface ScratchpadFont {
  id: string;
  name: string;
  url: string;
}

export interface ScratchpadColorPalette {
  id: string;
  name: string;
  colors: string[]; // hex codes
  imageUrl?: string;
  notes?: string;
}

export interface ScratchpadData {
  text: string;
  attachments: ScratchpadAttachment[];
  fonts: ScratchpadFont[];
  palettes: ScratchpadColorPalette[];
}

interface ScratchpadViewProps {
  onBack?: () => void;
}

type SubTab = 'notes' | 'fonts' | 'colors';

export const ScratchpadView: React.FC<ScratchpadViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SubTab>('notes');
  const [data, setData] = useState<ScratchpadData>({
    text: '',
    attachments: [],
    fonts: [],
    palettes: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const colorImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const localData = localStorage.getItem('colorpop_scratchpad');
      if (localData) {
        setData(JSON.parse(localData));
      }
    } catch (e) {
      console.error('Failed to parse local scratchpad data', e);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'scratchpads', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().scratchpadData) {
            const remoteData = docSnap.data().scratchpadData as ScratchpadData;
            setData(remoteData);
            localStorage.setItem('colorpop_scratchpad', JSON.stringify(remoteData));
          }
        } catch (e: unknown) {
          console.error('Failed to fetch remote scratchpad data', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      localStorage.setItem('colorpop_scratchpad', JSON.stringify(data));

      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'scratchpads', user.uid), { scratchpadData: data }, { merge: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save scratchpad.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setData((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }));
  };

  const handleRemoveFont = (id: string) => {
    setData((prev) => ({ ...prev, fonts: prev.fonts.filter((f) => f.id !== id) }));
  };

  const handleRemovePalette = (id: string) => {
    setData((prev) => ({ ...prev, palettes: prev.palettes.filter((p) => p.id !== id) }));
  };

  const uploadFile = async (file: File, type: 'attachment' | 'font' | 'image'): Promise<{ url: string, name: string, type: string }> => {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be logged in to upload files.");
    const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const storageRef = ref(storage, `scratchpads/${user.uid}/${id}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, name: file.name, type: file.type || 'application/octet-stream' };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true); setError(null);
    try {
      const newAttachments: ScratchpadAttachment[] = [];
      for (const file of files) {
        const { url, name, type } = await uploadFile(file, 'attachment');
        newAttachments.push({ id: `att_${Date.now()}`, url, name, type });
      }
      setData((prev) => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true); setError(null);
    try {
      const newFonts: ScratchpadFont[] = [];
      for (const file of files) {
        const { url, name } = await uploadFile(file, 'font');
        newFonts.push({ id: `font_${Date.now()}`, url, name });
      }
      setData((prev) => ({ ...prev, fonts: [...prev.fonts, ...newFonts] }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Font upload failed.');
    } finally {
      setIsUploading(false);
      if (fontInputRef.current) fontInputRef.current.value = '';
    }
  };

  const handlePaletteImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true); setError(null);
    try {
      const { url } = await uploadFile(files[0], 'image');
      const newPalette: ScratchpadColorPalette = {
        id: `palette_${Date.now()}`,
        name: files[0].name,
        colors: [],
        imageUrl: url,
      };
      setData((prev) => ({ ...prev, palettes: [...prev.palettes, newPalette] }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setIsUploading(false);
      if (colorImageInputRef.current) colorImageInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in flex flex-col h-[calc(100vh-6rem)] min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Edit2 className="w-6 h-6 text-[#ff007f]" />
            Scratchpad
          </h1>
          <p className="text-sm text-[#ffd6eb]/70 mt-1">
            Save thoughts, ideas, lore, fonts, and color palettes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <button
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff007f]/20 hover:bg-[#ff007f]/30 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-[#ff3399]/30 pb-2">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'notes' ? 'bg-[#ff007f]/20 text-white border border-[#ff007f]/50' : 'text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'}`}
        >
          <FileText className="w-4 h-4" /> Notes
        </button>
        <button
          onClick={() => setActiveTab('fonts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'fonts' ? 'bg-[#ff007f]/20 text-white border border-[#ff007f]/50' : 'text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'}`}
        >
          <Type className="w-4 h-4" /> Fonts
        </button>
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'colors' ? 'bg-[#ff007f]/20 text-white border border-[#ff007f]/50' : 'text-[#ffd6eb]/70 hover:text-white hover:bg-white/5'}`}
        >
          <Palette className="w-4 h-4" /> Colors
        </button>
      </div>

      <div className="flex flex-col flex-1 gap-4 overflow-y-auto">
        {activeTab === 'notes' && (
          <div className="flex flex-col flex-1 gap-4">
            <textarea
              value={data.text}
              onChange={(e) => setData({ ...data, text: e.target.value })}
              placeholder="Start typing your ideas here..."
              className="w-full flex-1 min-h-[200px] bg-[#140410] border border-[#ff3399]/40 rounded-2xl p-4 text-[#ffd6eb] placeholder-[#ffd6eb]/30 focus:outline-none focus:border-[#ff007f] resize-none leading-relaxed transition-colors shadow-inner"
            />
            <div className="bg-[#140410] border border-[#ff3399]/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Attachments</h2>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-[#ff99cc] hover:text-white transition-colors bg-[#ff007f]/10 hover:bg-[#ff007f]/20 px-3 py-1.5 rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5" /> Add files
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFileUpload} disabled={isUploading} />
              </div>
              {isUploading && <div className="flex justify-center py-2 text-[#ff99cc] text-xs"><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Uploading...</div>}
              {data.attachments.length === 0 ? (
                <div className="text-center py-8 text-[#ffd6eb]/40 border-2 border-dashed border-[#ff3399]/20 rounded-xl"><p className="text-sm">No attachments yet.</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {data.attachments.map((attachment) => (
                    <div key={attachment.id} className="relative group bg-[#1b0517] rounded-xl border border-[#ff3399]/20 p-2 overflow-hidden flex flex-col h-32">
                      <div className="flex-1 flex items-center justify-center min-h-0">
                        {attachment.type.startsWith('image/') ? (
                          <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-full object-contain rounded" />
                        ) : (
                          <FileIcon className="w-8 h-8 text-[#ff66b2]/60" />
                        )}
                      </div>
                      <div className="mt-2 text-[10px] truncate text-center text-[#ffd6eb]/70 bg-black/40 px-1 py-0.5 rounded">{attachment.name}</div>
                      <button onClick={() => handleRemoveAttachment(attachment.id)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 text-white"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="flex flex-col flex-1 gap-4">
            <div className="bg-[#140410] border border-[#ff3399]/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Your Fonts</h2>
                <button
                  onClick={() => fontInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-[#ff99cc] hover:text-white transition-colors bg-[#ff007f]/10 hover:bg-[#ff007f]/20 px-3 py-1.5 rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Font
                </button>
                <input type="file" ref={fontInputRef} className="hidden" multiple accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} disabled={isUploading} />
              </div>
              {isUploading && <div className="flex justify-center py-2 text-[#ff99cc] text-xs"><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Uploading...</div>}
              {data.fonts.length === 0 ? (
                <div className="text-center py-8 text-[#ffd6eb]/40 border-2 border-dashed border-[#ff3399]/20 rounded-xl"><p className="text-sm">No fonts uploaded yet.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.fonts.map((font) => (
                    <div key={font.id} className="relative group bg-[#1b0517] rounded-xl border border-[#ff3399]/20 p-4">
                      <style dangerouslySetInnerHTML={{ __html: `@font-face { font-family: '${font.id}'; src: url('${font.url}'); }` }} />
                      <div style={{ fontFamily: font.id }} className="text-xl text-white truncate mb-2">The quick brown fox jumps over the lazy dog</div>
                      <div className="text-xs text-[#ffd6eb]/70 truncate">{font.name}</div>
                      <button onClick={() => handleRemoveFont(font.id)} className="absolute top-2 right-2 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 text-white"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="flex flex-col flex-1 gap-4">
            <div className="bg-[#140410] border border-[#ff3399]/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Color Palettes</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newPalette: ScratchpadColorPalette = { id: `palette_${Date.now()}`, name: 'New Palette', colors: ['#ff007f'] };
                      setData((prev) => ({ ...prev, palettes: [...prev.palettes, newPalette] }));
                    }}
                    className="flex items-center gap-2 text-xs text-[#ff99cc] hover:text-white transition-colors bg-[#ff007f]/10 hover:bg-[#ff007f]/20 px-3 py-1.5 rounded-lg"
                  >
                    Add Palette
                  </button>
                  <button
                    onClick={() => colorImageInputRef.current?.click()}
                    className="flex items-center gap-2 text-xs text-[#ff99cc] hover:text-white transition-colors bg-[#ff007f]/10 hover:bg-[#ff007f]/20 px-3 py-1.5 rounded-lg"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Image
                  </button>
                </div>
                <input type="file" ref={colorImageInputRef} className="hidden" accept="image/*" onChange={handlePaletteImageUpload} disabled={isUploading} />
              </div>
              {isUploading && <div className="flex justify-center py-2 text-[#ff99cc] text-xs"><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Uploading...</div>}
              {data.palettes.length === 0 ? (
                <div className="text-center py-8 text-[#ffd6eb]/40 border-2 border-dashed border-[#ff3399]/20 rounded-xl"><p className="text-sm">No palettes yet.</p></div>
              ) : (
                <div className="flex flex-col gap-4">
                  {data.palettes.map((palette) => (
                    <div key={palette.id} className="relative bg-[#1b0517] rounded-xl border border-[#ff3399]/20 p-4">
                      <button onClick={() => handleRemovePalette(palette.id)} className="absolute top-2 right-2 p-1 text-[#ff99cc] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      <input
                        type="text"
                        value={palette.name}
                        onChange={(e) => setData((prev) => ({ ...prev, palettes: prev.palettes.map((p) => p.id === palette.id ? { ...p, name: e.target.value } : p) }))}
                        className="bg-transparent border-none text-white font-semibold mb-3 focus:outline-none focus:ring-1 focus:ring-[#ff007f] rounded"
                      />
                      <div className="flex gap-4">
                        {palette.imageUrl && (
                          <img src={palette.imageUrl} alt="Palette reference" className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                        )}
                        <div className="flex-1">
                           <div className="flex flex-wrap gap-2 mb-2">
                             {palette.colors.map((color, idx) => (
                               <div key={idx} className="flex flex-col items-center">
                                 <div className="w-8 h-8 rounded border border-white/20" style={{ backgroundColor: color }} />
                                 <input
                                   type="text"
                                   value={color}
                                   onChange={(e) => {
                                     const newColors = [...palette.colors];
                                     newColors[idx] = e.target.value;
                                     setData((prev) => ({ ...prev, palettes: prev.palettes.map((p) => p.id === palette.id ? { ...p, colors: newColors } : p) }));
                                   }}
                                   className="mt-1 w-16 bg-black/40 text-white text-[10px] text-center border-none rounded p-0.5 focus:outline-none"
                                 />
                               </div>
                             ))}
                             <button
                               onClick={() => {
                                 const newColors = [...palette.colors, '#ffffff'];
                                 setData((prev) => ({ ...prev, palettes: prev.palettes.map((p) => p.id === palette.id ? { ...p, colors: newColors } : p) }));
                               }}
                               className="w-8 h-8 rounded border border-dashed border-[#ff99cc]/50 flex items-center justify-center text-[#ff99cc] hover:bg-white/5"
                             >
                               +
                             </button>
                           </div>
                           <textarea
                             value={palette.notes || ''}
                             onChange={(e) => setData((prev) => ({ ...prev, palettes: prev.palettes.map((p) => p.id === palette.id ? { ...p, notes: e.target.value } : p) }))}
                             placeholder="Notes for this palette..."
                             className="w-full bg-black/20 border border-white/5 rounded p-2 text-xs text-[#ffd6eb] resize-none h-16 focus:outline-none focus:border-[#ff007f]/50"
                           />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
