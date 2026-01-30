'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, GraduationCap, Save, Loader2, TrendingUp, Wallet, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// 1. Veri Tipleri
interface ProfileData {
  id: string;
  full_name: string | null;
  reputation: number;
  credits: number;
  phone: string | null;
  address: string | null;
  university: string | null;
  avatar_url: string | null;
}

// 2. Ana Bileşen (Default Export Burası Olmalı)
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
   
  // Profil State'leri
  const [formData, setFormData] = useState<ProfileData>({
    id: '',
    full_name: '',
    reputation: 0,
    credits: 0,
    phone: '',
    address: '',
    university: '',
    avatar_url: ''
  });

  const supabase = createClient();
  const router = useRouter();

  // 3. Verileri Çekme (useEffect)
  useEffect(() => {
    const getProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setUserEmail(user.email || ''); 

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Profil yüklenirken hata:', error);
        }

        if (data) {
          setFormData({
            id: user.id,
            full_name: data.full_name || '',
            reputation: data.reputation || 0,
            credits: data.credits || 0,
            phone: data.phone || '',       
            address: data.address || '',   
            university: data.university || '', 
            avatar_url: data.avatar_url || ''
          });
        }
      } catch (error) {
        console.error('Beklenmedik hata:', error);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [router, supabase]);

  // 4. Güncelleme Fonksiyonu
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        university: formData.university,
        updated_at: new Date().toISOString(),
      })
      .eq('id', formData.id);

    if (error) {
      toast.error('Profil güncellenemedi!');
      console.error(error);
    } else {
      toast.success('Profil başarıyla güncellendi! ✅');
    }
    setSaving(false);
  };

  // 5. Yükleniyor Ekranı
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  // 6. Ana Arayüz (Return)
  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* GERİ DÖN BUTONU */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors mb-4 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Geri Dön</span>
        </button>

        {/* BAŞLIK & ÖZET KARTLARI */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sol: Profil Kartı */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center gap-6 shadow-xl">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-amber-500 font-bold text-3xl border-2 border-amber-500">
              {(formData.full_name?.[0] || userEmail[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{formData.full_name || 'Kullanıcı'}</h1>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <Mail size={14} /> {userEmail}
              </p>
            </div>
          </div>

          {/* Sağ: İstatistikler */}
          <div className="flex gap-4">
             {/* Kredi Kartı */}
            <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-6 min-w-[160px] text-white shadow-lg flex flex-col justify-between">
               <div className="flex items-center gap-2 text-amber-100 text-sm font-bold uppercase tracking-wider">
                  <Wallet size={16} /> Kredi
               </div>
               <div className="text-4xl font-bold">{formData.credits} 🪙</div>
            </div>

            {/* Reputasyon Kartı */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 min-w-[160px] text-white shadow-lg flex flex-col justify-between">
               <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider">
                  <TrendingUp size={16} /> Puan
               </div>
               <div className="text-4xl font-bold text-amber-500">{formData.reputation}</div>
            </div>
          </div>
        </div>

        {/* DÜZENLEME FORMU */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="text-amber-500" />
            Kişisel Bilgiler
          </h2>

          <form onSubmit={handleUpdate} className="grid md:grid-cols-2 gap-6">
            
            {/* Ad Soyad */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Ad Soyad</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  placeholder="Adınız Soyadınız"
                />
              </div>
            </div>

            {/* Üniversite / Unvan */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Üniversite / Unvan</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="text"
                  value={formData.university || ''}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  placeholder="Örn: İstanbul Üniversitesi Hukuk Fakültesi"
                />
              </div>
            </div>

            {/* Telefon */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Telefon Numarası</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-500" size={18} />
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            {/* Adres */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">Adres</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                <textarea
                  rows={3}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                  placeholder="Açık adresiniz..."
                />
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="md:col-span-2 flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Değişiklikleri Kaydet
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}