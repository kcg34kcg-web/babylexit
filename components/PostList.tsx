"use client";

import { motion } from "framer-motion";
import { 
  Scale, 
  ThumbsDown, 
  Flame, 
  MessageSquare 
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// --- ÖZEL EFEKT TANIMLARI ---
const animations = {
  wow: { clicked: { scale: [1, 1.6, 1], rotate: [0, 20, -20, 0], transition: { duration: 0.4 } } },
  dow: { clicked: { y: [0, 10, 0], transition: { duration: 0.2 } } },
  adil: { clicked: { rotate: [0, -30, 30, -15, 15, 0], transition: { duration: 0.6 } } },
};

export default function PostList() {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id ( full_name, avatar_url )
        `)
        .order("created_at", { ascending: false });
      
      if (!error) {
        setPosts(data || []);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [supabase]);

  if (loading) return <div className="text-center py-10 text-slate-400 text-xs tracking-widest font-bold uppercase">Kürsü Hazırlanıyor...</div>;

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-slate-300/50">
          
          {/* ÜST KISIM: Profil Bilgisi */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-sm font-bold shadow-md text-white uppercase">
                {post.profiles?.full_name?.charAt(0) || "B"}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{post.profiles?.full_name || "Meslektaş"}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-sans">#{post.category || "Genel"}</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium italic">
              {new Date(post.created_at).toLocaleDateString("tr-TR")}
            </span>
          </div>

          {/* İÇERİK: Mesaj ve Varsa Resim */}
          <div className="p-5 space-y-4">
            <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap font-normal">
              {post.content}
            </p>
            
            {post.image_url && (
              <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
                <Image 
                  src={post.image_url} 
                  alt="Analiz Görseli" 
                  fill 
                  className="object-cover" 
                />
              </div>
            )}
          </div>

          {/* ALT KISIM: Reaksiyonlar */}
          <div className="px-2 py-3 bg-slate-50/50 flex items-center justify-around border-t border-slate-100/50">
            
            <button className="flex flex-col items-center gap-1 group">
              <motion.div whileTap="clicked" variants={animations.wow} className="p-2 rounded-full group-hover:bg-amber-100/50 transition-colors">
                <Flame size={20} className="text-slate-400 group-hover:text-amber-500" />
              </motion.div>
              <span className="text-[9px] text-slate-400 group-hover:text-amber-600 uppercase font-black tracking-tighter">Woow</span>
            </button>

            <button className="flex flex-col items-center gap-1 group">
              <motion.div whileTap="clicked" variants={animations.dow} className="p-2 rounded-full group-hover:bg-red-100/50 transition-colors">
                <ThumbsDown size={20} className="text-slate-400 group-hover:text-red-500" />
              </motion.div>
              <span className="text-[9px] text-slate-400 group-hover:text-red-600 uppercase font-black tracking-tighter">Doow</span>
            </button>

            <button className="flex flex-col items-center gap-1 group">
              <motion.div whileTap="clicked" variants={animations.adil} className="p-2 rounded-full group-hover:bg-blue-100/50 transition-colors">
                <Scale size={20} className="text-slate-400 group-hover:text-blue-500" />
              </motion.div>
              <span className="text-[9px] text-slate-400 group-hover:text-blue-600 uppercase font-black tracking-tighter">Adil</span>
            </button>

            <button className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-full group-hover:bg-slate-200/60 transition-colors">
                <MessageSquare size={20} className="text-slate-400 group-hover:text-slate-800" />
              </div>
              <span className="text-[9px] text-slate-400 group-hover:text-slate-800 uppercase font-black tracking-tighter">Müzakere</span>
            </button>

          </div>
        </div>
      ))}
    </div>
  );
}