'use client';

import { createDebate, generateSmartTitles } from "@/app/actions/debate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, X, Wand2 } from "lucide-react";
import { useEffect, useState, useTransition, useRef } from "react";
import { createPortal } from "react-dom";

interface CreateDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateDebateModal({ isOpen, onClose }: CreateDebateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Memory Leak Önlemi: Bileşenin mount durumunu takip eden ref
  const isComponentMounted = useRef(true);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  
  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    isComponentMounted.current = true;
    return () => {
      // Bileşen ekrandan kaldırıldığında ref'i false yap
      isComponentMounted.current = false;
    };
  }, []);

  const handleAiSuggest = async () => {
    if (title.length < 3) {
      toast({ title: "İpucu", description: "Konu hakkında en az 3 harf girmelisin." });
      return;
    }
    
    setIsAiLoading(true);
    setAiSuggestions([]); // Önceki önerileri temizle

    try {
        const suggestions = await generateSmartTitles(title);
        
        // BUG FIX: Sadece bileşen hala ekrandaysa state güncelle
        if (isComponentMounted.current) {
            setAiSuggestions(suggestions);
        }
    } catch (e) {
        if (isComponentMounted.current) {
            toast({ title: "Hata", description: "AI şu an yanıt veremiyor.", variant: "destructive" });
        }
    } finally {
        if (isComponentMounted.current) {
            setIsAiLoading(false);
        }
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
      setTitle(suggestion);
      // Seçim yapıldıktan sonra önerileri gizleyebiliriz veya açık tutabiliriz.
      // UX tercihi: Açık tutuyoruz ki değiştirmek isterse diğerlerine bakabilsin.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Frontend validasyonu
    if (!title || title.length < 5) {
        toast({ title: "Uyarı", description: "Başlık en az 5 karakter olmalı.", variant: "destructive" });
        return;
    }
    if (!description || description.length < 10) {
        toast({ title: "Uyarı", description: "Açıklama en az 10 karakter olmalı.", variant: "destructive" });
        return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);

      const result = await createDebate(formData);

      if (result.success) {
        toast({ title: "Münazara Başlatıldı!", description: "Konu tartışmaya açıldı." });
        handleClose();
      } else {
        toast({ title: "Hata", description: result.error || "Bir sorun oluştu.", variant: "destructive" });
      }
    });
  };

  const handleClose = () => {
      // Modalı kapatırken state'i temizle
      setTitle("");
      setDescription("");
      setAiSuggestions([]);
      onClose();
  };

  if (!mounted) return null;

  const content = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 p-0 relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Münazara Başlat</h2>
                <p className="text-slate-500 text-xs mt-0.5">Topluluğun fikrini merak ettiğin bir konu seç.</p>
            </div>
            <button 
                onClick={handleClose} 
                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
            <form id="create-debate-form" onSubmit={handleSubmit} className="space-y-5">
                
                {/* Title Section */}
                <div className="space-y-3">
                    <Label className="text-slate-700 font-semibold">Münazara Konusu</Label>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Örn: Yapay Zeka insanlığı ele geçirecek mi?" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isPending}
                            className="flex-1 border-slate-200 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={handleAiSuggest}
                            disabled={isAiLoading || isPending}
                            className="shrink-0 border-purple-200 hover:bg-purple-50 hover:text-purple-600 text-purple-500 transition-colors"
                            title="AI ile Başlık Öner"
                        >
                            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </Button>
                    </div>
                    
                    {/* AI Suggestions Area */}
                    {aiSuggestions.length > 0 && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                                <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                                    <Wand2 className="w-3 h-3" /> 
                                    Senin için önerdiklerim (Seçmek için tıkla):
                                </p>
                                <div className="flex flex-col gap-2">
                                    {aiSuggestions.map((suggestion, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSelectSuggestion(suggestion)}
                                            className="text-left text-xs px-3 py-2 bg-white hover:bg-purple-100 border border-purple-100 hover:border-purple-200 rounded-lg text-slate-600 hover:text-purple-700 transition-all shadow-sm"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description Section */}
                <div className="space-y-3">
                    <Label className="text-slate-700 font-semibold">Açıklama & Kurallar</Label>
                    <Textarea 
                        placeholder="Bu tartışmanın çerçevesini çiz. İnsanlar neden oy vermeli? Detaylar neler?" 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isPending}
                        rows={5}
                        className="resize-none border-slate-200 focus:ring-purple-500 focus:border-purple-500 leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-400 text-right">
                        En az 10 karakter yazmalısın. ({description.length})
                    </p>
                </div>
            </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={handleClose} 
                disabled={isPending}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            >
                Vazgeç
            </Button>
            <Button 
                type="submit" 
                form="create-debate-form"
                disabled={isPending || title.length < 5 || description.length < 10}
                className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Oluşturuluyor...
                    </>
                ) : (
                    "Tartışmayı Başlat"
                )}
            </Button>
        </div>

      </div>
    </div>
  ) : null;

  return createPortal(content, document.body);
}