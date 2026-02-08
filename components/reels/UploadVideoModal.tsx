'use client';

import { useState, useRef } from 'react';
import { X, Upload, Check, Loader2, Film } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function UploadVideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      // Basit kontrol: Sadece video
      if (!selected.type.startsWith('video/')) {
        toast.error('Lütfen geçerli bir video dosyası seçin.');
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

      // 1. ADIM: Backend'den Yükleme İzni (URL) İste
      const response = await fetch('/api/video/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
      });

      if (!response.ok) throw new Error('Yükleme izni alınamadı.');
      const { uploadUrl, storagePath } = await response.json();

      // 2. ADIM: Videoyu Doğrudan R2'ye Yükle
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('R2 yüklemesi başarısız.');

      // 3. ADIM: Metadata'yı Supabase'e Kaydet
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı.');

      const publicUrl = `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${storagePath}`;

      // Video süresini (duration) almak için video elementinden okuyabiliriz
      // Şimdilik varsayılan 0 veya istemci tarafında hesaplanmış bir değer girilebilir.
      
      const { error: dbError } = await supabase.from('videos').insert({
        user_id: user.id,
        storage_path: storagePath,
        description: description,
        video_url: publicUrl, // Bu alanı schema.sql'e eklemek gerekebilir veya storage_path'den türetilir
        duration: 0, // İyileştirme: Video metadata'sından okunabilir
        status: 'ready' // Basitlik için direkt ready yapıyoruz
      });

      if (dbError) throw dbError;

      toast.success('Video başarıyla yüklendi!');
      onClose();
      router.refresh(); // Listeyi yenile

    } catch (error) {
      console.error(error);
      toast.error('Yükleme sırasında bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Film className="text-rose-500" /> Video Yükle
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          
          {/* Dosya Seçimi / Önizleme */}
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-rose-400 transition-all group"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={32} />
              </div>
              <p className="font-medium text-slate-600">Video Seçmek İçin Tıkla</p>
              <p className="text-xs text-slate-400 mt-1">MP4, MOV (Max 50MB)</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black h-64 flex items-center justify-center">
              <video src={previewUrl} controls className="max-h-full max-w-full" />
              <button 
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="video/*" 
            className="hidden" 
          />

          {/* Açıklama */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Açıklama</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Videon hakkında bir şeyler yaz... #etiket" 
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 resize-none h-24 text-sm"
            />
          </div>

          {/* Yükle Butonu */}
          <button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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