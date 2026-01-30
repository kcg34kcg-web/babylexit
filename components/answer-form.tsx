'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnswerForm({ questionId }: { questionId: string }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Cevap yazmak için giriş yapmalısınız.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('answers').insert({
      content,
      question_id: questionId,
      user_id: user.id,
    });

    if (error) {
      toast.error('Cevap gönderilemedi.');
      console.error(error);
    } else {
      toast.success('Cevabınız yayınlandı! ⚖️');
      setContent('');
      router.refresh(); // Sayfayı yenile ki cevap görünsün
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-lg border border-slate-700 shadow-lg mt-8">
      <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
        <Send size={20} className="text-amber-500" />
        Hukuki Görüş Bildir
      </h3>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all min-h-[120px]"
        placeholder="Bu konudaki hukuki değerlendirmeniz nedir?"
        disabled={isSubmitting}
      />
      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Cevabı Yayınla'}
        </button>
      </div>
    </form>
  );
}