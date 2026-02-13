'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';

// --- YENİ EKLENTİLER (Hizalama ve Tablo için - Named Exports) ---
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// --- YENİ EKLENTİ: KANUN TAMAMLAMA ---
import Mention from '@tiptap/extension-mention';
import suggestion from './editor/extensions/suggestion'; // Önceki adımda oluşturduğun dosya

import { 
  Bold, Italic, Underline as UnderlineIcon, List, 
  ListOrdered, Quote, Undo, Redo, Save, FileText, Copy, Check, AlertTriangle,
  // Yeni İkonlar
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Table as TableIcon
} from 'lucide-react';

import { exportToDocx } from '@/utils/docxExport';
import { saveAsLexge } from '@/utils/lexgeConverter';
import { copyToClipboardMultiMime } from '@/utils/uyapHelper'; // Yeni helper'ı bağlıyoruz
import { useState } from 'react';
import toast from 'react-hot-toast';

// Toolbar Butonu Bileşeni
interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  icon: any; 
  title?: string; // İpucu (Tooltip) için
}

const ToolbarButton = ({ onClick, isActive, icon: Icon, title }: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
      isActive ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
    type="button"
  >
    <Icon size={18} />
  </button>
);

const TextEditor = () => {
  const [isCopied, setIsCopied] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      // --- YENİ: Hizalama (setTextAlign hatasını çözer) ---
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // --- YENİ: Tablo Yapısı (insertTable hatasını çözer) ---
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full border border-slate-600 my-4',
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-600 p-2 relative',
        },
      }),
      // --- YENİ: KANUN MADDESİ TAMAMLAMA ---
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded border border-amber-500/30 font-medium decoration-clone cursor-help',
        },
        suggestion, // suggestion.ts dosyasından gelen mantık
        renderLabel({ options, node }) {
            // Editörde görünecek metin (örn: @TBK-117)
            return `${node.attrs.label ?? node.attrs.id}`;
        },
      }),
      Placeholder.configure({
        placeholder: 'Dilekçenizi yazın veya "@" tuşuna basarak kanun maddesi arayın...',
      }),
    ],
    editorProps: {
      attributes: {
        // Fontu zorla Times New Roman yapıyoruz
        class: 'prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px] text-slate-300 max-w-none font-serif',
        style: 'font-family: "Times New Roman", Times, serif;'
      },
    },
    content: `
      <h2 style="text-align: center">ASLİYE HUKUK MAHKEMESİNE</h2>
      <p style="text-align: center"><strong>İSTANBUL</strong></p>
      <p></p>
      <p>Bu metin <strong>Babylexit</strong> ile hazırlanmıştır. Artık <u>tablo</u>, <u>hizalama</u> ve <u>kanun tamamlama (@)</u> özellikleri aktiftir.</p>
    `,
  });

  if (!editor) {
    return null;
  }

  // --- İŞLEVLER ---

  // RAPOR MADDE 5.3: AGRESİF NORMALİZASYON VE TEMİZLİK
  const sanitizeForUyap = (html: string) => {
    // 1. Unicode Normalizasyonu (NFC formuna çevir)
    let clean = html.normalize('NFC');

    // 2. Görünmez Karakterleri Temizle (Zero Width Space, Non-Joiner vb.)
    // Raporun bahsettiği "Hayalet Karakterler" (U+200B - U+200F arası vb.)
    // eslint-disable-next-line no-control-regex
    clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 3. UYAP'ın sevmediği karmaşık boşlukları standart boşluğa çevir
    clean = clean.replace(/&nbsp;/g, ' ');

    return clean;
  };
  
  // YENİ KOPYALAMA MANTIĞI: Helper'ı kullanarak RTF desteği ekledik
  const handleCopyForUyap = async () => {
    // utils/uyapHelper.ts dosyasındaki gelişmiş fonksiyonu kullanıyoruz
    // Bu fonksiyon hem sanitize yapar hem de RTF/HTML formatlarını paketler
    const success = await copyToClipboardMultiMime(editor);
    
    if (success) {
      setIsCopied(true);
      // Başarılı mesajı helper içinde veriliyor ama burada butonu güncelliyoruz
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      toast.error("Kopyalama sırasında bir hata oluştu.");
    }
  };

  const handleWordExport = () => {
    const html = editor.getHTML();
    exportToDocx(html);
    toast.success("Word dosyası indiriliyor...");
  };

  const handleLexgeSave = () => {
    const json = editor.getJSON();
    saveAsLexge(json);
    toast.success("Proje taslağı kaydedildi.");
  };

  // Tablo Ekleme Yardımcısı
  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* BAŞLIK */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Babylexit <span className="text-amber-500">Draft</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Güvenli Taslak Oluşturucu</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-[10px] text-slate-400 font-medium">
              UYAP Uyumlu Mod
            </span>
        </div>
      </div>

      {/* EDİTÖR ÇERÇEVESİ */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        
        {/* TOOLBAR (Gruplandırılmış ve Genişletilmiş) */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-950 border-b border-slate-800">
          
          {/* Grup 1: Geçmiş */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Geri Al" />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="İleri Al" />
          
          <div className="w-px h-6 bg-slate-800 mx-1" />

          {/* Grup 2: Stil */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Kalın" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="İtalik" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} title="Altı Çizili" />
          
          <div className="w-px h-6 bg-slate-800 mx-1" />

          {/* Grup 3: Hizalama (YENİ) */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Sola Yasla" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Ortala" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Sağa Yasla" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} title="İki Yana Yasla" />

          <div className="w-px h-6 bg-slate-800 mx-1" />

          {/* Grup 4: Yapı ve Tablo */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Madde İşaretleri" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Numaralı Liste" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Alıntı" />
          {/* YENİ: Tablo Butonu */}
          <ToolbarButton onClick={insertTable} isActive={editor.isActive('table')} icon={TableIcon} title="Tablo Ekle (3x3)" />
          
        </div>

        {/* Yazı Alanı */}
        <div className="p-4 bg-slate-900 min-h-[500px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* AKSİYONLAR */}
      <div className="flex flex-col gap-4 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        
        {/* Sihirli Kopyala Butonu */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
              <h3 className="text-white font-medium">UYAP'a Aktar</h3>
              <p className="text-xs text-slate-400 max-w-md">
                HTML ve RTF formatlarını aynı anda kopyalar. Hizalama ve Tablolar korunur. Görünmez karakterleri temizler.
              </p>
           </div>
           
           <button 
            onClick={handleCopyForUyap}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all shadow-lg active:scale-95 ${
              isCopied 
                ? 'bg-emerald-600 text-white shadow-emerald-900/20' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-900/20'
            }`}
          >
            {isCopied ? <Check size={20} /> : <Copy size={20} />}
            <span>{isCopied ? 'Sterilize Edildi & Kopyalandı!' : 'UYAP İçin Kopyala'}</span>
          </button>
        </div>

        <div className="w-full h-px bg-slate-800 my-2" />

        {/* Diğer Kayıt Seçenekleri */}
        <div className="flex justify-between items-center">
            <button onClick={handleLexgeSave} className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors">
                <Save size={16} /> <span>Taslağı Sakla (.lexge)</span>
            </button>
            <button onClick={handleWordExport} className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2 transition-colors">
                <FileText size={16} /> <span>Word Olarak İndir (.docx)</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;