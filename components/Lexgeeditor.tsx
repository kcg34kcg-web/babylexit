'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Mention from '@tiptap/extension-mention';
import suggestion from './editor/extensions/suggestion'; 

import { 
  Bold, Italic, Underline as UnderlineIcon, List, 
  ListOrdered, Quote, Undo, Redo, Save, FileText, Copy, Check, AlertTriangle,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Table as TableIcon
} from 'lucide-react';

import { exportToDocx } from '@/utils/docxExport';
import { saveAsLexge } from '@/utils/lexgeConverter';
import { copyToClipboardMultiMime } from '@/utils/uyapHelper'; 
import { useState } from 'react';
import toast from 'react-hot-toast';

// Toolbar Butonu Bileşeni
interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  icon: any; 
  title?: string;
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
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse table-auto w-full border border-slate-600 my-4' },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: { class: 'border border-slate-600 p-2 relative' },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded border border-amber-500/30 font-medium decoration-clone cursor-help',
        },
        suggestion, 
        renderLabel({ options, node }) {
            return `${node.attrs.label ?? node.attrs.id}`;
        },
      }),
      Placeholder.configure({
        placeholder: 'Dilekçenizi yazın veya "@" tuşuna basarak kanun maddesi arayın...',
      }),
    ],
    editorProps: {
      attributes: {
        // BURASI ÖNEMLİ: Prose sınıflarını A4'e tam oturacak şekilde marginleri kaldırarak ayarladık.
        // outline-none ile de tıklanınca çıkan mavi çizgiyi yok ettik.
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none min-h-full max-w-none font-serif w-full',
        style: 'font-family: "Times New Roman", Times, serif;'
      },
    },
    content: `
      <h2 style="text-align: center">ASLİYE HUKUK MAHKEMESİNE</h2>
      <p style="text-align: center"><strong>İSTANBUL</strong></p>
      <p></p>
      <p>Bu metin <strong>Babylexit</strong> ile hazırlanmıştır. Artık <u>Sanal A4 görünümü</u> aktiftir.</p>
    `,
  });

  if (!editor) {
    return null;
  }

  const sanitizeForUyap = (html: string) => {
    let clean = html.normalize('NFC');
    // eslint-disable-next-line no-control-regex
    clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, '');
    clean = clean.replace(/&nbsp;/g, ' ');
    return clean;
  };
  
  const handleCopyForUyap = async () => {
    const success = await copyToClipboardMultiMime(editor);
    if (success) {
      setIsCopied(true);
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

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto flex flex-col gap-6 font-sans h-full">
      
      {/* BAŞLIK */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Babylexit <span className="text-amber-500">Draft</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Sanal A4 Düzeni (Word Eşdeğerliği)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="text-[10px] text-slate-400 font-medium">
              UYAP Uyumlu Mod
            </span>
        </div>
      </div>

      {/* EDİTÖR ÇERÇEVESİ */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
        
        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900 border-b border-slate-800 shrink-0 shadow-sm z-10">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Geri Al" />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="İleri Al" />
          <div className="w-px h-6 bg-slate-800 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Kalın" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="İtalik" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} title="Altı Çizili" />
          <div className="w-px h-6 bg-slate-800 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Sola Yasla" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Ortala" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Sağa Yasla" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} title="İki Yana Yasla" />
          <div className="w-px h-6 bg-slate-800 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Madde İşaretleri" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Numaralı Liste" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} title="Alıntı" />
          <ToolbarButton onClick={insertTable} isActive={editor.isActive('table')} icon={TableIcon} title="Tablo Ekle (3x3)" />
        </div>

        {/* YAZI ALANI - SANAL A4 ARKA PLANI */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 sm:p-10 flex justify-center custom-scrollbar">
          
          {/* A4 KAĞIDI SİMÜLASYONU */}
          {/* Genişlik: 794px (A4'ün 96 DPI pixel karşılığı), Min Yükseklik: 1123px */}
          {/* Padding (p-12 sm:px-16 sm:py-20): Word kenar boşlukları simülasyonu */}
          <div className="bg-slate-900 shadow-xl border border-slate-700/50 w-full max-w-[794px] min-h-[1123px] p-12 sm:px-16 sm:py-20 cursor-text group transition-all duration-300 hover:border-slate-600" onClick={() => editor.commands.focus()}>
             <EditorContent editor={editor} className="h-full" />
          </div>
          
        </div>
      </div>

      {/* AKSİYONLAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 shrink-0">
           <div>
              <h3 className="text-white font-medium text-sm">UYAP'a Aktar</h3>
              <p className="text-xs text-slate-400 max-w-sm hidden sm:block">
                Hizalama ve tablolar korunarak RTF/HTML formatında UYAP için güvenli kopyalama.
              </p>
           </div>
           
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <button onClick={handleLexgeSave} title="Taslağı Sakla" className="p-2.5 bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
                 <Save size={18} />
             </button>
             <button onClick={handleWordExport} title="Word Olarak İndir" className="p-2.5 bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors">
                 <FileText size={18} />
             </button>
             <button 
              onClick={handleCopyForUyap}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg active:scale-95 ${
                isCopied 
                  ? 'bg-emerald-600 text-white shadow-emerald-900/20' 
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-900/20'
              }`}
            >
              {isCopied ? <Check size={18} /> : <Copy size={18} />}
              <span>{isCopied ? 'Kopyalandı!' : 'UYAP İçin Kopyala'}</span>
            </button>
           </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default TextEditor;