// utils/uyapHelper.ts
import { Editor } from '@tiptap/react';
import toast from 'react-hot-toast';

// 1. HTML TEMİZLEME (UYAP İÇİN)
// Gereksiz CSS'leri atar, sadece UYAP'ın sevdiği Times New Roman ve puntoları bırakır.
export const cleanForUYAP = (html: string): string => {
  let clean = html
    // --- YENİ EKLENEN: Hizalama Dönüşümleri (Stilleri silmeden önce yapıyoruz) ---
    // Tiptap "text-align: center" verir, UYAP "align='center'" attribute'unu sever.
    .replace(/style="text-align: center"/gi, 'align="center"')
    .replace(/style="text-align: right"/gi, 'align="right"')
    .replace(/style="text-align: justify"/gi, 'align="justify"')
    .replace(/style="text-align: left"/gi, 'align="left"')
    
    // --- YENİ EKLENEN: Tablo İyileştirmesi ---
    // UYAP'ta tabloların çizgilerinin çıkması için border="1" zorunludur.
    .replace(/<table[^>]*>/gi, '<table border="1" cellspacing="0" cellpadding="5" width="100%">')
    .replace(/<td[^>]*>/gi, '<td valign="top"') // Hücreleri yukarı hizala
    
    // --- MEVCUT TEMİZLİK KODLARI ---
    // Font ailesini zorla
    .replace(/font-family:[^;"]*(;)?/gi, '') 
    .replace(/font-size:[^;"]*(;)?/gi, '')
    // Tüm style taglerini temizle (Hizalamayı yukarıda kurtardık, kalanı siliyoruz)
    .replace(/ style="[^"]*"/gi, '')
    
    // Başlıkları paragrafa çevir (UYAP h1, h2 sevmez, stil olarak sever)
    .replace(/<h1>/gi, '<p align="center"><strong><span style="font-size:14pt">')
    .replace(/<\/h1>/gi, '</span></strong></p>')
    .replace(/<h2>/gi, '<p align="center"><strong><span style="font-size:12pt">')
    .replace(/<\/h2>/gi, '</span></strong></p>')
    
    // Boşlukları düzelt
    .replace(/&nbsp;/g, ' ')
    .trim();

  // En dışa UYAP standart wrapper'ı ekle
  return `
    <html>
      <body style="font-family: 'Times New Roman', serif; font-size: 12pt; color: #000000;">
        ${clean}
      </body>
    </html>
  `;
};

// 2. HTML -> RTF ÇEVİRİCİ (GELİŞMİŞ VERSİYON)
// Bu fonksiyon temel metin biçimlendirmelerini RTF kodlarına çevirir.
export const htmlToRTF = (html: string): string => {
  // RTF Başlığı (Türkçe karakter seti 1254 ile)
  let rtf = '{\\rtf1\\ansi\\ansicpg1254\\deff0\\nouicompat\\deflang1055';
  rtf += '{\\fonttbl{\\f0\\froman\\fcharset162 Times New Roman;}}'; // fcharset162 = Türkçe
  rtf += '{\\colortbl;\\red0\\green0\\blue0;}';
  rtf += '\\viewkind4\\uc1\\pard\\lang1055\\f0\\fs24 '; // fs24 = 12 punto

  // İçeriği işle
  let content = html
    // Basit etiket değişimleri
    .replace(/<strong>/gi, '\\b ')
    .replace(/<\/strong>/gi, '\\b0 ')
    .replace(/<b>/gi, '\\b ')
    .replace(/<\/b>/gi, '\\b0 ')
    .replace(/<em>/gi, '\\i ')
    .replace(/<\/em>/gi, '\\i0 ')
    .replace(/<i>/gi, '\\i ')
    .replace(/<\/i>/gi, '\\i0 ')
    .replace(/<u>/gi, '\\ul ')
    .replace(/<\/u>/gi, '\\ulnone ')
    
    // Paragraflar
    .replace(/<p>/gi, '\\par ')
    .replace(/<\/p>/gi, '\\par ')
    
    // --- YENİ EKLENEN: Hizalama RTF Kodları ---
    // \qc = Center, \qr = Right, \qj = Justify, \ql = Left
    .replace(/align="center"/gi, '\\qc ')
    .replace(/style="text-align: center"/gi, '\\qc ')
    .replace(/align="right"/gi, '\\qr ')
    .replace(/style="text-align: right"/gi, '\\qr ')
    .replace(/align="justify"/gi, '\\qj ')
    .replace(/style="text-align: justify"/gi, '\\qj ')
    
    // Listeler (Basit simülasyon)
    .replace(/<ul>|<ol>/gi, '')
    .replace(/<\/ul>|<\/ol>/gi, '\\par ')
    .replace(/<li>/gi, '\\par \\bullet ')
    .replace(/<\/li>/gi, '')
    
    // HTML taglerini temizle (kalanları)
    .replace(/<[^>]+>/g, '')
    // HTML entity'leri temizle
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Türkçe karakterleri RTF hex kodlarına çevirmek gerekebilir
  // Ancak modern panolar Unicode RTF'i genelde tolere eder. 
  // Sorun çıkarsa buraya bir "Turkish Char to RTF Hex" fonksiyonu ekleriz.

  rtf += content;
  rtf += '\\par }';
  return rtf;
};

// 3. PANOYA KOPYALAMA (SİHİRLİ FONKSİYON)
export const copyToClipboardMultiMime = async (editor: Editor) => {
  if (!editor) return;

  const rawHtml = editor.getHTML();
  const plainText = editor.getText();
  
  // Formatları hazırla
  const cleanHtml = cleanForUYAP(rawHtml);
  // RTF çeviriciye rawHTML veriyoruz ki style="text-align" gibi css'leri yakalayabilsin
  const rtfContent = htmlToRTF(rawHtml); 

  try {
    // Clipboard API - Multi MIME Type
    // Bu sayede UYAP hangisini seviyorsa onu alacak
    const data = [new ClipboardItem({
      'text/html': new Blob([cleanHtml], { type: 'text/html' }),
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
      'text/rtf': new Blob([rtfContent], { type: 'text/rtf' }), 
    })];

    await navigator.clipboard.write(data);
    // Mesajı biraz daha detaylandırdık
    toast.success("UYAP formatında kopyalandı! (HTML + RTF + Hizalama)");
    return true;
  } catch (err) {
    console.error("Gelişmiş kopyalama hatası:", err);
    // Fallback: Eski usül sadece text kopyala
    try {
      await navigator.clipboard.writeText(plainText);
      toast('Sadece düz metin kopyalandı (Tarayıcı kısıtlaması)', { icon: '⚠️' });
    } catch (e) {
      toast.error("Kopyalama başarısız.");
    }
    return false;
  }
};