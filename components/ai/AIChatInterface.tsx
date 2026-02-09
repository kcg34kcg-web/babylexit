'use client'

import { useChat } from 'ai/react';
import { useRef, useEffect } from 'react';
import { Send, Bot, User, StopCircle } from 'lucide-react';

export default function AIChatInterface() {
  // Vercel AI SDK Hook'u: Tüm chat mantığını (gönderme, stream alma, yükleme durumu) yönetir.
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/chat', // Bizim oluşturduğumuz orkestratör rotası
    onError: (e) => {
        console.error("Chat Hatası:", e);
        alert("Bir hata oluştu, lütfen tekrar deneyin.");
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Her yeni mesajda en alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Üst Başlık */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="text-white w-6 h-6" />
        </div>
        <div>
            <h3 className="text-white font-bold">Babylexit AI</h3>
            <p className="text-xs text-slate-400">Melez Araştırma Asistanı (PDF + Web)</p>
        </div>
      </div>

      {/* Mesaj Alanı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-60">
                <Bot size={48} />
                <p>Bana hukuki sorular sorabilir veya yüklediğin belgeleri analiz ettirebilirsin.</p>
            </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {/* Bot İkonu */}
            {m.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-indigo-400" />
                </div>
            )}

            {/* Mesaj Balonu */}
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              {/* Markdown benzeri içerik için basit render */}
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>

            {/* Kullanıcı İkonu */}
            {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                    <User size={16} className="text-slate-300" />
                </div>
            )}
          </div>
        ))}

        {/* Yükleniyor Animasyonu */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-indigo-400" />
                 </div>
                 <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
             </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Alanı */}
      <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="relative flex items-center gap-2">
            <input
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                value={input}
                onChange={handleInputChange}
                placeholder="Bir soru sor... (Örn: Yıllık izin süreleri nedir?)"
                disabled={isLoading}
            />
            
            {isLoading ? (
                <button 
                    type="button" 
                    onClick={() => stop()}
                    className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                    title="Durdur"
                >
                    <StopCircle size={20} />
                </button>
            ) : (
                <button 
                    type="submit"
                    disabled={!input.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            )}
        </div>
      </form>
    </div>
  );
}