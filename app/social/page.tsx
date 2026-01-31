"use client";

import { useState, useEffect } from "react";
import { 
  Search, Users, TrendingUp, ArrowLeft, 
  Image as ImageIcon, Send, X, Gavel,
  Home, ShoppingCart, Calendar, LogOut, Menu
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client";
import PostList from "@/components/PostList"; 
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function LexwoowPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showTransition, setShowTransition] = useState(true);
  
  // Akışı yenilemek için kullanılan anahtar
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
    const timer = setTimeout(() => setShowTransition(false), 1200);
    return () => clearTimeout(timer);
  }, [supabase]);

  const handlePost = async () => {
    if (!content && !file) return;
    setLoading(true);

    try {
      let imageUrl = null;
      if (file && user) {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1080 };
        const compressedFile = await imageCompression(file, options);
        const fileName = `${user.id}/${Date.now()}.webp`;
        await supabase.storage.from("post-attachments").upload(fileName, compressedFile);
        const { data } = supabase.storage.from("post-attachments").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content,
        image_url: imageUrl,
        category: "teori"
      });

      if (error) throw error;
      
      setContent("");
      setFile(null);
      setPreviewUrl(null);
      toast.success("Kürsüde paylaşıldı!");
      // Post atılınca listeyi yenile
      setRefreshKey(prev => prev + 1);

    } catch (error: any) {
      toast.error("Paylaşım başarısız.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-20 selection:bg-amber-100 font-sans">
      <Toaster position="top-center" />
      
      {/* --- GİRİŞ ANİMASYONU --- */}
      <AnimatePresence>
        {showTransition && (
          <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-white">
            <motion.div initial={{ rotate: -45, y: -50 }} animate={{ rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 300 }} className="text-amber-500">
              <Gavel size={100} />
            </motion.div>
            <h1 className="mt-6 text-2xl font-bold tracking-[0.4em] uppercase text-slate-100">Lexwoow</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER (Mobilde görünür, Desktopta Sidebar var) --- */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all active:scale-90">
            <ArrowLeft size={22} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Hukuk gündemini ara..." 
              className="w-full bg-slate-100/50 border border-slate-200 rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-amber-500/10 text-sm transition-all" 
            />
          </div>
        </div>
      </div>

      {/* --- ANA LAYOUT (Twitter Tarzı: Sol - Orta - Sağ) --- */}
      <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        
        {/* 1. SOL KOLON: NAVİGASYON (Sidebar) */}
        <div className="hidden lg:block lg:col-span-1">
           <div className="sticky top-8 space-y-6">
              {/* Logo Alanı */}
              <div className="px-4 mb-8 flex items-center gap-2 text-amber-600">
                 <Gavel size={32} />
                 <span className="font-bold text-2xl tracking-widest text-slate-900">LEXWOOW</span>
              </div>

              {/* Menü Linkleri */}
              <nav className="space-y-2">
                 <button onClick={() => setRefreshKey(prev => prev + 1)} className="flex items-center gap-4 px-6 py-4 text-xl font-bold text-slate-900 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-all w-full text-left">
                    <Home size={26} />
                    <span>WOOW</span>
                 </button>

                 <Link href="/market" className="flex items-center gap-4 px-6 py-4 text-xl font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-all w-full">
                    <ShoppingCart size={26} />
                    <span>Market</span>
                 </Link>

                 <button className="flex items-center gap-4 px-6 py-4 text-xl font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-all w-full text-left opacity-50 cursor-not-allowed">
                    <Calendar size={26} />
                    <span>Etkinlikler</span>
                 </button>
                 
                 {/* Ana Menüye Dönüş Butonu */}
                 <button onClick={() => router.push('/')} className="flex items-center gap-4 px-6 py-4 text-xl font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all w-full text-left mt-8">
                    <ArrowLeft size={26} />
                    <span>Ana Menü</span>
                 </button>
              </nav>

              {/* Post Butonu (Sidebar) */}
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg py-4 rounded-full shadow-lg shadow-amber-500/30 transition-all active:scale-95 mt-4"
              >
                Görüş Bildir
              </button>
           </div>
        </div>


        {/* 2. ORTA KOLON: AKIŞ VE PAYLAŞIM */}
        <div className="lg:col-span-2 space-y-8 pb-20">
          
          {/* Post Paylaşım Alanı */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm shadow-slate-200/50">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-white uppercase text-lg shadow-lg shadow-amber-500/20">
                {user?.email?.charAt(0) || "K"}
              </div>
              <div className="flex-1 space-y-4">
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  placeholder="Hukuki bir analiz paylaş veya bir mesele ortaya at..." 
                  className="w-full bg-transparent border-none outline-none resize-none text-slate-700 placeholder:text-slate-400 min-h-[100px] text-[16px] leading-relaxed pt-2" 
                />
                
                {previewUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 shadow-lg">
                    <button onClick={() => {setFile(null); setPreviewUrl(null);}} className="absolute top-3 right-3 bg-white/90 p-2 rounded-full hover:bg-white transition-colors text-slate-900 shadow-md backdrop-blur-md"><X size={16}/></button>
                    <img src={previewUrl} className="w-full max-h-[400px] object-cover" alt="Önizleme" />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <label className="cursor-pointer text-slate-400 hover:text-amber-600 p-2.5 rounded-xl hover:bg-amber-50 transition-all active:scale-90 flex items-center justify-center">
                    <ImageIcon size={24} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) {
                          setFile(selectedFile);
                          setPreviewUrl(URL.createObjectURL(selectedFile));
                        }
                      }} 
                    />
                  </label>
                  <button 
                    onClick={handlePost} 
                    disabled={loading || (!content && !file)} 
                    className="bg-slate-900 hover:bg-black text-white px-8 py-2.5 rounded-2xl font-bold text-[14px] flex items-center gap-2 transition-all active:scale-95 disabled:opacity-20 shadow-xl shadow-slate-900/10"
                  >
                    {loading ? "..." : <><Send size={16} /> Paylaş</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Akış Başlığı */}
          <div className="flex items-center gap-3 px-2">
             <div className="h-[1px] flex-1 bg-slate-200"></div>
             <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black">
               <TrendingUp size={14} className="text-amber-500" />
               <span>Kürsü Akışı</span>
             </div>
             <div className="h-[1px] flex-1 bg-slate-200"></div>
          </div>

          {/* Post Listesi (Akıllı Feed Entegrasyonu İçin Hazır) */}
          <PostList key={refreshKey} userId={user?.id} />
          
        </div>


        {/* 3. SAĞ KOLON: GÜNDEM VE GRUPLAR (Masaüstü Sadece) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            
             {/* Arama Barı (Desktop) */}
             <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Ara..." 
                  className="w-full bg-white border border-slate-200 rounded-full py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm shadow-sm" 
                />
             </div>

            {/* AKTİF GRUPLAR */}
            <div className="bg-white border border-slate-200/80 rounded-[1.5rem] p-6 shadow-sm shadow-slate-200/50">
              <h3 className="font-black text-[11px] mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                <Users size={18} className="text-amber-500" /> Aktif Gruplar
              </h3>
              <div className="space-y-6">
                {["#MedipolHukuk-3", "#FikriMülkiyet-Atölye", "#StajyerAvukatlar"].map((g) => (
                  <div key={g} className="group cursor-pointer">
                    <p className="text-[14px] font-bold text-slate-700 group-hover:text-amber-600 transition-colors">{g}</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Meslektaşlar tartışıyor</p>
                  </div>
                ))}
              </div>
            </div>

            {/* GÜNCEL KONULAR */}
            <div className="bg-[#f1f5f9] border border-slate-200/50 rounded-[1.5rem] p-6 shadow-sm">
              <h3 className="font-black text-[11px] text-slate-500 mb-5 flex items-center gap-2 uppercase tracking-widest">
                <TrendingUp size={16} className="text-amber-500" /> Güncel Konular
              </h3>
              <div className="space-y-5">
                {[
                  "Yapay Zeka ve Sorumluluk",
                  "E-Ticaret Kanunu",
                  "KVKK Yönetmelik",
                  "Fikri Mülkiyet Yarışması"
                ].map((konu) => (
                  <div key={konu} className="cursor-pointer group flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 opacity-0 group-hover:opacity-100 transition-all"></div>
                      <p className="text-[12px] text-slate-600 group-hover:text-slate-900 group-hover:translate-x-1 transition-all font-semibold">
                       {konu}
                      </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}