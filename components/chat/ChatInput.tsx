'use client'

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Paperclip, Send, X } from 'lucide-react'; // İkon paketini kurmadıysan: npm i lucide-react

const MAX_CHARS = 1000;

interface ChatInputProps {
  conversationId: string;
  onSend: (formData: FormData) => Promise<void>;
}

export default function ChatInput({ conversationId, onSend }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedFile) || content.length > MAX_CHARS) return;

    setIsSending(true);
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('content', content);
    
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      await onSend(formData);
      // Başarılı olursa temizle
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      toast.error('Mesaj gönderilemedi.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const charsRemaining = MAX_CHARS - content.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div className="p-4 bg-slate-950 border-t border-slate-800 w-full shrink-0 z-20">
      {/* Dosya Önizleme */}
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-slate-900 rounded-lg w-fit">
            <span className="text-xs text-slate-300 truncate max-w-[200px]">{selectedFile.name}</span>
            <button 
                onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                className="text-slate-400 hover:text-red-400"
            >
                <X size={14} />
            </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        {/* Karakter Sayacı */}
        {content.length > 0 && (
          <div className={`absolute -top-6 right-0 text-xs font-medium ${
            isOverLimit ? 'text-red-500' : charsRemaining < 100 ? 'text-yellow-500' : 'text-slate-500'
          }`}>
            {content.length} / {MAX_CHARS}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Dosya Ekleme Butonu */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-white bg-slate-900 rounded-full transition-colors border border-slate-800"
            title="Dosya Ekle"
          >
            <Paperclip size={20} />
          </button>
          <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              className="hidden" 
              accept="image/*,video/*,application/pdf"
          />

          {/* Mesaj Yazma Alanı */}
          <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Mesajınızı yazın..."
                className={`w-full bg-slate-900 text-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 resize-none scrollbar-hide border ${
                  isOverLimit ? 'focus:ring-red-500 border-red-900' : 'focus:ring-blue-600 border-slate-800'
                }`}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                // Not: 'fieldSizing' modern tarayıcılarda oto-yükseklik sağlar.
                // Desteklenmeyenler için JS tabanlı çözüm eklenebilir.
                style={{ fieldSizing: "content", minHeight: "48px", maxHeight: "120px" } as any} 
              />
          </div>

          {/* Gönder Butonu */}
          <button
            type="submit"
            disabled={isSending || isOverLimit || (!content.trim() && !selectedFile)}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}