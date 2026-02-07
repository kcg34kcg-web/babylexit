'use client';

/**
 * 🎮 BAB YLEXIT - LIVING LOUNGE: MINI GAME MODULE
 * ------------------------------------------------
 * Bu modül, bekleme süresini eğlenceli hale getiren 3 farklı mikro oyun içerir.
 * * OPTİMİZASYON NOTLARI:
 * 1. React State yerine `useRef` ve Doğrudan DOM Manipülasyonu kullanıldı (60 FPS garanti).
 * 2. `requestAnimationFrame` döngüleri ile GPU dostu render.
 * 3. TypeScript "Strict" moduna tam uyumlu tip tanımlamaları.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Gavel, Trophy, Play, Pause, RotateCcw, 
  ChevronLeft, Skull, Scroll, Scale, ShieldAlert, 
  Gamepad2, Zap, Target, Star, Volume2, VolumeX
} from 'lucide-react';
import { cn } from '@/utils/cn';

// --- TİP TANIMLAMALARI (Type Safety) ---
type GameStatus = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
type GameType = 'RUNNER' | 'SNAKE' | 'PONG';

// --- YARDIMCI: SES EFEKTİ SİMÜLATÖRÜ (Audio API yerine görsel feedback için) ---
// Gerçek projede buraya new Audio() eklenebilir.
const playSound = (type: 'jump' | 'score' | 'crash' | 'click') => {
    // Gelecekte buraya ses dosyaları eklenecek.
    // Şimdilik konsol logu veya boş bırakılabilir.
};

// ==========================================
// 🏃 OYUN 1: JUSTICE RUNNER (Gelişmiş Versiyon)
// ==========================================
const JusticeRunner = ({ onGameOver, onBack }: { onGameOver: (score: number) => void, onBack: () => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // -- REFS (Performance Critical) --
  const playerRef = useRef<HTMLDivElement>(null);
  const obstacleRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLDivElement>(null);
  
  // HATA DÜZELTME 1: useRef initial value null olarak atandı.
  const requestRef = useRef<number | null>(null);
  const scoreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Physics Engine State (Mutable for speed)
  const physics = useRef({
    isJumping: false,
    velocity: 0,
    position: 0,
    obstaclePos: -50,
    cloudPos: 100,
    speed: 1.5,
    gravity: 0.6,
    jumpStrength: 12
  });

  // LocalStorage High Score
  useEffect(() => {
    const saved = localStorage.getItem('runner_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const jump = useCallback(() => {
    if (!isPlaying) {
      setIsPlaying(true);
      return;
    }
    if (!physics.current.isJumping) {
      playSound('jump');
      physics.current.isJumping = true;
      physics.current.velocity = physics.current.jumpStrength;
    }
  }, [isPlaying]);

  // --- GAME LOOP (60 FPS) ---
  const loop = useCallback(() => {
    if (!isPlaying) return;

    const p = physics.current;

    // 1. Player Physics (Gravity)
    if (p.isJumping) {
      p.position += p.velocity;
      p.velocity -= p.gravity;

      // Zemin kontrolü
      if (p.position <= 0) {
        p.position = 0;
        p.isJumping = false;
        p.velocity = 0;
      }
    }

    // 2. Obstacle Logic (Hızlanma ekli)
    p.obstaclePos -= p.speed + (score * 0.0005); 
    if (p.obstaclePos < -50) {
      p.obstaclePos = 100 + Math.random() * 20; // Rastgele yeniden doğuş
      setScore(s => s + 10);
      playSound('score');
    }

    // 3. Cloud Logic (Parallax Effect)
    p.cloudPos -= 0.2;
    if (p.cloudPos < -30) p.cloudPos = 110;

    // 4. RENDER (Direct DOM - No React Render Cycle)
    if (playerRef.current) {
      playerRef.current.style.bottom = `${p.position}px`;
      // Zıplarken dönme efekti
      playerRef.current.style.transform = `rotate(${p.isJumping ? -15 : 0}deg) scale(${p.isJumping ? 1.1 : 1})`;
    }
    if (obstacleRef.current) {
      obstacleRef.current.style.left = `${p.obstaclePos}%`;
    }
    if (cloudRef.current) {
      cloudRef.current.style.left = `${p.cloudPos}%`;
    }

    // 5. COLLISION DETECTION (Hitbox)
    const playerRect = playerRef.current?.getBoundingClientRect();
    const obstacleRect = obstacleRef.current?.getBoundingClientRect();

    if (playerRect && obstacleRect) {
      const buffer = 12; // Hata payı (oyuncu dostu)
      const hitX = playerRect.right - buffer > obstacleRect.left + buffer && playerRect.left + buffer < obstacleRect.right - buffer;
      const hitY = playerRect.bottom - buffer > obstacleRect.top + buffer;

      if (hitX && hitY) {
        playSound('crash');
        setIsPlaying(false);
        if (score > highScore) {
            localStorage.setItem('runner_highscore', score.toString());
        }
        onGameOver(score);
        return; // Loop dursun
      }
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [isPlaying, score, highScore, onGameOver]);

  // Loop Başlatıcı
  useEffect(() => {
    if (isPlaying) {
      // Reset Physics
      physics.current = { 
        isJumping: false, velocity: 0, position: 0, 
        obstaclePos: 100, cloudPos: 100, speed: 1.8, 
        gravity: 0.6, jumpStrength: 13 
      };
      setScore(0);
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, loop]);

  // Klavye Kontrolleri
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900 cursor-pointer group" onClick={jump}>
      
      {/* HUD (Heads Up Display) */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
         <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md transition-colors">
            <ChevronLeft size={20} className="text-white"/>
         </button>
         <div className="px-3 py-1 bg-black/40 rounded-full border border-white/10 text-xs text-amber-500 font-mono flex items-center gap-1">
            <Trophy size={12} /> High: {highScore}
         </div>
      </div>
      <div className="absolute top-4 right-4 z-20 font-mono text-4xl font-black text-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)] select-none">
         {score}
      </div>
      
      {/* Start Screen Overlay */}
      {!isPlaying && score === 0 && (
         <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Play size={48} className="text-amber-500 opacity-90 mb-2" fill="currentColor" />
            </motion.div>
            <p className="text-white font-bold text-lg tracking-wide">Koşmak için Tıkla</p>
            <p className="text-white/50 text-xs font-mono mt-1">Tokmaklardan kaç!</p>
         </div>
      )}

      {/* --- OYUN DÜNYASI --- */}
      
      {/* Arka Plan Dekorları */}
      <div ref={cloudRef} className="absolute top-10 w-24 h-12 opacity-20 bg-white blur-xl rounded-full"></div>
      <div className="absolute bottom-0 w-full h-[4px] bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 shadow-[0_-5px_20px_rgba(255,255,255,0.1)]"></div>
      
      {/* Background Icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
        <Scale size={200} className="text-white"/>
      </div>

      {/* PLAYER (Avukat Çantası) */}
      <div 
        ref={playerRef} 
        className="absolute left-8 bottom-0 w-12 h-12 z-10 will-change-transform"
      >
        <div className="w-full h-full bg-blue-600 rounded-xl flex items-center justify-center border-2 border-blue-400 shadow-[0_0_25px_rgba(37,99,235,0.6)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-6 h-6 bg-white/20 rounded-bl-full"></div>
            <Briefcase className="text-white w-6 h-6 relative z-10" />
        </div>
        {/* Parçacık Efekti (Basit CSS) */}
        {physics.current.isJumping && (
            <div className="absolute -bottom-4 left-1/2 w-8 h-2 bg-blue-500/50 blur-md rounded-full animate-ping" />
        )}
      </div>

      {/* OBSTACLE (Tokmak) */}
      <div 
        ref={obstacleRef} 
        className="absolute left-full bottom-0 w-10 h-16 flex flex-col items-center justify-end z-10 will-change-transform"
      >
         <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center border-2 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
             <Gavel className="text-white w-5 h-5" />
         </div>
         <div className="w-1.5 h-8 bg-gradient-to-b from-red-800 to-red-950 rounded-b-md"></div>
      </div>

    </div>
  );
};

// ==========================================
// 🐍 OYUN 2: EVIDENCE HUNTER (Grid & Bonus Sistemi)
// ==========================================
const GRID_SIZE = 20;
const CELL_COUNT = 20;

const EvidenceHunter = ({ onGameOver, onBack }: { onGameOver: (score: number) => void, onBack: () => void }) => {
  const [snake, setSnake] = useState<{x:number, y:number}[]>([{x: 10, y: 10}]);
  const [food, setFood] = useState({x: 15, y: 5});
  const [bonus, setBonus] = useState<{x:number, y:number} | null>(null); // Bonus eşya
  const [direction, setDirection] = useState<'UP'|'DOWN'|'LEFT'|'RIGHT'>('RIGHT');
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  
  // HATA DÜZELTME 3: useRef initial value.
  const directionRef = useRef<'UP'|'DOWN'|'LEFT'|'RIGHT'>('RIGHT');
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const bonusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Yiyecek Oluşturucu
  const spawnFood = () => ({
      x: Math.floor(Math.random() * CELL_COUNT),
      y: Math.floor(Math.random() * CELL_COUNT)
  });

  // Bonus Oluşturucu (Nadir)
  const spawnBonus = useCallback(() => {
      if (Math.random() > 0.7) { // %30 şans
         setBonus(spawnFood());
         // 5 saniye sonra bonus kaybolur
         bonusTimeoutRef.current = setTimeout(() => setBonus(null), 5000);
      }
  }, []);

  const moveSnake = useCallback(() => {
    if (!isPlaying) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      
      switch (directionRef.current) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // 1. Duvar Kontrolü
      if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
        setIsPlaying(false);
        playSound('crash');
        onGameOver(score);
        return prevSnake;
      }

      // 2. Kendi Kuyruğuna Çarpma
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setIsPlaying(false);
        playSound('crash');
        onGameOver(score);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // 3. Yiyecek Yeme
      if (head.x === food.x && head.y === food.y) {
        setScore(s => {
             const newScore = s + 1;
             if (newScore % 5 === 0) spawnBonus(); // Her 5 puanda bir bonus şansı
             return newScore;
        });
        playSound('score');
        setFood(spawnFood());
        // Kuyruk silinmez (büyür)
      } 
      // 4. Bonus Yeme
      else if (bonus && head.x === bonus.x && head.y === bonus.y) {
        setScore(s => s + 5); // Bonus 5 puan
        playSound('score');
        setBonus(null);
        if (bonusTimeoutRef.current) clearTimeout(bonusTimeoutRef.current);
      }
      else {
        newSnake.pop(); // Kuyruk silinir (hareket)
      }

      return newSnake;
    });
  }, [food, bonus, isPlaying, score, onGameOver, spawnBonus]);

  // Döngü Başlatıcı
  useEffect(() => {
    if (isPlaying) {
      const baseSpeed = 150;
      const speed = Math.max(70, baseSpeed - (score * 2)); // Zorluk artışı
      gameLoopRef.current = setInterval(moveSnake, speed);
    }
    return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (bonusTimeoutRef.current) clearTimeout(bonusTimeoutRef.current);
    };
  }, [isPlaying, moveSnake, score]);

  // Klavye Dinleyici
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const current = directionRef.current;
      // Ters yöne gitmeyi engelle
      if (e.key === 'ArrowUp' && current !== 'DOWN') directionRef.current = 'UP';
      if (e.key === 'ArrowDown' && current !== 'UP') directionRef.current = 'DOWN';
      if (e.key === 'ArrowLeft' && current !== 'RIGHT') directionRef.current = 'LEFT';
      if (e.key === 'ArrowRight' && current !== 'LEFT') directionRef.current = 'RIGHT';
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="w-full h-full relative bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
       
       {/* Background Grid Decoration */}
       <div className="absolute inset-0 opacity-10" 
            style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
       </div>

       {/* UI */}
       <div className="absolute top-4 left-4 z-20">
         <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md"><ChevronLeft size={20} className="text-white"/></button>
       </div>
       <div className="absolute top-4 right-4 z-20 font-mono text-2xl font-bold text-emerald-400 drop-shadow-md">
         Delil: {score}
       </div>
       
       {!isPlaying && score === 0 && (
         <div className="absolute z-30 inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <button 
                onClick={() => setIsPlaying(true)}
                className="bg-emerald-600 px-8 py-3 rounded-full text-white font-bold hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 animate-bounce"
            >
               <Play size={18} fill="currentColor" /> Avı Başlat
            </button>
            <p className="text-emerald-200/50 text-xs mt-4">Yön tuşları ile delilleri topla</p>
         </div>
       )}

       {/* --- GAME BOARD --- */}
       <div 
         className="w-[300px] h-[300px] bg-slate-800/80 border-2 border-slate-700 grid relative rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm"
         style={{ gridTemplateColumns: `repeat(${CELL_COUNT}, 1fr)`, gridTemplateRows: `repeat(${CELL_COUNT}, 1fr)` }}
       >
          {/* BONUS (Yıldız) */}
          {bonus && (
             <div 
               className="absolute flex items-center justify-center animate-spin"
               style={{ 
                 width: `${100/CELL_COUNT}%`, height: `${100/CELL_COUNT}%`,
                 left: `${(bonus.x / CELL_COUNT) * 100}%`, top: `${(bonus.y / CELL_COUNT) * 100}%`,
                 transition: 'all 0.2s'
               }}
             >
                <Star size={14} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
             </div>
          )}

          {/* FOOD (Parşömen) */}
          <div 
            className="absolute bg-emerald-500/20 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center"
            style={{ 
              width: `${100/CELL_COUNT}%`, height: `${100/CELL_COUNT}%`,
              left: `${(food.x / CELL_COUNT) * 100}%`, top: `${(food.y / CELL_COUNT) * 100}%` 
            }}
          >
             <Scroll size={12} className="text-emerald-400" />
          </div>

          {/* SNAKE BODY */}
          {snake.map((segment, i) => (
             <div 
               key={`${segment.x}-${segment.y}-${i}`}
               className={cn(
                  "absolute rounded-sm transition-all duration-75 border-[0.5px] border-black/20",
                  i === 0 ? "bg-blue-400 z-10 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "bg-blue-600 opacity-90"
               )}
               style={{ 
                 width: `${100/CELL_COUNT}%`, height: `${100/CELL_COUNT}%`,
                 left: `${(segment.x / CELL_COUNT) * 100}%`, top: `${(segment.y / CELL_COUNT) * 100}%` 
               }}
             >
                {/* Yılanın Gözleri (Sadece Başta) */}
                {i === 0 && (
                    <div className="w-full h-full relative">
                        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-white rounded-full"></div>
                        <div className="absolute top-[20%] left-[20%] w-[20%] h-[20%] bg-white rounded-full"></div>
                    </div>
                )}
             </div>
          ))}
       </div>

       {/* Mobil Kontroller */}
       <div className="mt-6 grid grid-cols-3 gap-2 md:hidden scale-90 opacity-80">
          <div></div>
          <button className="bg-white/10 p-4 rounded-xl active:bg-white/30 backdrop-blur-md" onClick={() => directionRef.current = 'UP'}>⬆️</button>
          <div></div>
          <button className="bg-white/10 p-4 rounded-xl active:bg-white/30 backdrop-blur-md" onClick={() => directionRef.current = 'LEFT'}>⬅️</button>
          <button className="bg-white/10 p-4 rounded-xl active:bg-white/30 backdrop-blur-md" onClick={() => directionRef.current = 'DOWN'}>⬇️</button>
          <button className="bg-white/10 p-4 rounded-xl active:bg-white/30 backdrop-blur-md" onClick={() => directionRef.current = 'RIGHT'}>➡️</button>
       </div>
    </div>
  );
};

// ==========================================
// 🏓 OYUN 3: LEX PONG (Canvas & AI & Shake Effect)
// ==========================================
const LexPong = ({ onGameOver, onBack }: { onGameOver: (score: number) => void, onBack: () => void }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [score, setScore] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); // For Screen Shake
    const requestRef = useRef<number | null>(null);
  
    // Game State Mutable (Avoid React State for 60FPS)
    const state = useRef({
      ball: { x: 150, y: 100, dx: 3, dy: 3, size: 6, speed: 3.5 },
      paddlePlayer: { y: 75, height: 50, width: 8 },
      paddleAI: { y: 75, height: 50, width: 8, speed: 2.8, errorRate: 0.1 },
      height: 200,
      width: 300,
      shake: 0
    });

    // Screen Shake Helper
    const triggerShake = () => {
        state.current.shake = 10;
        if (containerRef.current) containerRef.current.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
        setTimeout(() => { 
            state.current.shake = 0;
            if (containerRef.current) containerRef.current.style.transform = 'none';
        }, 100);
    };
  
    const update = useCallback(() => {
      const s = state.current;
      const cvs = canvasRef.current;
      if(!cvs) return;
      
      // 1. Ball Movement
      s.ball.x += s.ball.dx;
      s.ball.y += s.ball.dy;
  
      // 2. Wall Collision (Top/Bottom)
      if (s.ball.y + s.ball.size > s.height || s.ball.y - s.ball.size < 0) {
        s.ball.dy *= -1;
        playSound('click');
      }
  
      // 3. AI Movement (Takip + Hata Payı)
      const targetY = s.ball.y - s.paddleAI.height / 2;
      // AI sadece top kendine geliyorsa hareket eder (Daha doğal)
      if (s.ball.dx > 0) {
          if (s.paddleAI.y < targetY) s.paddleAI.y += s.paddleAI.speed;
          if (s.paddleAI.y > targetY) s.paddleAI.y -= s.paddleAI.speed;
      }
      // AI Sınırları
      s.paddleAI.y = Math.max(0, Math.min(s.height - s.paddleAI.height, s.paddleAI.y));
  
      // 4. Player Collision (Left)
      if (
        s.ball.x - s.ball.size < s.paddlePlayer.width && 
        s.ball.y > s.paddlePlayer.y && 
        s.ball.y < s.paddlePlayer.y + s.paddlePlayer.height
      ) {
          s.ball.dx *= -1.05; // Hızlanma
          s.ball.speed *= 1.05;
          s.ball.x = s.paddlePlayer.width + s.ball.size; // Stuck fix
          setScore(sc => sc + 1);
          playSound('click');
          triggerShake();
      }
  
      // 5. AI Collision (Right)
      if (
        s.ball.x + s.ball.size > s.width - s.paddleAI.width && 
        s.ball.y > s.paddleAI.y && 
        s.ball.y < s.paddleAI.y + s.paddleAI.height
      ) {
          s.ball.dx *= -1.05;
          s.ball.x = s.width - s.paddleAI.width - s.ball.size;
          playSound('click');
      }
  
      // 6. Game Over (Ball went left)
      if (s.ball.x < 0) {
        setIsPlaying(false);
        onGameOver(score);
        return;
      }
      
      // 7. AI Missed (Ball went right) - Reset
      if (s.ball.x > s.width) {
         s.ball.x = s.width / 2;
         s.ball.y = s.height / 2;
         s.ball.dx = -3; 
         s.ball.speed = 3.5; // Reset speed
         playSound('score');
         setScore(sc => sc + 5); // AI yenilince bonus
      }
    }, [score, onGameOver]);
  
    const draw = useCallback(() => {
       const cvs = canvasRef.current;
       const ctx = cvs?.getContext('2d');
       if (!cvs || !ctx) return;
       const s = state.current;
  
       // Clear
       ctx.fillStyle = '#0f172a'; // slate-900
       ctx.fillRect(0, 0, s.width, s.height);
  
       // Middle Net
       ctx.strokeStyle = '#334155';
       ctx.lineWidth = 2;
       ctx.setLineDash([5, 5]);
       ctx.beginPath();
       ctx.moveTo(s.width/2, 0);
       ctx.lineTo(s.width/2, s.height);
       ctx.stroke();
       ctx.setLineDash([]);
  
       // Ball (Glow Effect)
       ctx.shadowBlur = 10;
       ctx.shadowColor = '#fbbf24';
       ctx.fillStyle = '#fbbf24'; // amber-400
       ctx.beginPath();
       ctx.arc(s.ball.x, s.ball.y, s.ball.size, 0, Math.PI*2);
       ctx.fill();
       ctx.shadowBlur = 0; // Reset shadow for paddles
  
       // Player Paddle
       ctx.fillStyle = '#3b82f6'; // blue-500
       ctx.fillRect(0, s.paddlePlayer.y, s.paddlePlayer.width, s.paddlePlayer.height);
  
       // AI Paddle
       ctx.fillStyle = '#ef4444'; // red-500
       ctx.fillRect(s.width - s.paddleAI.width, s.paddleAI.y, s.paddleAI.width, s.paddleAI.height);
  
    }, []);
  
    const loop = useCallback(() => {
       if(!isPlaying) return;
       update();
       draw();
       requestRef.current = requestAnimationFrame(loop);
    }, [isPlaying, update, draw]);
  
    useEffect(() => {
       if(isPlaying) requestRef.current = requestAnimationFrame(loop);
       return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isPlaying, loop]);
  
    // Mouse/Touch Control
    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
       const cvs = canvasRef.current;
       if (!cvs) return;
       const rect = cvs.getBoundingClientRect();
       const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
       // Scale mouse position to canvas resolution
       const scaleY = 200 / rect.height; 
       const relativeY = (clientY - rect.top) * scaleY;
       
       state.current.paddlePlayer.y = relativeY - (state.current.paddlePlayer.height / 2);
       // Constraints
       state.current.paddlePlayer.y = Math.max(0, Math.min(state.current.height - state.current.paddlePlayer.height, state.current.paddlePlayer.y));
    };
  
    return (
      <div ref={containerRef} className="w-full h-full relative flex flex-col items-center justify-center bg-slate-900 transition-transform duration-75">
         
         <div className="absolute top-4 left-4 z-20">
             <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md"><ChevronLeft size={20} className="text-white"/></button>
         </div>
         <div className="absolute top-2 text-slate-500 text-[10px] font-mono uppercase tracking-widest border border-slate-700 px-2 py-0.5 rounded">Duruşma Tenisi</div>
         <div className="absolute top-8 font-mono text-3xl font-black text-white/90 mb-2 drop-shadow-md">{score}</div>
  
         <canvas 
           ref={canvasRef} 
           width={300} 
           height={200}
           className="border-2 border-slate-700 rounded-lg cursor-none touch-none shadow-2xl bg-slate-800 w-[90%] max-w-[400px] aspect-[3/2]"
           onMouseMove={handleMove}
           onTouchMove={handleMove}
         />
  
         {!isPlaying && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
               <button 
                 onClick={() => setIsPlaying(true)} 
                 className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center gap-2 animate-pulse"
               >
                  <Play size={18} fill="currentColor" /> Maça Başla
               </button>
           </div>
         )}
         <p className="text-slate-500 text-[10px] mt-4 opacity-60">Raketi kontrol etmek için kaydırın</p>
      </div>
    );
};

// ==========================================
// 🕹️ MAIN WRAPPER & MENU SYSTEM
// ==========================================
export const MiniGame = () => {
  const [activeGame, setActiveGame] = useState<'NONE' | 'RUNNER' | 'SNAKE' | 'PONG'>('NONE');
  const [lastScore, setLastScore] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleGameOver = (score: number) => {
    setLastScore(score);
    setShowGameOver(true);
  };

  const resetToMenu = () => {
    setShowGameOver(false);
    setActiveGame('NONE');
  };

  // --- GAME OVER SCREEN ---
  if (showGameOver) {
    return (
      <div className="w-full h-[360px] bg-slate-950 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden border border-red-900/30">
         {/* Noise Texture */}
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
         
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }} 
           animate={{ scale: 1, opacity: 1 }}
           className="z-10 text-center p-6 w-full"
         >
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
               <Skull className="text-red-500 w-12 h-12" />
            </div>
            
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">DAVA DÜŞTÜ!</h2>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-6 inline-block min-w-[200px]">
                <p className="text-slate-400 font-mono text-xs mb-1 uppercase tracking-widest">Toplam Skor</p>
                <span className="text-amber-400 text-3xl font-black drop-shadow-sm">{lastScore}</span>
            </div>
            
            <div className="flex gap-3 justify-center">
               <button onClick={() => setShowGameOver(false)} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                  <RotateCcw size={18} /> Tekrar Dene
               </button>
               <button onClick={resetToMenu} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors border border-slate-700">
                  Menüye Dön
               </button>
            </div>
         </motion.div>
      </div>
    );
  }

  // --- ACTIVE GAME VIEW ---
  if (activeGame === 'RUNNER') return <div className="w-full h-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900"><JusticeRunner onGameOver={handleGameOver} onBack={resetToMenu} /></div>;
  if (activeGame === 'SNAKE') return <div className="w-full h-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900"><EvidenceHunter onGameOver={handleGameOver} onBack={resetToMenu} /></div>;
  if (activeGame === 'PONG') return <div className="w-full h-[360px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900"><LexPong onGameOver={handleGameOver} onBack={resetToMenu} /></div>;

  // --- MENU SCREEN (Arcade Style) ---
  return (
    <div className="w-full h-[360px] bg-slate-950 rounded-3xl p-6 border border-slate-800 flex flex-col relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10">
         <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
               {/* HATA DÜZELTME 2: Gamepad2 yoksa Gamepad kullanıyoruz (Importta çözüldü ama fallback iyi olur) */}
               <Gamepad2 className="text-white w-6 h-6" />
            </div>
            <div>
               <h2 className="text-white font-black text-xl tracking-tight leading-none">Oyun Alanı</h2>
               <p className="text-slate-400 text-xs font-medium mt-1">Stres atmak için bir mod seçin</p>
            </div>
         </div>
         
         <button 
           onClick={() => setSoundEnabled(!soundEnabled)} 
           className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
           title="Ses Efektleri"
         >
           {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
         </button>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 z-10">
         <GameCard 
            title="Adalet Koşusu" 
            desc="Engellerden zıpla, yüksek skor yap" 
            icon={<Briefcase className="text-blue-400 w-6 h-6"/>} 
            color="group-hover:bg-blue-500/10 group-hover:border-blue-500/30"
            gradient="from-blue-500/20 to-transparent"
            onClick={() => setActiveGame('RUNNER')}
         />
         <GameCard 
            title="Delil Avcısı" 
            desc="Klasik yılan oyunu, bonusları topla" 
            icon={<Target className="text-emerald-400 w-6 h-6"/>} 
            color="group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30"
            gradient="from-emerald-500/20 to-transparent"
            onClick={() => setActiveGame('SNAKE')}
         />
         <GameCard 
            title="Duruşma Tenisi" 
            desc="Yapay zekaya karşı refleks testi" 
            icon={<Zap className="text-amber-400 w-6 h-6"/>} 
            color="group-hover:bg-amber-500/10 group-hover:border-amber-500/30"
            gradient="from-amber-500/20 to-transparent"
            onClick={() => setActiveGame('PONG')}
         />
      </div>
      
      <div className="mt-4 text-center">
         <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
            v2.0 • Living Lounge Arcade
         </span>
      </div>
    </div>
  );
};

// --- ALT BİLEŞEN: GAME CARD ---
const GameCard = ({ title, desc, icon, color, gradient, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "relative flex flex-col items-start justify-between p-5 rounded-2xl border border-white/5 bg-slate-900/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl group overflow-hidden text-left h-full",
      color
    )}
  >
     {/* Hover Gradient */}
     <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", gradient)} />
     
     <div className="relative z-10 w-full">
        <div className="mb-4 p-3 bg-slate-950 rounded-xl shadow-inner inline-flex border border-white/5 group-hover:scale-110 transition-transform duration-300 origin-left">
            {icon}
        </div>
        <h3 className="text-slate-200 font-bold text-base mb-1 group-hover:text-white">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed group-hover:text-slate-300">{desc}</p>
     </div>

     <div className="relative z-10 mt-4 self-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
        <div className="bg-white/10 p-1.5 rounded-full">
            <Play size={12} className="text-white" fill="currentColor" />
        </div>
     </div>
  </button>
);