import Link from "next/link";
import { FolderHeart, Sparkles } from "lucide-react";

export default function QuickAccessFolders() {
  return (
    <div className="mt-6 mb-2"> {/* Padding kaldırıldı, margin ayarlandı */}
      <div className="flex gap-4"> {/* Gap arttırıldı */}
        
        {/* Favoriler Dosyası */}
        <Link href="/favorites" className="flex-1 group">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-500/50 shadow-lg relative overflow-hidden transition-all group-hover:-translate-y-1">
             
             {/* Arka Plan Dekoru (Dark Mode Uyumlu) */}
             <div className="absolute -right-4 -bottom-4 bg-amber-500/10 rounded-full w-24 h-24 blur-xl group-hover:bg-amber-500/20 transition-all duration-500"></div>

             <div className="relative z-10 flex flex-col items-start">
                <div className="bg-slate-800 p-2.5 rounded-xl shadow-inner mb-3 text-amber-500 border border-slate-700">
                   <FolderHeart size={24} />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Favorilerim</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Kaydettiğin tartışmalar</p>
             </div>
          </div>
        </Link>

        {/* Lexwoow Özel */}
        <Link href="/lexwoow" className="flex-1 group">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-purple-500/50 shadow-lg relative overflow-hidden transition-all group-hover:-translate-y-1">
             
             <div className="absolute -right-4 -bottom-4 bg-purple-500/10 rounded-full w-24 h-24 blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>

             <div className="relative z-10 flex flex-col items-start">
                <div className="bg-slate-800 p-2.5 rounded-xl shadow-inner mb-3 text-purple-500 border border-slate-700">
                   <Sparkles size={24} />
                </div>
                <h3 className="font-bold text-slate-100 text-base">Lexwoow AI</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Yapay zeka analizleri</p>
             </div>
          </div>
        </Link>

      </div>
    </div>
  );
}