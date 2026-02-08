'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'; // Toast kütüphanen hangisiyse onu kullan (sonner veya react-hot-toast)
import { submitQuestion } from '@/app/actions/submit-question';
import { createClient } from '@/utils/supabase/client';

interface SearchResult {
  questionId: string;
  newCredits?: number;
  targetUsed?: string;
  success: boolean;
}

interface SearchContextType {
  isAnalyzing: boolean;
  isReady: boolean;
  searchResult: SearchResult | null;
  error: string | null;
  performSearch: (formData: FormData) => Promise<void>;
  resetSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setIsAnalyzing(true);
    setIsReady(false);
    setError(null);
    
    if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
    }

    // 1. Lounge'a Gönder
    router.push('/lounge');

    try {
      // 2. Soruyu Kaydet
      const result = await submitQuestion(formData);

      if (result.error) throw new Error(result.error);

      const qId = result.questionId;
      setSearchResult({
        questionId: qId,
        newCredits: result.newCredits,
        targetUsed: result.targetUsed,
        success: true
      });

      // 3. AI Tetikle
      fetch('/api/trigger-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId }),
      }).catch(err => console.error("AI Hata:", err));

      // -----------------------------------------------------------
      // 🧪 GELİŞTİRİCİ TEST MODU (Backend çalışmasa bile butonu açar)
      // Bu bloğu canlıya (production) alırken silebilirsin.
      setTimeout(() => {
        setIsReady(true);
        setIsAnalyzing(false);
        // toast.success("Test Modu: Cevap hazır varsayıldı 🛠️");
      }, 6000); // 6 Saniye sonra butonu açar
      // -----------------------------------------------------------

      // 4. Gerçek Dinleme (Realtime)
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
            if (payload.new.status === 'answered') {
                setIsReady(true);
                setIsAnalyzing(false);
                toast.success("Analiz Tamamlandı!");
                supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();
      
      channelRef.current = channel;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Hata");
      setIsAnalyzing(false);
      toast.error("İşlem başarısız.");
    }
  }, [router, supabase]);

  return (
    <SearchContext.Provider value={{ isAnalyzing, isReady, searchResult, error, performSearch, resetSearch }}>
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