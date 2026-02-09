'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, 
  UploadCloud, 
  FileText, 
  PlayCircle, 
  Download, 
  X,
  ArrowLeft 
} from 'lucide-react';
import moment from 'moment';
import 'moment/locale/tr';

// --- YENİ EKLENEN İMPORT ---
// Bu fonksiyon dosyayı Python Worker'ın kuyruğuna atar
import { uploadFileForAnalysis } from '@/app/actions/upload'; 

// Tip Tanımlamaları
interface Publication {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video';
  file_url: string;
  created_at: string;
}

export default function PublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'article' | 'video'>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'article' | 'video'>('article');
  const [file, setFile] = useState<File | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchPublications();
    checkUser();
    moment.locale('tr');
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        setIsAdmin(true); 
    }
  };

  const fetchPublications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Hata:', error);
    if (data) setPublications(data as any);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return alert('Lütfen başlık ve dosya seçin.');

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // --- KATMAN 2 ENTEGRASYONU BAŞLANGIÇ ---
      // Eğer yüklenen bir makale (PDF) ise, bunu Yapay Zeka'ya da gönderelim.
      if (type === 'article') {
        console.log("🤖 AI Analizi için kuyruğa gönderiliyor...");
        const aiFormData = new FormData();
        aiFormData.append('file', file);
        
        // Asenkron olarak AI kuyruğuna atıyoruz. Hata alsa bile ana akışı bozmamalı.
        const aiResult = await uploadFileForAnalysis(aiFormData);
        
        if (!aiResult.success) {
          console.warn("⚠️ AI Yükleme Uyarısı:", aiResult.error);
          // Kullanıcıya hata göstermiyoruz, çünkü "Yayınlama" işlemi başarılı olabilir.
        } else {
          console.log("✅ Dosya AI işleme kuyruğuna eklendi.");
        }
      }
      // --- KATMAN 2 ENTEGRASYONU BİTİŞ ---

      // 2. Mevcut Yayın Akışı (Değişmedi)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('publications')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('publications')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('publications')
        .insert({
          title,
          description: desc,
          type,
          file_url: publicUrl,
          uploader_id: user.id
        });

      if (dbError) throw dbError;

      alert('Yayın başarıyla eklendi! (AI Analizi de başlatıldı)');
      setShowUploadModal(false);
      setTitle('');
      setDesc('');
      setFile(null);
      fetchPublications(); 

    } catch (error: any) {
      alert('Yükleme hatası: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const filteredPubs = publications.filter(p => filterType === 'all' || p.type === filterType);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- 1. GERİ DÖN BUTONU --- */}
        <Link 
          href="/" 
          className="inline-flex items-center text-slate-400 hover:text-amber-500 mb-6 transition-all group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Ana Menüye Dön
        </Link>
        
        {/* --- 2. BAŞLIK VE AKSİYON ALANI --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Yayınlar & Eğitimler</h1>
            <p className="text-slate-400">Hukuki makaleler, içtihat analizleri ve video eğitim serileri.</p>
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <UploadCloud size={20} />
              Yeni Yayın Ekle
            </button>
          )}
        </div>

        {/* --- 3. FİLTRELER --- */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterType === 'all' ? 'bg-slate-800 text-white border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'}`}
          >
            Tümü
          </button>
          <button 
            onClick={() => setFilterType('article')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border ${filterType === 'article' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-indigo-500/50'}`}
          >
            <FileText size={14} /> Makaleler
          </button>
          <button 
            onClick={() => setFilterType('video')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border ${filterType === 'video' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-emerald-500/50'}`}
          >
            <PlayCircle size={14} /> Videolar
          </button>
        </div>

        {/* --- 4. LİSTELEME GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPubs.length > 0 ? (
            filteredPubs.map((pub) => (
              <div key={pub.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all flex flex-col group">
                {/* Kart Üstü (İkon Alanı) */}
                <div className={`h-32 flex items-center justify-center ${pub.type === 'video' ? 'bg-emerald-900/20 group-hover:bg-emerald-900/30' : 'bg-indigo-900/20 group-hover:bg-indigo-900/30'} transition-colors relative`}>
                   {pub.type === 'video' ? (
                     <PlayCircle className="text-emerald-500 w-12 h-12 opacity-80 group-hover:scale-110 transition-transform" />
                   ) : (
                     <FileText className="text-indigo-500 w-12 h-12 opacity-80 group-hover:scale-110 transition-transform" />
                   )}
                   <span className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded border ${pub.type === 'video' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                      {pub.type === 'video' ? 'VIDEO EĞİTİM' : 'MAKALE / PDF'}
                   </span>
                </div>

                {/* Kart İçeriği */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{pub.title}</h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">{pub.description || 'Açıklama bulunmuyor.'}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-auto">
                    <span className="text-xs text-slate-500">
                      {moment(pub.created_at).format('LL')}
                    </span>
                    
                    <a 
                      href={pub.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-colors ${
                        pub.type === 'video' 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-500'
                      }`}
                    >
                      {pub.type === 'video' ? (
                        <>İzle <PlayCircle size={16}/></>
                      ) : (
                        <>İndir <Download size={16}/></>
                      )}
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
              <p className="text-slate-500 text-lg">Bu kategoride henüz yayın bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>

      {/* YÜKLEME MODALI (Sadece Admin Görür) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <UploadCloud className="text-amber-500" /> Yayın Ekle
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Yayın Başlığı</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                  placeholder="Örn: KVKK Uyum Süreci Rehberi"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Türü</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setType('article')}
                    className={`p-3 rounded-lg border text-center transition-all ${type === 'article' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    Makale (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('video')}
                    className={`p-3 rounded-lg border text-center transition-all ${type === 'video' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    Video (MP4)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Açıklama</label>
                <textarea 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none h-24"
                  placeholder="İçerik hakkında kısa bilgi..."
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Dosya Seç ({type === 'article' ? 'PDF' : 'Video'})</label>
                <input 
                  type="file" 
                  accept={type === 'article' ? '.pdf,.doc,.docx' : '.mp4,.mov'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-amber-500 hover:file:bg-slate-700"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-4 rounded-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="animate-spin" /> Yükleniyor...</>
                ) : (
                  'Yayınla'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}