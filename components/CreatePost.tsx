"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client"; 
import { Calendar, MapPin, Image as ImageIcon, Loader2, X, Clock, Globe, Building2 } from "lucide-react"; 
import { cn } from "@/utils/cn";
// ÖNEMLİ: Yukarıda oluşturduğumuz dosyayı import ediyoruz
import { ALL_LOCATIONS, LocationItem, LocationType } from "@/utils/locations"; 

export default function CreatePost({ userId }: { userId: string }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Event State
  const [isEventMode, setIsEventMode] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  // Arama State'leri
  const [filteredLocations, setFilteredLocations] = useState<LocationItem[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationWrapperRef = useRef<HTMLDivElement>(null);
  const [isOverflowVisible, setIsOverflowVisible] = useState(false);

  const supabase = createClient();

  // Animasyon için overflow kontrolü
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isEventMode) {
      timeout = setTimeout(() => setIsOverflowVisible(true), 300);
    } else {
      setIsOverflowVisible(false);
    }
    return () => clearTimeout(timeout);
  }, [isEventMode]);

  // Dropdown dışına tıklanırsa kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const year = parseInt(val.split("-")[0]);
      if (year > 2034) {
        alert("Etkinlik tarihi 2034 yılından sonrasına ayarlanamaz.");
        setDateInput("");
        return;
      }
    }
    setDateInput(val);
  };

  // --- OPTİMİZE EDİLMİŞ ARAMA ---
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.target.value;
    setEventLocation(userInput);

    if (userInput.length > 0) {
      // 1. Filtreleme işlemi
      const filtered = ALL_LOCATIONS.filter(item => 
        item.name.toLocaleLowerCase('tr').includes(userInput.toLocaleLowerCase('tr'))
      );
      // 2. Performans Koruması: Sadece ilk 20 sonucu göster (DOM şişmez)
      setFilteredLocations(filtered.slice(0, 20));
      setShowLocationDropdown(true);
    } else {
      setShowLocationDropdown(false);
    }
  };

  const selectLocation = (locName: string) => {
    setEventLocation(locName);
    setShowLocationDropdown(false);
  };

  const getLocationIcon = (type: LocationType) => {
    switch (type) {
        case 'country': return <Globe size={16} className="text-blue-500" />;
        case 'venue': return <Building2 size={16} className="text-orange-500" />;
        case 'district': return <MapPin size={16} className="text-purple-500" />;
        case 'city': return <MapPin size={16} className="text-emerald-500" />;
        default: return <MapPin size={16} className="text-gray-400" />;
    }
  };

  const handleUpload = async () => {
    if (!content) return alert("Hukuki bir şeyler yazmalısın!");
    
    setLoading(true);

    try {
      let imageUrl = null;
      if (file) {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1080, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        const fileName = `${userId}/${Date.now()}.webp`;
        
        const { error: uploadError } = await supabase.storage
          .from("post-attachments")
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("post-attachments")
          .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
      }

      // Tarih ve Saati Birleştirme (Opsiyonel olduğu için kontrol ediyoruz)
      let finalEventDate = null;
      if (isEventMode && dateInput) {
        const timePart = timeInput || "00:00";
        finalEventDate = new Date(`${dateInput}T${timePart}`).toISOString();
      }

      const payload: any = {
        user_id: userId,
        content: content,
        image_url: imageUrl,
        category: "teori",
        is_event: isEventMode,
        // Tarih yoksa null gider
        event_date: finalEventDate,
        // Konum yoksa null gider
        event_location: (isEventMode && eventLocation) ? { name: eventLocation } : null,
        event_status: isEventMode ? 'upcoming' : null
      };

      // Veriyi eklerken aynı zamanda profil verilerini de çekiyoruz (Join)
      const { data, error: dbError } = await supabase
        .from("posts")
        .insert(payload)
        .select(`
          *, 
          profiles (
            full_name, 
            avatar_url, 
            username, 
            reputation
          )
        `) 
        .single();

      if (dbError) throw dbError;

      // Sayfa yenilemeden güncellemek için event fırlatıyoruz
      const newPostEvent = new CustomEvent('new-post-created', { detail: data });
      window.dispatchEvent(newPostEvent);

      // Temizlik
      setContent("");
      setFile(null);
      setIsEventMode(false);
      setDateInput("");
      setTimeInput("");
      setEventLocation("");

    } catch (error) {
      console.error("Hata:", error);
      alert("Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
      
      {/* İÇERİK ALANI */}
      <div className="relative group">
        <textarea
          className="w-full bg-transparent text-gray-800 placeholder:text-gray-400 p-2 text-lg outline-none resize-none min-h-[90px] font-medium leading-relaxed"
          placeholder={isEventMode ? "Etkinlik detaylarını, gündemi ve amacı buraya gir..." : "Hukuki bir analiz paylaş veya topluluğa danış..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-gray-100 group-focus-within:bg-blue-500/50 transition-colors" />
      </div>

      {/* GENİŞLEYEN ALAN (Tarih & Konum) */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out gap-3 px-1",
        isEventMode ? "grid-rows-[1fr] opacity-100 py-4" : "grid-rows-[0fr] opacity-0",
        isOverflowVisible ? "overflow-visible" : "overflow-hidden"
      )}>
        <div className="min-h-0 flex flex-col gap-3">
            
            <div className="flex flex-col md:flex-row gap-3">
              {/* TARİH */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl flex items-center px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                  <Calendar size={18} className="text-gray-400 mr-2 shrink-0" />
                  <input 
                      type="date"
                      max="2034-12-31" 
                      className="bg-transparent border-none text-sm text-gray-700 w-full outline-none font-medium uppercase"
                      value={dateInput}
                      onChange={handleDateChange}
                  />
              </div>

              {/* SAAT (Opsiyonel) */}
              <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 rounded-xl flex items-center px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                  <Clock size={18} className="text-gray-400 mr-2 shrink-0" />
                  <input 
                      type="time"
                      className="bg-transparent border-none text-sm text-gray-700 w-full outline-none font-medium"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                  />
                  <span className="text-[10px] text-gray-400 ml-1 whitespace-nowrap">(Opsiyonel)</span>
              </div>
            </div>

            {/* KONUM (Akıllı Liste) */}
            <div 
                ref={locationWrapperRef}
                className="group relative bg-gray-50 border border-gray-200 rounded-xl flex flex-col justify-center px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all"
            >
                <div className="flex items-center w-full">
                    <MapPin size={18} className="text-gray-400 mr-3 group-focus-within:text-blue-500 shrink-0 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Konum, İlçe veya Adliye Ara (Opsiyonel)..."
                        className="bg-transparent border-none text-sm text-gray-700 w-full outline-none placeholder:text-gray-400 font-medium"
                        value={eventLocation}
                        onChange={handleLocationChange}
                        onFocus={() => eventLocation.length > 0 && setShowLocationDropdown(true)}
                        autoComplete="off"
                    />
                    {eventLocation && (
                        <button onClick={() => {setEventLocation(""); setShowLocationDropdown(false)}} className="text-gray-400 hover:text-red-500 ml-2">
                           <X size={14} />
                        </button>
                    )}
                </div>

                {/* Dropdown */}
                {showLocationDropdown && (
                    <div className="absolute top-[115%] left-0 w-full max-h-[220px] overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] z-[9999]">
                        {filteredLocations.map((loc, index) => (
                            <div 
                                key={index}
                                onClick={() => selectLocation(loc.name)}
                                className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    {getLocationIcon(loc.type)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">{loc.name}</span>
                                    {loc.detail && <span className="text-[10px] text-gray-400">{loc.detail}</span>}
                                    {!loc.detail && loc.type === 'country' && <span className="text-[10px] text-blue-400 font-medium">Ülke</span>}
                                </div>
                            </div>
                        ))}
                        {filteredLocations.length === 0 && eventLocation && (
                             <div 
                                onClick={() => selectLocation(eventLocation)}
                                className="px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3"
                             >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    <MapPin size={16} className="text-gray-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">"{eventLocation}"</span>
                                    <span className="text-[10px] text-gray-400">Özel Konum Olarak Kullan</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* BUTONLAR */}
      <div className="flex items-center justify-between pt-3 mt-1">
        <div className="flex items-center gap-1">
            <label className={cn(
                "p-2.5 rounded-full cursor-pointer transition-all flex items-center justify-center border border-transparent",
                file ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            )} title="Görsel Ekle">
                <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <ImageIcon size={20} strokeWidth={1.5} />
            </label>

            <button 
                onClick={() => setIsEventMode(!isEventMode)}
                className={cn(
                "p-2.5 rounded-full transition-all flex items-center justify-center border border-transparent",
                isEventMode 
                    ? "bg-blue-50 text-blue-600 border-blue-100" 
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                )}
                title={isEventMode ? "Etkinlik Modunu Kapat" : "Etkinlik Oluştur"}
            >
                {isEventMode ? <X size={20} strokeWidth={1.5} /> : <Calendar size={20} strokeWidth={1.5} />}
            </button>
        </div>
        
        <button
          onClick={handleUpload}
          disabled={loading || !content}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 transform active:scale-95",
            isEventMode 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/30" 
                : "bg-gray-900 hover:bg-black text-white shadow-lg shadow-gray-200/50",
            (loading || !content) && "opacity-50 cursor-not-allowed shadow-none grayscale"
          )}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {isEventMode ? "Bileti Oluştur" : "Paylaş"}
        </button>
      </div>

      {file && (
        <div className="mt-3 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {file.name}
        </div>
      )}
    </div>
  );
}