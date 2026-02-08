'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { submitQuestion } from '@/app/actions/submit-question';
import { createClient } from '@/utils/supabase/client'; // Supabase istemcisi eklendi

interface SearchResult {
  questionId: string;
  newCredits?: number;
  targetUsed?: string;
  success: boolean;
}

interface SearchContextType {
  isAnalyzing: boolean;
  isReady: boolean; // Cevap hazır mı?
  searchResult: SearchResult | null;
  error: string | null;
  performSearch: (formData: FormData) => Promise<void>;
  resetSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient(); // İstemci tarafı supabase
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dinleyicileri temizlemek için ref
  const channelRef = useRef<any>(null);

  const resetSearch = useCallback(() => {
    setIsAnalyzing(false);
    setIsReady(false);
    setSearchResult(null);
    setError(null);
    if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
    }
  }, [supabase]);

  const performSearch = useCallback(async (formData: FormData) => {
    // 1. Durumu Sıfırla
    setIsAnalyzing(true);
    setIsReady(false);
    setError(null);
    
    // Önceki dinleyici varsa temizle
    if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
    }

    // 2. OPTIMISTIC UI: Hemen Lounge'a gönder
    router.push('/lounge');

    try {
      // 3. Soruyu Veritabanına Kaydet (Server Action)
      const result = await submitQuestion(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      const qId = result.questionId;

      // Sonuç verisini kaydet (henüz 'isReady' yapmıyoruz!)
      setSearchResult({
        questionId: qId,
        newCredits: result.newCredits,
        targetUsed: result.targetUsed,
        success: true
      });

      // 4. AI MOTORUNU TETİKLE (Önemli Adım!) 🚀
      // Server Action sadece kaydeder, bu API çağrısı ise AI'ı çalıştırır.
      fetch('/api/trigger-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId }),
      }).catch(err => console.error("AI Tetikleme Hatası:", err));


      // 5. CANLI DİNLEME BAŞLAT (Realtime Listener) 👂
      // Veritabanında bu sorunun statüsü 'answered' olana kadar bekle.
      const channel = supabase
        .channel(`waiting-room-${qId}`)
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'questions', 
            filter: `id=eq.${qId}` 
          },
          (payload) => {
            const newStatus = payload.new.status;
            // Eğer statü 'answered' olursa işlem bitmiştir
            if (newStatus === 'answered') {
                setIsReady(true); // Yeşil butonu yak! ✅
                setIsAnalyzing(false);
                toast.success("Analiz Tamamlandı!");
                
                // Dinlemeyi bırak
                supabase.removeChannel(channel);
                channelRef.current = null;
            }
          }
        )
        .subscribe();
      
      channelRef.current = channel;

    } catch (err: any) {
      console.error("Search Context Error:", err);
      setError(err.message || "Bir hata oluştu.");
      setIsAnalyzing(false);
      toast.error(err.message || "İşlem başarısız.");
      
      // Hata durumunda Dashboard'a geri dönmeyi önerebiliriz
      // veya Lounge içinde hata mesajı gösterebiliriz.
    }
  }, [router, supabase]);

  return (
    <SearchContext.Provider value={{ 
      isAnalyzing, 
      isReady, 
      searchResult, 
      error, 
      performSearch,
      resetSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
}