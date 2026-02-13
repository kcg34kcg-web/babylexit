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
    // ANA ARKAPLAN: Ferah bir görünüm için açık gri/beyaz tonu
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* --- SOL PANEL: DOSYA GEZGİNİ (Lacivert - Navy) --- */}
      <aside 
        className={`${
          leftOpen ? 'w-64' : 'w-0'
        } bg-[#0A1128] border-r border-[#1A2652] transition-all duration-300 flex flex-col overflow-hidden relative shadow-xl z-20`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-bold text-orange-500 flex items-center gap-2">
            <Briefcase size={18} /> Dosyalarım
          </span>
          <button onClick={() => setLeftOpen(false)} className="hover:bg-white/10 text-slate-300 p-1 rounded transition-colors">
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

        <div className="p-3 border-t border-white/10 text-xs text-slate-400 flex justify-between items-center bg-[#070D1F]">
            <span>v1.0.2 Beta</span>
            <Settings size={14} className="cursor-pointer hover:text-orange-500 transition-colors"/>
        </div>
      </aside>

      {/* --- ORTA PANEL: ANA EDİTÖR --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative">
        
        {/* Üst Bar (Bembeyaz ve Ferah) */}
        <header className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-white shadow-sm z-10">
          <div className="flex items-center gap-3">
            {!leftOpen && (
              <button onClick={() => setLeftOpen(true)} className="text-slate-500 hover:text-orange-600 transition-colors">
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-500">
               <span className="opacity-70">Dosyalar</span>
               <span>/</span>
               <span className="opacity-70 text-xs">2024/105 Esas</span>
               <span>/</span>
               <span className="text-[#0A1128] font-bold flex items-center gap-2 text-xs bg-slate-100 px-2 py-1 rounded-md">
                 <FileText size={14} className="text-orange-500"/>
                 Cevap Dilekçesi.lexge
               </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {!rightOpen && (
               <button 
                onClick={() => setRightOpen(true)} 
                className="flex items-center gap-2 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full border border-orange-200 transition-colors font-medium shadow-sm"
               >
                 <Sparkles size={14} className="text-orange-500" />
                 <span>Asistanı Aç</span>
               </button>
             )}
          </div>
        </header>

        {/* Editör Sahnesi */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-2 md:p-6 bg-slate-100">
           <div className="max-w-6xl mx-auto h-full">
              <TextEditor />
           </div>
        </div>
      </main>

      {/* --- SAĞ PANEL: AKILLI ASİSTAN (THE BRAIN) - Bembeyaz Arkaplan --- */}
      <aside 
        className={`${
          rightOpen ? 'w-80' : 'w-0'
        } bg-white border-l border-slate-200 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl z-20`}
      >
        {/* Sekmeler */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
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
           <button onClick={() => setRightOpen(false)} className="px-3 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <X size={16} />
           </button>
        </div>

        {/* Panel İçeriği */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
           {activeTab === 'search' && (
              <div className="space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Mevzuat veya İçtihat ara..." 
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-2.5 animate-spin text-orange-500" size={16} />}
                 </div>
                 
                 <div className="space-y-3">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group">
                           <h5 className="text-xs font-bold text-[#0A1128] mb-1">{result.title}</h5>
                           <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">{result.content}</p>
                           <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium border border-orange-200">Metne Ekle</span>
                           </div>
                        </div>
                      ))
                    ) : (
                      !isSearching && (
                        <div className="text-center py-10 text-slate-400 text-sm">
                          <Layout size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                          <p>Hukuki arama yapmak için anahtar kelime yazıp Enter'a basın.</p>
                        </div>
                      )
                    )}
                 </div>
              </div>
           )}

           {activeTab === 'ai' && (
              <div className="space-y-4">
                 <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 shadow-sm">
                    🤖 <strong>AI Hazır:</strong> Metninizdeki riskleri analiz edebilir veya özetleyebilirim.
                 </div>
                 <button className="w-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm p-3 rounded-lg text-left text-sm font-medium text-slate-700 transition-colors flex items-center gap-3">
                    <div className="p-1.5 bg-purple-100 rounded-md text-purple-600"><Sparkles size={16} /></div>
                    Dilekçeyi Analiz Et
                 </button>
                 <button className="w-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm p-3 rounded-lg text-left text-sm font-medium text-slate-700 transition-colors flex items-center gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-md text-blue-600"><FileText size={16} /></div>
                    Hukuki Dile Çevir
                 </button>
              </div>
           )}

           {activeTab === 'tools' && (
              <div className="space-y-4">
                 <ToolCard icon={Calculator} title="Faiz Hesaplama" desc="Yasal ve temerrüt faizi hesaplamaları" />
                 <ToolCard icon={Clock} title="Süre Hesaplayıcı" desc="İstinaf, temyiz ve cevap süreleri" />
              </div>
           )}
        </div>
      </aside>

    </div>
  );
}

// --- Yardımcı Bileşenler ---

// Sol Navigasyon Klasörleri (Lacivert Tema)
const FolderItem = ({ name, active = false }: { name: string, active?: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
    active 
      ? 'bg-orange-500/10 text-orange-400 font-medium border border-orange-500/20' 
      : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`}>
    <FolderOpen size={16} className={active ? 'text-orange-500' : 'text-slate-400'} />
    <span className="truncate">{name}</span>
  </div>
);

// Sol Navigasyon Dosyaları (Lacivert Tema)
const FileItem = ({ name }: { name: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
    <File size={14} className="text-slate-500" />
    <span className="truncate">{name}</span>
  </div>
);

// Sağ Asistan Sekmeleri (Açık Tema)
const TabButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center py-3 text-[10px] font-bold transition-all border-b-2 gap-1 ${
      active 
        ? 'border-orange-500 text-orange-600 bg-white' 
        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

// Sağ Araç Kartları (Açık Tema)
const ToolCard = ({ icon: Icon, title, desc }: any) => (
  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-300 hover:shadow-md cursor-pointer transition-all group">
    <div className="p-2 bg-slate-100 group-hover:bg-orange-100 group-hover:text-orange-600 rounded-md text-slate-500 transition-colors">
      <Icon size={20} />
    </div>
    <div>
      <h4 className="text-sm font-bold text-[#0A1128]">{title}</h4>
      <p className="text-[10px] text-slate-500">{desc}</p>
    </div>
  </div>
);