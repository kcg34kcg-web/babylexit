'use client';

import { useState } from "react";
import { X, Sparkles, Send, Gavel, Check } from "lucide-react";
import { generateSmartTitles, createDebate } from "@/app/actions/debate";
import { toast } from "react-hot-toast";

// HATA BURADAYDI: Interface'e 'onCreated' ekliyoruz.
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void; // <-- Bu satır eksikti, ekledik.
}

export default function CreateDebateModal({ isOpen, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState<{ type: string; text: string }[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  
  const [optionA, setOptionA] = useState("Evet, Katılıyorum");
  const [optionB, setOptionB] = useState("Hayır, Katılmıyorum");

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!draft.trim()) return;
    setLoading(true);
    const res = await generateSmartTitles(draft);
    setLoading(false);

    if (res.success && res.titles) {
      setAiTitles(res.titles);
      setStep(2);
    } else {
      toast.error("AI şu an meşgul, lütfen tekrar dene.");
    }
  };

  const handlePublish = async () => {
    if (!selectedTitle || !optionA || !optionB) return;
    setLoading(true);
    const res = await createDebate(selectedTitle, optionA, optionB, "Genel");
    setLoading(false);

    if (res.success) {
      toast.success("Münazara Arenası Açıldı! 🔥");
      
      // Burada ana sayfadaki listeyi yenileyecek fonksiyonu çağırıyoruz
      onCreated(); 
      
      onClose();
      // Modal kapandıktan sonra form temizliği
      setStep(1);
      setDraft("");
      setSelectedTitle("");
      setOptionA("Evet, Katılıyorum");
      setOptionB("Hayır, Katılmıyorum");
    } else {
      toast.error(res.error || "Hata oluştu");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 m-4 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Gavel size={18} className="text-amber-500" />
            Yeni Münazara Başlat
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* STEP 1: Fikir Girişi */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <label className="text-sm font-medium text-slate-600 block">Tartışmak istediğin konu nedir?</label>
              <textarea 
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Örn: Yapay zeka avukatların işini elinden alacak mı?"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-700 min-h-[120px] resize-none"
              />
              <button 
                onClick={handleGenerate}
                disabled={loading || !draft.trim()}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-70"
              >
                {loading ? <span className="animate-spin">✨</span> : <Sparkles size={18} />}
                AI ile Profesyonelleştir
              </button>
            </div>
          )}

          {/* STEP 2: Başlık Seçimi */}
          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <p className="text-sm text-slate-500 mb-2">Lexwoow AI senin için 3 farklı yaklaşım hazırladı. Birini seç:</p>
              <div className="space-y-3">
                {aiTitles.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedTitle(item.text)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                      selectedTitle === item.text 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 mb-1 block">
                      {item.type}
                    </span>
                    <p className="text-sm font-bold text-slate-800">{item.text}</p>
                    {selectedTitle === item.text && (
                      <div className="absolute top-3 right-3 bg-indigo-500 text-white p-1 rounded-full">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="flex-1 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-xl">Geri Dön</button>
                <button 
                  onClick={() => setStep(3)} 
                  disabled={!selectedTitle}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  Devam Et
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Seçenekler */}
          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-4">
                <p className="text-xs font-bold text-indigo-800 mb-1">SEÇİLEN KONU:</p>
                <p className="text-sm text-indigo-900 font-medium leading-snug">{selectedTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-emerald-600 mb-1 block">A Seçeneği (Yeşil)</label>
                  <input 
                    type="text" 
                    value={optionA} 
                    onChange={(e) => setOptionA(e.target.value)}
                    className="w-full p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-rose-600 mb-1 block">B Seçeneği (Kırmızı)</label>
                  <input 
                    type="text" 
                    value={optionB} 
                    onChange={(e) => setOptionB(e.target.value)}
                    className="w-full p-2 bg-rose-50 border border-rose-100 rounded-lg text-sm focus:border-rose-500 outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={handlePublish}
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-6 hover:bg-slate-800 transition-all"
              >
                {loading ? "Arenaya Gönderiliyor..." : (
                  <>
                    <Send size={18} />
                    Münazarayı Başlat
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}