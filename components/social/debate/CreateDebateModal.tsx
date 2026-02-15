'use client';

import { createDebate, generateSmartTitles } from "@/app/actions/debate"; // generateSmartTitles import edildi
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast"; // veya components/ui/use-toast
import { Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom"; // BUG FIX #13: Portal import

interface CreateDebateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateDebateModal({ isOpen, onClose }: CreateDebateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  
  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // BUG FIX #13: Hydration mismatch önlemek için mounted check
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAiSuggest = async () => {
    if (title.length < 3) {
      toast({ title: "İpucu", description: "Konu hakkında en az 3 harf girmelisin." });
      return;
    }
    
    setIsAiLoading(true);
    // BUG FIX #15: Backend'den önerileri çek
    try {
        const suggestions = await generateSmartTitles(title);
        setAiSuggestions(suggestions);
    } catch (e) {
        toast({ title: "Hata", description: "AI önerileri alınamadı.", variant: "destructive" });
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);

      const result = await createDebate(formData);

      if (result.success) {
        toast({ title: "Münazara Başlatıldı!", description: "Konu tartışmaya açıldı." });
        onClose();
        // State temizle
        setTitle("");
        setDescription("");
        setAiSuggestions([]);
      } else {
        toast({ title: "Hata", description: result.error || "Bir sorun oluştu.", variant: "destructive" });
      }
    });
  };

  if (!mounted) return null;

  // BUG FIX #13: Portal ile body'ye render et (z-index sorununu kesin çözer)
  // Dialog bileşeni bazen kendi portal'ını kullanır ama tam kontrol için manuel portal yapısı
  // Eğer kullandığın UI kütüphanesinin Dialog'u zaten portal kullanıyorsa bu gereksiz olabilir 
  // ama garanti çözüm için 'overlay'i portal içine alıyoruz.
  
  const content = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-lg rounded-xl shadow-2xl border p-6 relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
        >
            <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Yeni Münazara Başlat</h2>
            <p className="text-muted-foreground text-sm">
                Topluluğun ikiye bölüneceği o soruyu sor.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Münazara Konusu (Başlık)</Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Örn: Yapay Zeka insanlığı ele geçirecek mi?" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isPending}
                        className="flex-1"
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={handleAiSuggest}
                        disabled={isAiLoading || isPending}
                        title="AI ile Başlık Öner"
                    >
                        {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
                    </Button>
                </div>
                
                {/* AI Önerileri */}
                {aiSuggestions.length > 0 && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm">
                        <p className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> AI Önerileri:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {aiSuggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setTitle(suggestion)}
                                    className="px-2 py-1 bg-white border border-purple-200 rounded-md hover:bg-purple-100 transition-colors text-left"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label>Açıklama & Kurallar</Label>
                <Textarea 
                    placeholder="Bu tartışmanın çerçevesini çiz..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isPending}
                    rows={4}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                    Vazgeç
                </Button>
                <Button type="submit" disabled={isPending || !title || !description}>
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
        </form>
      </div>
    </div>
  ) : null;

  return createPortal(content, document.body);
}