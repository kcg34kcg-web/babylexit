"use client";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client"; 
// Yeni İkonlar
import { Calendar, MapPin, X, Image as ImageIcon, Loader2 } from "lucide-react"; 
import { cn } from "@/utils/cn";

export default function CreatePost({ userId }: { userId: string }) {
  // --- MEVCUT STATE'LER (KORUNDU) ---
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // --- YENİ STATE'LER (FAZ 5 İÇİN EKLENDİ) ---
  const [isEventMode, setIsEventMode] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const supabase = createClient();

  const handleUpload = async () => {
    // Validasyonlar
    if (!content) return alert("Hukuki bir şeyler yazmalısın!");
    if (isEventMode && !eventDate) return alert("Etkinlik için bir tarih seçmelisin!");

    setLoading(true);

    try {
      let imageUrl = null;

      if (file) {
        // --- ADIM 1: GÖRSEL SIKIŞTIRMA (KORUNDU) ---
        const options = {
          maxSizeMB: 0.2, // Orijinal ayarınız: 200KB
          maxWidthOrHeight: 1080,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        // --- ADIM 2: SUPABASE STORAGE (KORUNDU) ---
        const fileName = `${userId}/${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("post-attachments")
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("post-attachments")
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      // --- ADIM 3: VERİTABANINA KAYDETME (GÜNCELLENDİ) ---
      // Orijinal veriler + Yeni Event verileri
      const payload: any = {
        user_id: userId,
        content: content,
        image_url: imageUrl,
        category: "teori", // Orijinal kategori
        
        // Yeni Alanlar (Sadece Event Modundaysa dolar)
        is_event: isEventMode,
        event_date: isEventMode ? new Date(eventDate).toISOString() : null,
        event_location: isEventMode && eventLocation ? { name: eventLocation } : null,
        event_status: isEventMode ? 'upcoming' : null
      };

      const { error: dbError } = await supabase.from("posts").insert(payload);

      if (dbError) throw dbError;

      // Temizlik
      alert("Paylaşım Kürsüye eklendi!");
      setContent("");
      setFile(null);
      setIsEventMode(false);
      setEventDate("");
      setEventLocation("");
      
      // Sayfayı yenile (Opsiyonel, verinin hemen görünmesi için)
      window.location.reload();

    } catch (error) {
      console.error("Hata:", error);
      alert("Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // ORİJİNAL DARK MODE STİLİ KORUNDU (bg-slate-900)
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4 transition-all">
      
      <textarea
        className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[100px]"
        placeholder={isEventMode ? "Etkinlik detaylarını ve amacını açıkla..." : "Hukuki bir analiz paylaş veya topluluğa danış..."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* --- YENİ: ETKİNLİK DETAY FORMU (Dark Mode Uyumlu) --- */}
      {isEventMode && (
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">
            <span>🎟️ Etkinlik Biletini Oluştur</span>
            <button onClick={() => setIsEventMode(false)} className="hover:bg-slate-700 p-1 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tarih Seçici */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Calendar size={16} />
              </div>
              <input 
                type="datetime-local"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none [color-scheme:dark]"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            {/* Konum Seçici */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <MapPin size={16} />
              </div>
              <input 
                type="text"
                placeholder="Konum (Örn: Hukuk Fakültesi)"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-500"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Alt Araç Çubuğu */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        
        <div className="flex items-center gap-2">
          {/* Dosya Yükleme Butonu (Tasarım İyileştirildi) */}
          <label className={cn(
            "p-2 rounded-full cursor-pointer transition-colors",
            file ? "bg-green-500/20 text-green-400" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          )}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <ImageIcon size={20} />
          </label>

          {/* YENİ: Etkinlik Modu Butonu */}
          <button 
            onClick={() => setIsEventMode(!isEventMode)}
            className={cn(
              "p-2 rounded-full transition-colors",
              isEventMode 
                ? "bg-blue-500/20 text-blue-400 shadow-inner" 
                : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            )}
            title="Etkinlik Oluştur"
          >
            <Calendar size={20} />
          </button>
        </div>
        
        {/* Paylaş Butonu */}
        <button
          onClick={handleUpload}
          disabled={loading || !content}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {isEventMode ? "Bileti Bas" : (loading ? "Paylaşılıyor..." : "Paylaş")}
        </button>
      </div>

      {/* Dosya Önizleme Feedback */}
      {file && (
        <div className="text-xs text-green-400 flex items-center gap-1 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Görsel eklendi: {file.name.slice(0, 20)}...
        </div>
      )}
    </div>
  );
}