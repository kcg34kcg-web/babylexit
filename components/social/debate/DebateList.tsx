'use client';

import { useState, useEffect } from "react";
import { getDebateFeed } from "@/app/actions/debate";
import DebateCard from "./DebateCard";
import { RefreshCw } from "lucide-react";

export default function DebateList() {
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadDebates = async (currentPage: number) => {
    if (currentPage === 0) setLoading(true);
    
    try {
        const data = await getDebateFeed(currentPage);
        if (data.length === 0) {
            setHasMore(false);
        } else {
            // Eğer sayfa 0 ise (yenileme), eski veriyi sil yeni geleni koy.
            // Sayfa > 0 ise (daha fazla yükle), eski verinin üzerine ekle.
            setDebates(prev => currentPage === 0 ? data : [...prev, ...data]);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadDebates(0);
  }, []);

  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      loadDebates(nextPage);
  };

  if (loading) return (
    <div className="flex flex-col items-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Arenalar yükleniyor...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
       {debates.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
               <p className="text-slate-500 text-lg font-bold">Henüz bir münazara başlatılmamış.</p>
               <p className="text-slate-400 text-sm mt-2">İlk tartışmayı sen başlat!</p>
           </div>
       ) : (
           debates.map((debate) => (
               <DebateCard key={debate.id} debateData={debate} />
           ))
       )}

       {/* Daha Fazla Yükle Butonu */}
       {hasMore && debates.length > 0 && (
           <div className="flex justify-center pt-4">
               <button 
                 onClick={handleLoadMore}
                 className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 rounded-full text-slate-600 hover:text-amber-700 transition-all font-medium shadow-sm"
               >
                   <RefreshCw size={18} />
                   Daha Fazla Göster
               </button>
           </div>
       )}
    </div>
  );
}