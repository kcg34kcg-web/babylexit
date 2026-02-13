// app/editor/page.tsx
'use client';

import { useState } from 'react';
import TextEditor from '@/components/Lexgeeditor';
import { 
  FolderOpen, Search, Sparkles, Calculator, 
  ChevronLeft, ChevronRight, FileText, Settings,
  Menu, X, Briefcase, Clock, Layout, File, Loader2
} from 'lucide-react';

export default function EditorPage() {
  // --- PANEL DURUMLARI ---
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'ai' | 'tools'>('search');

  // --- ARAMA MANTIĞI VE STATE'LER ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/legal-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Arama hatası:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* --- SOL PANEL: DOSYA GEZGİNİ --- */}
      <aside 
        className={`${
          leftOpen ? 'w-64' : 'w-0'
        } bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden relative`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-amber-500 flex items-center gap-2">
            <Briefcase size={18} /> Dosyalarım
          </span>
          <button onClick={() => setLeftOpen(false)} className="hover:bg-slate-800 p-1 rounded">
             <ChevronLeft size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <FolderItem name="2024/105 Esas - Boşanma" active />
          <FolderItem name="Arabuluculuk Dosyaları" />
          <FolderItem name="Şirket Sözleşmeleri" />
          
          <div className="pt-4 pb-2 text-xs font-bold text-slate-500 uppercase px-2">Son Kullanılanlar</div>
          <FileItem name="Cevap Dilekçesi Taslak.lexge" />
          <FileItem name="Delil Listesi.docx" />
        </div>

        <div className="p-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
            <span>v1.0.2 Beta</span>
            <Settings size={14} className="cursor-pointer hover:text-white"/>
        </div>
      </aside>

      {/* --- ORTA PANEL: ANA EDİTÖR --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        
        {/* Üst Bar */}
        <header className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            {!leftOpen && (
              <button onClick={() => setLeftOpen(true)} className="text-slate-400 hover:text-white">
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-400">
               <span className="opacity-50">Dosyalar</span>
               <span>/</span>
               <span className="opacity-50 text-xs">2024/105 Esas</span>
               <span>/</span>
               <span className="text-white font-medium flex items-center gap-2 text-xs">
                 <FileText size={14} className="text-amber-500"/>
                 Cevap Dilekçesi.lexge
               </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {!rightOpen && (
               <button 
                onClick={() => setRightOpen(true)} 
                className="flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
               >
                 <Sparkles size={14} className="text-amber-400" />
                 <span>Asistanı Aç</span>
               </button>
             )}
          </div>
        </header>

        {/* Editör Sahnesi */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-8 bg-slate-950">
           <div className="max-w-5xl mx-auto h-full">
              <TextEditor />
           </div>
        </div>
      </main>

      {/* --- SAĞ PANEL: AKILLI ASİSTAN (THE BRAIN) --- */}
      <aside 
        className={`${
          rightOpen ? 'w-80' : 'w-0'
        } bg-slate-900 border-l border-slate-800 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl z-20`}
      >
        {/* Sekmeler */}
        <div className="flex border-b border-slate-800 bg-slate-950">
           <TabButton 
              icon={Search} 
              label="Araştırma" 
              active={activeTab === 'search'} 
              onClick={() => setActiveTab('search')} 
           />
           <TabButton 
              icon={Sparkles} 
              label="AI Asistan" 
              active={activeTab === 'ai'} 
              onClick={() => setActiveTab('ai')} 
           />
           <TabButton 
              icon={Calculator} 
              label="Araçlar" 
              active={activeTab === 'tools'} 
              onClick={() => setActiveTab('tools')} 
           />
           <button onClick={() => setRightOpen(false)} className="px-3 hover:bg-red-500/20 hover:text-red-500 transition-colors">
              <X size={16} />
           </button>
        </div>

        {/* Panel İçeriği */}
        <div className="flex-1 overflow-y-auto p-4">
           {activeTab === 'search' && (
              <div className="space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Mevzuat veya İçtihat ara..." 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-amber-500" size={16} />}
                 </div>
                 
                 <div className="space-y-3">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-amber-500/50 transition-colors cursor-pointer group">
                           <h5 className="text-xs font-bold text-amber-500 mb-1">{result.title}</h5>
                           <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{result.content}</p>
                           <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">Metne Ekle</span>
                           </div>
                        </div>
                      ))
                    ) : (
                      !isSearching && (
                        <div className="text-center py-10 text-slate-500 text-sm">
                          <Layout size={40} className="mx-auto mb-3 opacity-20" />
                          <p>Hukuki arama yapmak için anahtar kelime yazıp Enter'a basın.</p>
                        </div>
                      )
                    )}
                 </div>
              </div>
           )}

           {activeTab === 'ai' && (
              <div className="space-y-4">
                 <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-200">
                    🤖 <strong>AI Hazır:</strong> Metninizdeki riskleri analiz edebilir veya özetleyebilirim.
                 </div>
                 <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-lg text-left text-sm transition-colors flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Dilekçeyi Analiz Et
                 </button>
                 <button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-lg text-left text-sm transition-colors flex items-center gap-2">
                    <FileText size={16} className="text-blue-400" />
                    Hukuki Dile Çevir
                 </button>
              </div>
           )}

           {activeTab === 'tools' && (
              <div className="space-y-4">
                 <ToolCard icon={Calculator} title="Faiz Hesaplama" desc="Yasal ve temerrüt faizi" />
                 <ToolCard icon={Clock} title="Süre Hesaplayıcı" desc="İstinaf ve cevap süreleri" />
              </div>
           )}
        </div>
      </aside>

    </div>
  );
}

// --- Yardımcı Bileşenler (KOD SİLMEYİ BIRAKTIM, HEPSİ BURADA) ---

const FolderItem = ({ name, active = false }: { name: string, active?: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${active ? 'bg-amber-500/10 text-amber-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <FolderOpen size={16} className={active ? 'text-amber-500' : 'text-slate-500'} />
    <span className="truncate">{name}</span>
  </div>
);

const FileItem = ({ name }: { name: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
    <File size={14} className="text-slate-500" />
    <span className="truncate">{name}</span>
  </div>
);

const TabButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-3 text-[10px] font-medium transition-colors border-b-2 gap-1 ${
      active 
        ? 'border-amber-500 text-amber-500 bg-slate-900' 
        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const ToolCard = ({ icon: Icon, title, desc }: any) => (
  <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-600 cursor-pointer transition-all">
    <div className="p-2 bg-slate-900 rounded-md text-slate-400">
      <Icon size={20} />
    </div>
    <div>
      <h4 className="text-sm font-medium text-slate-200">{title}</h4>
      <p className="text-[10px] text-slate-500">{desc}</p>
    </div>
  </div>
);