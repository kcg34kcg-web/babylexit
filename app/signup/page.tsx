'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Phone, 
  ArrowRight,
  ShieldCheck 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- 1. GENİŞLETİLMİŞ YASAKLI KELİME KÖKLERİ ---
const BAD_WORDS_ROOTS = [
  // Sistem Kelimeleri
  'admin', 'root', 'support', 'destek', 'moderatör', 'moderator', 'yonetici', 'babylexit', 'system',
  // TR Argo/Küfür
  'amk', 'aq', 'oç', 'oc', 'pic', 'piç', 'yarak', 'yarrak', 'sik', 'sokuk', 'siki', 'göt', 'got', 'meme', 'taşak', 'tasak', 'kaşar', 'kasar', 'orospu', 'orosbu', 'fahişe', 'fahise', 'pezevenk', 'ibne', 'puşt', 'pust', 'kaltak', 'yavşak', 'yavsak', 'ananı', 'anani',
  // EN Argo/Küfür
  'sex', 'porn', 'porno', 'adult', 'xxx', 'fuck', 'shit', 'ass', 'bitch', 'bastard', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nude', 'nudes',
  // Şiddet/Yasadışı/Diğer
  'terror', 'terör', 'isis', 'fetö', 'feto', 'deaş', 'illegal', 'hack', 'hacker', 'crack', 'warez', 'bet', 'bahis', 'kumar', 'casino', 'şeytan', 'seytan', 'ateş', 'ates', 'cehennem', 'death', 'kill', 'suicide'
];

// --- 2. AKILLI KÜFÜR KONTROL FONKSİYONU ---
const containsProfanity = (text: string): boolean => {
  if (!text) return false;

  // A: Küçük harfe çevir
  let normalized = text.toLowerCase();

  // B: Leetspeak Haritası (Rakam/Sembol -> Harf)
  const leetMap: { [key: string]: string } = {
    '1': 'i', '!': 'i', 'l': 'i', 
    '3': 'e', '4': 'a', '@': 'a',
    '0': 'o', '5': 's', '$': 's',
    '7': 't', '+': 't', 
    '8': 'b', '9': 'g', '6': 'g',
    'v': 'u', 'z': 's'
  };

  // C: Harf ve rakam dışındaki her şeyi sil (nokta, boşluk vs.)
  const cleanText = normalized.replace(/[^a-z0-9]/g, ''); 
  
  // D: Leetspeak temizliği yap
  let leetText = cleanText;
  for (const [key, value] of Object.entries(leetMap)) {
    leetText = leetText.split(key).join(value);
  }

  // E: Kontrol Et
  return BAD_WORDS_ROOTS.some(badWord => {
    // 1. Temizlenmiş metinde var mı?
    if (cleanText.includes(badWord)) return true;
    // 2. Leetspeak çözülmüş metinde var mı?
    if (leetText.includes(badWord)) return true;
    return false;
  });
};

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  // --- STATE'LER ---
  const [step, setStep] = useState<'form' | 'verify'>('form'); // Form mu, Doğrulama mı?
  const [method, setMethod] = useState<'email' | 'phone'>('email'); // E-posta mı, Telefon mu?
  
  // Form Verileri
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState(''); // Email veya Telefon buraya yazılır
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Validasyon State'leri
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0); // Geri sayım

  // --- KULLANICI ADI KONTROLÜ (Gelişmiş Versiyon) ---
  useEffect(() => {
    const checkUsername = async () => {
      // 1. Uzunluk Kontrolü
      if (username.length < 3) {
        setUsernameStatus('idle');
        setUsernameError('');
        return;
      }
      setUsernameStatus('checking');

      // 2. Format Kontrolü (Sadece harf, rakam, alt çizgi)
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setUsernameStatus('invalid');
        setUsernameError('Sadece İngilizce harf, rakam ve alt çizgi.');
        return;
      }

      // 3. Akıllı Küfür Filtresi
      if (containsProfanity(username)) {
        setUsernameStatus('invalid');
        setUsernameError('Bu kullanıcı adı kurallara uygun değil.');
        return;
      }

      // 4. Veritabanı Benzersizlik Kontrolü
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUsernameStatus('invalid');
          setUsernameError('Bu kullanıcı adı zaten alınmış.');
        } else {
          setUsernameStatus('valid');
          setUsernameError('');
        }
      } catch (err) {
        console.error("Username check error:", err);
        // Hata olsa bile kullanıcıyı engellememek için valid sayabiliriz veya tekrar denetebiliriz
        // Şimdilik hata mesajı göstermeden valid kabul edelim (UX tercihi)
        setUsernameStatus('valid'); 
      }
    };

    const timer = setTimeout(() => { if (username) checkUsername(); }, 500);
    return () => clearTimeout(timer);
  }, [username, supabase]);

  // --- GERİ SAYIM SAYACI ---
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // --- ADIM 1: KAYIT BAŞLAT (OTP GÖNDER) ---
  const handleSignupStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== 'valid') return toast.error("Geçerli bir kullanıcı adı seçin.");
    
    setLoading(true);

    try {
      let error;

      if (method === 'email') {
        // E-posta ile Kayıt (Supabase Magic Link/OTP gönderir)
        const res = await supabase.auth.signUp({
          email: contact,
          password: password,
          options: {
            data: { full_name: fullName, username: username },
          },
        });
        error = res.error;
      } else {
        // Telefon ile Kayıt (Supabase SMS gönderir - SMS Provider ayarlı olmalı)
        const res = await supabase.auth.signUp({
          phone: contact,
          password: password,
          options: {
            data: { full_name: fullName, username: username },
          },
        });
        error = res.error;
      }

      if (error) throw error;

      // Başarılı ise doğrulama ekranına geç
      toast.success(`Doğrulama kodu ${method === 'email' ? 'e-postana' : 'telefonuna'} gönderildi!`);
      setStep('verify');
      setCountdown(60); // 60 saniye bekleme süresi

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Kayıt başlatılamadı.");
    } finally {
      setLoading(false);
    }
  };

  // --- ADIM 2: OTP DOĞRULA (HATASIZ VERSİYON) ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;

      // TypeScript hatasını önlemek için işlemleri ayırıyoruz
      if (method === 'email') {
        response = await supabase.auth.verifyOtp({
          email: contact,
          token: otpCode,
          type: 'signup', // E-posta kaydı doğrulaması
        });
      } else {
        response = await supabase.auth.verifyOtp({
          phone: contact,
          token: otpCode,
          type: 'sms',   // Telefon doğrulaması
        });
      }

      const { data, error } = response;

      if (error) throw error;

      // Profil tablosunu güncelle (Garanti olsun)
      if (data.user) {
         // Güncellenecek veriyi hazırlıyoruz
         const updates: any = {
            full_name: fullName,
            username: username,
            updated_at: new Date().toISOString(),
         };
         
         // Hangi yöntemle kayıt olduysa onu kaydet
         if (method === 'phone') {
            updates.phone = contact;
         } else {
            updates.email = contact;
         }

         await supabase.from('profiles').update(updates).eq('id', data.user.id);
      }

      toast.success("Hesap doğrulandı! Giriş yapılıyor...");
      router.push('/'); 

    } catch (err: any) {
      console.error("OTP Error:", err);
      toast.error(err.message || "Hatalı veya süresi geçmiş kod.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-800 p-4">
      <div className="bg-white dark:bg-[#1e293b] p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 transition-all">
        
        {/* BAŞLIK */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#1e293b] dark:text-[#f59e0b]">
            {step === 'form' ? 'Babylexit\'e Katıl' : 'Hesabı Doğrula'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {step === 'form' 
              ? 'Hukuki yolculuğunda yapay zeka yanında.' 
              : `${contact} adresine gelen kodu gir.`}
          </p>
        </div>

        {step === 'form' ? (
          /* --- ADIM 1: KAYIT FORMU --- */
          <form onSubmit={handleSignupStart} className="space-y-4">
            
            {/* Sekmeler (Email / Telefon) */}
            <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => { setMethod('email'); setContact(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  method === 'email' 
                    ? 'bg-white dark:bg-zinc-700 text-amber-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Mail size={16} /> E-Posta
              </button>
              <button
                type="button"
                onClick={() => { setMethod('phone'); setContact(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  method === 'phone' 
                    ? 'bg-white dark:bg-zinc-700 text-amber-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Phone size={16} /> Telefon
              </button>
            </div>

            {/* Ad Soyad */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1 ml-1">Ad Soyad</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                placeholder="Adın Soyadın"
                required
              />
            </div>

            {/* Kullanıcı Adı */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1 ml-1">Kullanıcı Adı</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-700 border text-slate-900 dark:text-white focus:outline-none transition-all ${
                    usernameStatus === 'invalid' ? 'border-red-500 focus:ring-red-500' : 
                    usernameStatus === 'valid' ? 'border-green-500 focus:ring-green-500' : 'border-slate-200 dark:border-zinc-600 focus:ring-2 focus:ring-amber-500'
                  }`}
                  placeholder="kullanici_adi"
                  required
                  minLength={3}
                />
                <div className="absolute right-3 top-3">
                  {usernameStatus === 'checking' && <Loader2 className="animate-spin text-slate-400" size={18} />}
                  {usernameStatus === 'valid' && <CheckCircle2 className="text-green-500" size={18} />}
                  {usernameStatus === 'invalid' && <XCircle className="text-red-500" size={18} />}
                </div>
              </div>
              {usernameStatus === 'invalid' && <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">{usernameError}</p>}
            </div>

            {/* İletişim (Email/Tel) */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1 ml-1">
                {method === 'email' ? 'E-Posta Adresi' : 'Telefon Numarası'}
              </label>
              <input
                type={method === 'email' ? 'email' : 'tel'}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                placeholder={method === 'email' ? 'ornek@email.com' : '+90555...'}
                required
              />
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1 ml-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                placeholder="******"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || usernameStatus !== 'valid'}
              className="w-full bg-[#1e293b] hover:bg-zinc-700 text-[#f59e0b] font-bold py-3 rounded-xl shadow-lg shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Kayıt Ol <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          /* --- ADIM 2: OTP DOĞRULAMA FORMU --- */
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
               <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto mb-2" />
               <p className="text-sm text-amber-700 dark:text-amber-500 font-medium">Güvenlik için doğrulama şart.</p>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 text-center">Doğrulama Kodu</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono rounded-xl bg-slate-50 dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                placeholder="123456"
                required
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Doğrula ve Tamamla"}
            </button>

            <div className="text-center">
                {countdown > 0 ? (
                    <p className="text-xs text-slate-500">Kodu tekrar göndermek için: {countdown}sn</p>
                ) : (
                    <button 
                        type="button" 
                        onClick={() => { setStep('form'); }} 
                        className="text-sm text-amber-500 hover:underline"
                    >
                        Bilgileri düzenle veya tekrar gönder
                    </button>
                )}
            </div>
          </form>
        )}

        {/* --- FOOTER --- */}
        <p className="text-center text-slate-600 dark:text-slate-400 text-sm mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          Zaten hesabın var mı? {' '}
          <Link href="/login" className="text-[#f59e0b] hover:underline font-bold">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}