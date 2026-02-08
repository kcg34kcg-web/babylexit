import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Brain, Zap, Coins, Users, ShieldAlert } from "lucide-react";

// 🛑 GÜVENLİK AYARI: Buraya kendi email adresini yaz.
const ADMIN_EMAILS = ["seninmailin@gmail.com", "digeradmin@site.com"];

export default async function SecretAdminPage() {
  const supabase = await createClient();

  // 1. GÜVENLİK KONTROLÜ (KAPICI) 🛡️
  // URL gizli olsa bile, kazara bulan biri girmesin diye kimlik kontrolü yapıyoruz.
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
    // Yetkisiz giriş denemesi! Ana sayfaya fırlat.
    return redirect("/"); 
  }

  // --- Buradan sonrası sadece sana özel ---

  // Son 1000 log kaydını çek
  const { data: logs } = await supabase
    .from('ai_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!logs) return <div className="p-10">Veriler yükleniyor...</div>;

  // --- İSTATİSTİK HESAPLAMA ---
  const totalRequests = logs.length;
  const apiCalls = logs.filter(l => l.source === 'api').length;
  const savedCalls = totalRequests - apiCalls;
  const savingsRate = totalRequests > 0 ? ((savedCalls / totalRequests) * 100).toFixed(1) : "0";
  
  // Tahmini para kazancı (1 API çağrısı = 0.0005$ varsayımıyla)
  const moneySaved = (savedCalls * 0.0005).toFixed(4);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Üst Başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldAlert className="text-red-600" />
              Komuta Merkezi
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Bu alan gizlidir. IP Adresiniz: Sistem tarafından izlenmektedir.
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border text-sm shadow-sm">
             Admin: <span className="font-semibold text-gray-800">{user.email}</span>
          </div>
        </div>
      
        {/* İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard 
            title="Toplam Sorgu" 
            value={totalRequests} 
            icon={<Brain className="text-purple-500" />} 
          />
          <StatsCard 
            title="Tasarruf Oranı" 
            value={`%${savingsRate}`} 
            subtext="Redis & Topluluk"
            icon={<Zap className="text-yellow-500" />} 
          />
          <StatsCard 
            title="API Çağrısı" 
            value={apiCalls} 
            subtext="Google'a giden"
            icon={<Users className="text-blue-500" />} 
          />
          <StatsCard 
            title="Tahmini Kazanç" 
            value={`$${moneySaved}`} 
            icon={<Coins className="text-green-500" />} 
          />
        </div>

        {/* LOG TABLOSU */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold flex justify-between">
            <span>Canlı Sistem Trafiği</span>
            <span className="text-xs font-normal text-gray-500">Son 1000 işlem</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Kaynak</th>
                  <th className="px-6 py-3">Durum</th>
                  <th className="px-6 py-3">Süre</th>
                  <th className="px-6 py-3">Zaman</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <span className={`px-2 py-1 rounded text-xs border ${
                        log.source === 'redis' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        log.source === 'community' ? 'bg-green-50 text-green-700 border-green-200' :
                        log.source === 'static' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        log.source === 'api' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {log.source.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.cost_saved ? (
                        <span className="text-green-600 flex items-center gap-1 font-medium">
                          <Zap size={14} fill="currentColor" /> Tasarruf
                        </span>
                      ) : (
                        <span className="text-blue-600 flex items-center gap-1">
                          💸 Ücretli
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">{log.latency_ms} ms</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(log.created_at).toLocaleTimeString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Kart Bileşeni
function StatsCard({ title, value, icon, subtext }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-gray-800">{value}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className="p-3 bg-gray-50 rounded-full border border-gray-100">{icon}</div>
    </div>
  );
}