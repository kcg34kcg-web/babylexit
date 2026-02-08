'use client';

import { useState, useRef } from 'react';
import { X, Upload, Check, Loader2, Film, MapPin, Music, Clock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Örnek Müzik Listesi (Gerçek uygulamada bir API'den gelebilir)
const MUSIC_OPTIONS = [
  { id: '1', title: 'Space Walk', artist: 'Galaxy Vibes' },
  { id: '2', title: 'Moonlight Sonata', artist: 'Beethoven (Remix)' },
  { id: '3', title: 'Midnight City', artist: 'M83' },
  { id: '4', title: 'Astronaut in the Ocean', artist: 'Masked Wolf' },
  { id: '5', title: 'Interstellar Theme', artist: 'Hans Zimmer' },
];

export default function UploadVideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Yeni Alanlar
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('video/')) {
        toast.error('Lütfen geçerli bir video dosyası seçin.');
        return;
      }
      if (selected.size > 50 * 1024 * 1024) {
        toast.error('Video boyutu 50MB\'dan büyük olamaz.');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);

      // 1. Backend'den URL Al
      const response = await fetch('/api/video/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
      });

      if (!response.ok) throw new Error('Yükleme izni alınamadı.');
      const { uploadUrl, storagePath } = await response.json();

      // 2. R2'ye Yükle
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Video yüklenemedi.');

      // 3. Metadata Kaydet
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      const publicUrl = `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${storagePath}`;

      // Müzik verisi (Seçilmediyse Orijinal Ses)
      const musicData = selectedMusic 
        ? { title: selectedMusic.title, artist: selectedMusic.artist }
        : { title: 'Orijinal Ses', artist: `@${user.email?.split('@')[0]}` };

      const { error: dbError } = await supabase.from('videos').insert({
        user_id: user.id,
        storage_path: storagePath,
        video_url: publicUrl,
        description: description,
        location: location || null,  // Yeni alan
        music_meta: musicData,       // Yeni alan
        duration: 0,
        status: 'ready'
      });

      if (dbError) throw dbError;

      toast.success('Video başarıyla paylaşıldı!');
      onClose();
      window.location.reload();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Film className="text-rose-500" /> Yeni Reels
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* 1. Video Önizleme Alanı */}
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-rose-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-white/5 text-rose-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <p className="font-medium text-slate-300 text-sm">Video Seç</p>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-64 mx-auto border border-white/10 shadow-lg">
              <video src={previewUrl} className="w-full h-full object-cover" />
              <button 
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*" className="hidden" />

          {/* 2. Detay Alanları (Sadece video seçildiyse göster) */}
          {file && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              
              {/* Açıklama */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Açıklama</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Videon hakkında bir şeyler yaz... #etiket" 
                  className="w-full mt-1 p-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-rose-500/50 text-sm min-h-[80px]"
                />
              </div>

              {/* Konum */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                  <MapPin size={12} /> Konum Ekle
                </label>
                <div className="relative mt-1">
                  <input 
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Örn: İstanbul, Ay Üssü Alpha" 
                    className="w-full p-3 pl-10 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-rose-500/50 text-sm"
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                </div>
              </div>

              {/* Müzik Seçimi */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
                  <Music size={12} /> Müzik Ekle
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {MUSIC_OPTIONS.map((track) => (
                    <div 
                      key={track.id}
                      onClick={() => setSelectedMusic(track)}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer border transition-all ${
                        selectedMusic?.id === track.id 
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200' 
                          : 'bg-white/5 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <Music size={14} />
                        </div>
                        <div className="text-sm">
                          <p className="font-bold">{track.title}</p>
                          <p className="text-xs opacity-70">{track.artist}</p>
                        </div>
                      </div>
                      {selectedMusic?.id === track.id && <Check size={16} />}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Paylaş Butonu */}
          <button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 active:scale-95"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Yükleniyor...
              </>
            ) : (
              <>
                <Check size={20} /> Paylaş
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}