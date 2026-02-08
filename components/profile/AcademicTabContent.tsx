'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, BookOpen, Award, ShieldCheck, Scale, FileText, HelpCircle, MessageCircle, Star, Calendar, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ExtendedProfile } from '@/app/types';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr';

interface AcademicTabContentProps {
  profile: ExtendedProfile;
  isLocked?: boolean;
}

export default function AcademicTabContent({ profile, isLocked }: AcademicTabContentProps) {
  const [activeSubTab, setActiveSubTab] = useState<'questions' | 'answers' | 'references'>('questions');
  const [contentData, setContentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Kilitliyse direkt kilit ekranını göster
  if (isLocked) {
    return (
      <div className="bg-slate-50/50 rounded-[2rem] p-12 text-center border border-slate-200/60 shadow-inner flex flex-col items-center justify-center h-80">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-sm border border-slate-100">
          <ShieldAlert size={36} />
        </div>
        <h3 className="text-xl font-black text-slate-800">Akademik Arşiv Kapalı 🛡️</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium">
          Yapay zeka ile yapılan çalışmaları incelemek için bu kullanıcıyı takip etmelisin.
        </p>
      </div>
    );
  }

  // SENİN MY CONTENT SAYFANDAKİ MANTIĞI BURAYA ALDIK 👇
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      let data: any[] = [];
      
      try {
        if (activeSubTab === 'questions') {
          // 1. SORULARI ÇEK (MyContentPage ile aynı mantık)
          const { data: questions } = await supabase
            .from('questions')
            .select('*') // Senin kodundaki gibi
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(10);
          
          data = questions || [];
        } 
        else if (activeSubTab === 'answers') {
          // 2. CEVAPLARI ÇEK (MyContentPage ile aynı mantık)
          // 'question:questions(title)' yapısı çok önemli, senin kodunda böyle çalışıyor.
          const { data: answers } = await supabase
            .from('answers')
            .select('*, question:questions(title, id)') 
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(10);
            
          data = answers || [];
        }
        else if (activeSubTab === 'references') {
           // 3. REFERANSLAR (Yüksek puanlı cevaplar)
           const { data: refs } = await supabase
            .from('answers')
            .select('*, question:questions(title, id)')
            .eq('user_id', profile.id)
            .gt('vote_count', 0) // Şimdilik 0'dan büyükleri referans sayıyoruz
            .limit(5);
           
           data = refs || [];
        }
      } catch (error) {
        console.error("Veri hatası:", error);
      }

      setContentData(data);
      setLoading(false);
    };

    fetchContent();
  }, [activeSubTab, profile.id, supabase]);


  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. UZMANLIK RAPORU KARTI */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Scale size={100} />
        </div>

        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <Award className="text-indigo-600" size={20}/>
          Uzmanlık & Yetkinlik Raporu
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Doğrulanmış Cevap</div>
            <div className="text-2xl font-black text-indigo-900">{profile.ai_endorsements || 0}</div>
            <div className="text-[10px] text-green-600 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck size={10}/> AI Onaylı
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Katkı Puanı</div>
            <div className="text-2xl font-black text-slate-800">{profile.reputation || 0}</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Genel Skor</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">Ana Alan</div>
            <div className="text-lg font-black text-slate-800 truncate">Genel Hukuk</div>
          </div>
        </div>
      </div>

      {/* 2. ALT SEKMELER (SUB-TABS) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        
        <button
          onClick={() => setActiveSubTab('questions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
            ${activeSubTab === 'questions' 
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <HelpCircle size={16} /> Sorular
        </button>

        <button
          onClick={() => setActiveSubTab('answers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
            ${activeSubTab === 'answers' 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <MessageCircle size={16} /> Cevaplar
        </button>

        <button
          onClick={() => setActiveSubTab('references')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
            ${activeSubTab === 'references' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Star size={16} className={activeSubTab === 'references' ? 'text-yellow-300 fill-yellow-300' : ''} />
          Referanslar
        </button>

      </div>

      {/* 3. LİSTELEME ALANI */}
      <div className="space-y-3 min-h-[200px]">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
             <p className="text-xs font-bold text-slate-400 mt-2">Veriler yükleniyor...</p>
          </div>
        ) : contentData.length > 0 ? (
          
          // --- VERİ VARSA LİSTELE ---
          contentData.map((item) => (
            <Link 
              key={item.id} 
              href={`/questions/${activeSubTab === 'questions' ? item.id : item.question?.id}`} // Link mantığı
              className="group block"
            >
              <div className="bg-white border border-slate-100 p-5 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all">
                
                <div className="flex items-start gap-4">
                  
                  {/* İkon Kutusu */}
                  <div className={`p-3 rounded-xl mt-0.5 shrink-0 ${
                      activeSubTab === 'references' ? 'bg-indigo-50 text-indigo-600' :
                      activeSubTab === 'questions' ? 'bg-amber-50 text-amber-600' : 
                      'bg-emerald-50 text-emerald-600'
                  }`}>
                      {activeSubTab === 'references' ? <Award size={20} /> : 
                       activeSubTab === 'questions' ? <HelpCircle size={20} /> : 
                       <MessageCircle size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    
                    {/* Üst Bilgi (Tarih ve Etiket) */}
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {activeSubTab === 'questions' ? 'SORU' : activeSubTab === 'answers' ? 'CEVAP' : 'REFERANS'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                         <Calendar size={12}/> {moment(item.created_at).format('DD MMM YYYY')}
                      </span>
                    </div>

                    {/* Başlık */}
                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors line-clamp-1">
                       {/* Soruysa kendi başlığı, Cevapsa bağlı olduğu sorunun başlığı */}
                       {activeSubTab === 'questions' ? item.title : (item.question?.title || "Bilinmeyen Soru")}
                    </h4>

                    {/* İçerik Özeti (Sadece Cevaplar ve Referanslar için) */}
                    {activeSubTab !== 'questions' && (
                      <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">
                        "{item.content}"
                      </p>
                    )}
                    
                    {/* Alt Etiketler */}
                    {activeSubTab === 'references' && (
                       <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                          <ShieldCheck size={12} /> Otorite Kaynağı
                       </div>
                    )}
                  </div>

                  {/* Sağ Ok */}
                  <div className="self-center text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                    <ArrowRight size={20} />
                  </div>

                </div>
              </div>
            </Link>
          ))

        ) : (
          
          // --- BOŞ DURUM (EMPTY STATE) ---
          <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 cursor-default">
            <div className="w-16 h-16 mx-auto bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen size={32} />
            </div>
            <p className="text-slate-600 font-bold text-lg">Henüz kayıt bulunamadı</p>
            <p className="text-slate-400 mt-1 text-sm">
               {activeSubTab === 'questions' ? "Bu kullanıcı henüz soru sormamış." :
                activeSubTab === 'answers' ? "Henüz bir cevap yazılmamış." :
                "Henüz referans gösterilen bir içerik yok."}
            </p>
          </div>

        )}
      </div>

    </div>
  );
}