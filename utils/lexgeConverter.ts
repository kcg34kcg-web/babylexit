import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// UYAP UYUMLU STİL DOSYASI
// Not: Bu yapı gerçek bir UDF dosyasından alınmıştır.
// UYAP Editör'ün "Format Bilgisi" hatası vermemesi için bu ID ve yapı şarttır.
const UDF_STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<styles>
  <style id="default" name="Normal" type="paragraph">
    <font-family>Times New Roman</font-family>
    <font-size>12</font-size>
    <bold>false</bold>
    <italic>false</italic>
    <underline>false</underline>
    <strike>false</strike>
    <color>#000000</color>
    <alignment>left</alignment>
  </style>
  <style id="bold_text" name="Kalın" type="character">
    <font-family>Times New Roman</font-family>
    <font-size>12</font-size>
    <bold>true</bold>
  </style>
  <style id="italic_text" name="İtalik" type="character">
    <font-family>Times New Roman</font-family>
    <font-size>12</font-size>
    <italic>true</italic>
  </style>
</styles>`;

export const exportToUDF = async (htmlContent: string) => {
  const zip = new JSZip();

  // HTML'i UYAP'ın seveceği hale getirelim
  // <p> etiketlerine varsayılan stilimizi ekliyoruz.
  // Bu sayede UYAP "Bu paragrafın stili ne?" diye sormaz.
  let formattedHtml = htmlContent;
  
  // Basit bir temizlik ve stil atama
  // Tüm paragrafları Times New Roman yapalım
  formattedHtml = `
    <html>
      <head>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
        </style>
      </head>
      <body>
        <div style="font-family: 'Times New Roman'; font-size: 12pt;">
          ${formattedHtml}
        </div>
      </body>
    </html>
  `;

  // --- 1. content.xml (İÇERİK) ---
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<UYAP_DOKUMAN>
  <GENEL_BILGILER>
    <AD>Babylexit Taslak</AD>
    <OLUSTURAN>Lexge Engine</OLUSTURAN>
    <TARIH>${new Date().toISOString()}</TARIH>
  </GENEL_BILGILER>
  <ICERIK>
    <![CDATA[
      ${formattedHtml}
    ]]>
  </ICERIK>
  <IMZA_BILGILERI></IMZA_BILGILERI>
</UYAP_DOKUMAN>`;

  // --- 2. DOSYALARI ZIP'E EKLE ---
  
  // İçerik dosyası
  zip.file("content.xml", xmlContent);
  
  // Stil dosyası (GÜNCELLENDİ)
  zip.file("styles.xml", UDF_STYLES_XML);

  // Meta dosyası (Gerekli olabilir)
  zip.file("meta.xml", `<?xml version="1.0" encoding="UTF-8"?><meta></meta>`);

  // --- 3. OLUŞTUR VE İNDİR ---
  const content = await zip.generateAsync({ type: "blob" });
  
  saveAs(content, `Dilekce_${Date.now()}.udf`);
};

export const saveAsLexge = (editorJson: any) => {
  const blob = new Blob([JSON.stringify(editorJson)], { type: "application/json" });
  saveAs(blob, `Taslak_${Date.now()}.lexge`);
};