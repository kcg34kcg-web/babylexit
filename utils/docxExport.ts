// utils/docxExport.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

// HTML'i analiz edip Word parçalarına çeviren yardımcı fonksiyon
const parseHtmlToDocx = (html: string): Paragraph[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const paragraphs: Paragraph[] = [];

  // Body içindeki her bir elemanı (P, H1, H2 vb.) dön
  Array.from(doc.body.childNodes).forEach((node) => {
    if (node.nodeName === "P" || /^H[1-6]$/.test(node.nodeName)) {
      const htmlElement = node as HTMLElement;
      const children: TextRun[] = [];

      // Paragrafın içindeki metin parçalarını (kalın, italik vb.) dön
      Array.from(htmlElement.childNodes).forEach((child) => {
        let text = child.textContent || "";
        if (!text) return;

        let isBold = false;
        let isItalic = false;
        let isUnderline = false;

        // Eğer bu bir element ise (örn: <strong>text</strong>) stilleri kontrol et
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          // Tiptap kalın için <strong> veya <b>, italik için <em> veya <i> kullanır
          if (el.tagName === "STRONG" || el.tagName === "B") isBold = true;
          if (el.tagName === "EM" || el.tagName === "I") isItalic = true;
          if (el.tagName === "U") isUnderline = true;
          
          // İç içe stiller varsa (örn: <strong><em>text</em></strong>)
          // Bu basit MVP sürümünde en dıştaki etiketi baz alıyoruz.
          // İleride recursive (özyinelemeli) fonksiyon ile geliştirilebilir.
        }

        children.push(
          new TextRun({
            text: text,
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? { type: "single", color: "000000" } : undefined,
            font: "Times New Roman", // Hukuk standardı
            size: 24, // Word'de 24 "half-point" = 12 punto demektir.
          })
        );
      });

      // Başlık seviyesini belirle
      let headingLevel = undefined;
      if (node.nodeName === "H1") headingLevel = HeadingLevel.HEADING_1;
      if (node.nodeName === "H2") headingLevel = HeadingLevel.HEADING_2;

      paragraphs.push(
        new Paragraph({
          children: children,
          heading: headingLevel,
          spacing: {
            after: 200, // Paragraf sonrası biraz boşluk
            line: 360, // 1.5 satır aralığı (Hukuk standardı genelde 1.5'tur)
          },
          alignment: AlignmentType.JUSTIFIED, // İki yana yasla
        })
      );
    }
  });

  return paragraphs;
};

export const exportToDocx = async (htmlContent: string) => {
  // 1. HTML'i Word paragraflarına çevir
  const docxParagraphs = parseHtmlToDocx(htmlContent);

  // 2. Word Dokümanını Oluştur
  const doc = new Document({
    creator: "Babylexit AI",
    description: "Babylexit Draft Tool ile oluşturulmuştur.",
    title: "Hukuki Taslak",
    sections: [
      {
        properties: {},
        children: [
          // Sayfa başına bir başlık ekleyelim
          new Paragraph({
            text: "BABYLEXIT TASLAK METNİ",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          ...docxParagraphs, // Bizim çevirdiğimiz içerik buraya gelir
          // Alt bilgi (Footer gibi)
          new Paragraph({
            children: [
                new TextRun({
                    text: "\n--- Bu belge Babylexit AI tarafından oluşturulmuştur ---",
                    italics: true,
                    size: 16,
                    color: "888888"
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 }
          })
        ],
      },
    ],
  });

  // 3. Dosyayı Paketle ve İndir
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Babylexit_Taslak_${Date.now()}.docx`);
};