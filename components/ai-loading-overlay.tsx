'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, Brain, Quote, Wind, Loader2, Gamepad2, BookOpen, 
  Briefcase, Gavel, Trophy, Scale, CheckCircle, ArrowRight 
} from 'lucide-react';
import { cn } from '@/utils/cn'; 
import Link from 'next/link';

// --- 1. İÇERİK VERİ TABANI ---

const FACTS = [
  "İlk avukatlar Antik Roma'da ortaya çıkmıştır, ancak ücret almaları yasaktı.",
  "Dünyanın en kısa anayasası ABD Anayasasıdır (4.400 kelime).",
  "Yapay zeka 'Hallucination' (Halüsinasyon), olmayan bilgiyi gerçek gibi uydurma durumudur.",
  "Hammurabi Kanunları'nda 'göze göz' ilkesi sadece eşit sınıflar için geçerliydi.",
  "Bir davanın 'zaman aşımı', adaletin sonsuza kadar bekleyemeyeceği ilkesine dayanır.",
  "Osmanlı'da 'Kadı', hem hakim hem de belediye başkanı yetkilerine sahipti."
];

const QUOTES = [
  { text: "Adalet mülkün temelidir.", author: "Mustafa Kemal Atatürk" },
  { text: "Hukuk, aklın kaba kuvvete karşı zaferidir.", author: "R. Von Jhering" },
  { text: "Bir suçlunun cezasız kalması, bir masumun mahkum olmasından iyidir.", author: "Roma Atasözü" },
  { text: "Kanunlar örümcek ağı gibidir; küçük sinekler takılır, büyükler deler geçer.", author: "Honore de Balzac" },
  { text: "Adaletsizliği işleyen, çekenden daha sefildir.", author: "Platon" }
];

const ARTICLES = [
  {
    title: "Adaletin Terazisi Neden Titrer?",
    content: "Terazi sabit durmaz, çünkü adalet durağan bir olgu değil, sürekli aranan bir dengedir. Her yeni dava, o teraziye konan yeni bir ağırlıktır. Hukukçu, kefeleri eşitleyen değil, o titremeyi dindiren kişidir.",
    author: "Babylexit Editör"
  },
  {
    title: "Yapay Zeka Hukuku Bitirecek mi?",
    content: "Hayır. Hesap makinesi matematikçiyi bitirmediği gibi, AI da hukukçuyu bitirmeyecek. Ancak 'AI kullanan hukukçu', kullanmayanın yerini alacak. Rutin işler robota, vicdan ve strateji insana kalacak.",
    author: "Teknoloji Ekibi"
  },
  {
    title: "Sanal Mahkemeler Geliyor mu?",
    content: "Fiziksel duruşma salonları azalıyor. Metaverse ve blockchain tabanlı tahkim sistemleri, 'mekansız adalet' kavramını tartışmaya açtı. Yakında yargıçlar avatar, deliller NFT olabilir.",
    author: "Fütürist Hukuk Grubu"
  }
];

const STEPS = [
  "Soru analiz ediliyor...",
  "Vektörel harita çıkarılıyor...",
  "Emsal veriler taranıyor...",
  "Hukuki bağlam kuruluyor...",
  "Cevap hazırlanıyor..."
];

// --- 2. OYUN BİLEŞENİ: JUSTICE RUNNER ---
const JusticeRunnerGame = () => {
  const [isJumping, setIsJumping] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const obstacleRef = useRef<HTMLDivElement>(null);

  // Zıplama Mantığı
  const jump = useCallback(() => {
    if (!gameStarted) setGameStarted(true);
    if (!isJumping && !gameOver) {
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 600); // 600ms havada kalma
    }
  }, [isJumping, gameOver, gameStarted]);

  // Çarpışma Kontrolü
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      const obstacle = obstacleRef.current;

      if (player && obstacle) {
        const playerRect = player.getBoundingClientRect();
        const obstacleRect = obstacle.getBoundingClientRect();

        // Çarpışma Alanı (Hitbox)
        const hitX = playerRect.right > obstacleRect.left + 15 && playerRect.left < obstacleRect.right - 15;
        const hitY = playerRect.bottom > obstacleRect.top + 15; 

        if (hitX && hitY) {
          setGameOver(true);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver]);

  // Skor Artışı
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const scoreInterval = setInterval(() => {
        setScore(s => s + 1);
    }, 100);
    return () => clearInterval(scoreInterval);
  }, [gameStarted, gameOver]);

  // Klavye Desteği
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault(); 
        jump();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [jump]);

  return (
    <div 
        className="w-full h-[220px] bg-slate-950 rounded-xl relative overflow-hidden border-2 border-slate-800 select-none cursor-pointer group shadow-inner" 
        onClick={jump}
    >
      {/* Dekoratif Arka Plan */}
      <div className="absolute top-10 left-10 text-slate-800 opacity-50"><Scale size={60} /></div>
      <div className="absolute top-5 right-20 text-slate-800 opacity-30"><Briefcase size={40} /></div>
      
      {/* Zemin Çizgisi */}
      <div className="absolute bottom-0 w-full h-[4px] bg-slate-700"></div>

      {/* Skor Tabelası */}
      <div className="absolute top-4 right-4 bg-slate-900/90 px-4 py-1 rounded-full border border-slate-700 text-amber-500 font-mono font-bold text-xl z-20 shadow-lg">
        {score}
      </div>

      {/* Başlangıç Ekranı */}
      {!gameStarted && !gameOver && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30 backdrop-blur-[2px]">
            <div className="text-white text-center animate-pulse">
                <Gamepad2 className="mx-auto mb-2 w-8 h-8 text-amber-500" />
                <p className="font-bold text-lg">Başlamak için Tıkla</p>
                <p className="text-xs text-slate-300">Tokmaklardan kaç!</p>
            </div>
         </div>
      )}

      {/* Game Over Ekranı */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-30 flex-col backdrop-blur-sm">
          <Trophy className="text-amber-500 w-12 h-12 mb-2 animate-bounce" />
          <span className="text-white font-bold text-xl mb-1">Dava Düştü!</span>
          <span className="text-slate-400 text-sm mb-4">Toplam Skor: {score}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); setGameOver(false); setScore(0); setGameStarted(true); }} 
            className="px-6 py-2 bg-amber-600 rounded-full text-white font-bold hover:bg-amber-700 transition-all shadow-lg hover:scale-105"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* OYUNCU (EVRAK ÇANTASI) */}
      <div 
        ref={playerRef}
        className={cn(
          "absolute left-[40px] transition-all duration-300 ease-out z-10 will-change-transform",
          isJumping ? "bottom-[90px] rotate-[-15deg]" : "bottom-[4px] rotate-0"
        )}
      >
         <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)] border border-blue-400">
            <Briefcase className="text-white w-6 h-6" />
         </div>
      </div>

      {/* ENGEL (TOKMAK) */}
      <div 
        ref={obstacleRef}
        className={cn(
          "absolute bottom-[4px] w-10 h-10 flex items-center justify-center z-10 will-change-transform",
          gameStarted && !gameOver ? "animate-slide-infinite" : "right-[-60px]"
        )}
      >
         <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center border border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.6)]">
             <Gavel className="text-white w-5 h-5" />
         </div>
      </div>

    </div>
  );
};

// --- 3. ANA BİLEŞEN: LOADING OVERLAY (GÜNCELLENMİŞ) ---

interface OverlayProps {
  isFinished?: boolean;
  redirectUrl?: string;
  onClose?: () => void;
}

export function AILoadingOverlay({ isFinished = false, redirectUrl = "/", onClose }: OverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<'fact' | 'quote' | 'breath' | 'article' | 'game'>('fact');
  const [content, setContent] = useState<any>(null);

  // Başlangıçta Rastgele Bir Mod Seç
  useEffect(() => {
    const modes: ('fact' | 'quote' | 'breath' | 'article')[] = ['fact', 'quote', 'breath', 'article'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    setMode(randomMode);
  }, []);

  // İçerik Yükleyici
  useEffect(() => {
    if (mode === 'fact') setContent(FACTS[Math.floor(Math.random() * FACTS.length)]);
    if (mode === 'quote') setContent(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    if (mode === 'article') setContent(ARTICLES[Math.floor(Math.random() * ARTICLES.length)]);
  }, [mode]);

  // Stepper İlerlemesi (Yükleme Barı)
  useEffect(() => {
    if (isFinished) {
        setStepIndex(STEPS.length); 
        return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1500); 
    return () => clearInterval(interval);
  }, [isFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      {/* ANA KART */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Üst Renkli Çizgi */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 animate-gradient" />

        {/* --- ORTA ALAN: İÇERİK --- */}
        <div className="flex-1 flex flex-col p-6 md:p-8 relative">
          
          {/* A. İŞLEM BİTTİYSE: BAŞARI EKRANI */}
          {isFinished ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/50">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Analiz Tamamlandı!</h2>
                <p className="text-slate-400 mb-8 max-w-xs">Yapay zeka emsal kararları taradı ve hukuki görüşünü hazırladı.</p>
                
                {/* Duruma göre Buton veya Link göster */}
                {onClose ? (
                    <button 
                        onClick={onClose}
                        className="group bg-white text-slate-900 font-bold px-8 py-4 rounded-full flex items-center gap-3 hover:bg-blue-50 transition-all shadow-lg hover:scale-105 hover:shadow-blue-500/20"
                    >
                        Sonuçları Görüntüle
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <Link 
                        href={redirectUrl} 
                        className="group bg-white text-slate-900 font-bold px-8 py-4 rounded-full flex items-center gap-3 hover:bg-blue-50 transition-all shadow-lg hover:scale-105 hover:shadow-blue-500/20"
                    >
                        Sonuçları Görüntüle
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                )}
             </div>
          ) : (
             /* B. İŞLEM SÜRÜYORSA: MEVCUT OYUN EKRANI */
             <>
                {/* Mod Başlığı */}
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm">
                        {mode === 'game' && <Gamepad2 size={14} className="text-amber-500" />}
                        {mode === 'article' && <BookOpen size={14} className="text-purple-500" />}
                        {mode === 'fact' && <Brain size={14} className="text-blue-500" />}
                        {mode === 'quote' && <Quote size={14} className="text-amber-500" />}
                        {mode === 'breath' && <Wind size={14} className="text-green-500" />}
                        
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        {mode === 'game' ? 'Adalet Koşusu' : 
                        mode === 'article' ? 'Günün Yazısı' : 
                        mode === 'fact' ? 'Hukuk Bilgisi' :
                        mode === 'quote' ? 'Günün Sözü' : 'Nefes Egzersizi'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center w-full">
                    {mode === 'game' && <JusticeRunnerGame />}

                    {mode === 'article' && (
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 w-full animate-in zoom-in-95 duration-300 shadow-md">
                        <div className="flex items-center gap-2 mb-3 text-purple-400">
                        <BookOpen size={20} />
                        <h3 className="font-bold text-lg">{content?.title}</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4 font-serif">
                        {content?.content}
                        </p>
                        <div className="text-right text-xs text-slate-500 italic">— {content?.author}</div>
                    </div>
                    )}

                    {mode === 'fact' && (
                    <div className="text-center animate-in zoom-in-95 duration-300 px-4">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Brain className="text-blue-400 w-8 h-8" />
                        </div>
                        <h3 className="text-blue-400 font-bold text-xs uppercase mb-3 tracking-widest">Biliyor muydunuz?</h3>
                        <p className="text-slate-200 text-lg font-medium leading-relaxed">"{content}"</p>
                    </div>
                    )}

                    {mode === 'quote' && (
                    <div className="text-center animate-in zoom-in-95 duration-300 px-4">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Quote className="text-amber-400 w-8 h-8" />
                        </div>
                        <p className="text-slate-200 text-xl font-serif italic mb-4 leading-relaxed">"{content?.text}"</p>
                        <p className="text-slate-500 font-medium">— {content?.author}</p>
                    </div>
                    )}

                    {mode === 'breath' && (
                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <div className="relative flex items-center justify-center w-36 h-36">
                        <div className="absolute w-full h-full bg-green-500/10 rounded-full animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                        <div className="absolute w-28 h-28 bg-green-500/20 rounded-full animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        
                        <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-800 rounded-full flex items-center justify-center shadow-lg shadow-green-900/50 z-10">
                            <Wind className="text-white w-8 h-8 animate-pulse" />
                        </div>
                        </div>
                        <p className="mt-8 text-slate-400 text-sm font-medium">Nefes al... Tut... Ver...</p>
                    </div>
                    )}
                </div>
             </>
          )}
        </div>

        {/* --- ALT MENÜ VE STEPPER (Sadece işlem bitmemişse göster) --- */}
        {!isFinished && (
            <>
                <div className="px-6 pb-2">
                    <div className="flex justify-between items-center bg-slate-950/60 rounded-xl p-1.5 border border-slate-800 backdrop-blur-sm gap-1">
                        <button onClick={() => setMode('game')} className={cn("flex-1 py-2.5 rounded-lg transition-all flex justify-center hover:bg-slate-800", mode === 'game' ? "bg-amber-600/20 text-amber-500" : "text-slate-500")}>
                            <Gamepad2 size={22} />
                        </button>
                        <button onClick={() => setMode('article')} className={cn("flex-1 py-2.5 rounded-lg transition-all flex justify-center hover:bg-slate-800", mode === 'article' ? "bg-purple-600/20 text-purple-500" : "text-slate-500")}>
                            <BookOpen size={22} />
                        </button>
                        <button onClick={() => setMode('fact')} className={cn("flex-1 py-2.5 rounded-lg transition-all flex justify-center hover:bg-slate-800", mode === 'fact' ? "bg-blue-600/20 text-blue-500" : "text-slate-500")}>
                            <Brain size={22} />
                        </button>
                        <button onClick={() => setMode('quote')} className={cn("flex-1 py-2.5 rounded-lg transition-all flex justify-center hover:bg-slate-800", mode === 'quote' ? "bg-amber-600/20 text-amber-500" : "text-slate-500")}>
                            <Quote size={22} />
                        </button>
                        <button onClick={() => setMode('breath')} className={cn("flex-1 py-2.5 rounded-lg transition-all flex justify-center hover:bg-slate-800", mode === 'breath' ? "bg-green-600/20 text-green-500" : "text-slate-500")}>
                            <Wind size={22} />
                        </button>
                    </div>
                    
                    <div className="text-[10px] text-center text-slate-600 mt-2 mb-1">
                    Beklerken bir mod seçebilirsiniz
                    </div>
                </div>

                <div className="bg-slate-950 p-4 border-t border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-medium mb-2">
                    <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    {STEPS[stepIndex]}
                    </span>
                    <span className="text-blue-500 font-bold">%{Math.min((stepIndex + 1) * 20, 99)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-amber-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                    />
                </div>
                </div>
            </>
        )}

      </div>

      <style jsx global>{`
        @keyframes slide-infinite {
          0% { right: -60px; }
          100% { right: 120%; }
        }
        .animate-slide-infinite {
          animation: slide-infinite 1.8s linear infinite;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}