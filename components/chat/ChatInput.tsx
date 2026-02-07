'use client'

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Paperclip, Send, X } from 'lucide-react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Textarea Yükseklik Ayarı
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Max yükseklik 150px (yaklaşık 6 satır). Daha fazlasında scroll çıkar.
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedFile) || content.length > MAX_CHARS || isSending) return;

    setIsSending(true);
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('content', content);
    if (selectedFile) formData.append('file', selectedFile);

    try {
      await onSend(formData);
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (error) {
      console.error(error);
      toast.error('Mesaj gönderilemedi.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const charsRemaining = MAX_CHARS - content.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div className="px-3 py-3 w-full relative">
      
      {/* Dosya Önizleme */}
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-orange-50 border border-orange-100 rounded-lg w-fit">
            <span className="text-xs text-orange-800 truncate max-w-[200px]">{selectedFile.name}</span>
            <button 
                onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                className="text-orange-400 hover:text-red-500"
            >
                <X size={14} />
            </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        
        {/* Dosya Butonu (Aşağıda Sabit) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors shrink-0 mb-[2px]"
        >
          <Paperclip size={20} />
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
            className="hidden" 
            accept="image/*,video/*,application/pdf"
        />

        {/* INPUT KUTUSU */}
        <div className={`
            flex-1 bg-slate-50 rounded-2xl overflow-hidden transition-all duration-200
            border border-slate-200 
            focus-within:border-orange-500 focus-within:bg-white
            focus-within:ring-0 focus-within:shadow-none
        `}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bir mesaj yazın..."
              className="w-full p-3 bg-transparent text-slate-900 placeholder:text-slate-400 resize-none scrollbar-hide !outline-none !ring-0 !border-none !shadow-none focus:ring-0 focus:outline-none"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "150px" }} 
            />
        </div>

        {/* Gönder Butonu (Aşağıda Sabit) */}
        <button
          type="submit"
          disabled={isSending || isOverLimit || (!content.trim() && !selectedFile)}
          // mb-[2px] ile input kutusunun alt çizgisiyle görsel olarak hizalıyoruz.
          className={`p-3 rounded-full mb-[2px] transition-all duration-200 flex items-center justify-center shrink-0
            ${(isSending || isOverLimit || (!content.trim() && !selectedFile))
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md transform hover:-translate-y-0.5'
            }`}
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
}