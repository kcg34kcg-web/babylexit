"use client";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client"; // Kendi supabase client yolunu kullan

export default function CreatePost({ userId }: { userId: string }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleUpload = async () => {
    if (!content) return alert("Hukuki bir şeyler yazmalısın!");
    setLoading(true);

    try {
      let imageUrl = null;

      if (file) {
        // --- ADIM 1: GÖRSEL SIKIŞTIRMA ---
        const options = {
          maxSizeMB: 0.2, // 200KB hedefliyoruz
          maxWidthOrHeight: 1080,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        // --- ADIM 2: SUPABASE STORAGE'A YÜKLEME ---
        const fileName = `${userId}/${Date.now()}.webp`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-attachments")
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        // Public URL'i al
        const { data: urlData } = supabase.storage
          .from("post-attachments")
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      // --- ADIM 3: VERİTABANINA KAYDETME ---
      const { error: dbError } = await supabase.from("posts").insert({
        user_id: userId,
        content: content,
        image_url: imageUrl,
        category: "teori", // Varsayılan kategori
      });

      if (dbError) throw dbError;

      alert("Paylaşım Kürsüye eklendi!");
      setContent("");
      setFile(null);
    } catch (error) {
      console.error("Hata:", error);
      alert("Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
      <textarea
        className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Hukuki bir analiz paylaş veya topluluğa danış..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      
      <div className="flex items-center justify-between">
        <input
          type="file"
          accept="image/*"
          className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        
        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
        >
          {loading ? "Paylaşılıyor..." : "Paylaş"}
        </button>
      </div>
    </div>
  );
}
