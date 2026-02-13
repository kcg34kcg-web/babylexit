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
  ListOrdered, Quote, Undo, Redo, Save, FileText, Copy, Check, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Table as TableIcon,
  Maximize2, Minimize2, Scissors, Wand2 
} from 'lucide-react';

import { exportToDocx } from '@/utils/docxExport';
import { saveAsLexge } from '@/utils/lexgeConverter';
import { copyToClipboardMultiMime } from '@/utils/uyapHelper'; 
import { useState } from 'react';
import toast from 'react-hot-toast';

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
    className={`p-2 rounded-md transition-colors flex items-center justify-center ${
      isActive 
        ? 'bg-orange-100 text-orange-600 shadow-sm' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-orange-600'
    }`}
    type="button"
  >
    <Icon size={18} />
  </button>
);

const TextEditor = () => {
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'border-collapse table-auto w-full border border-slate-300 my-4' },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: { class: 'border border-slate-300 p-2 relative' },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-orange-100 text-orange-700 px-1 py-0.5 rounded border border-orange-200 font-medium decoration-clone cursor-help',
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
        class: 'focus:outline-none max-w-none font-serif w-full text-slate-900',
        style: 'font-family: "Times New Roman", Times, serif;'
      },
    },
    content: `
      <h2 style="text-align: center">ASLİYE HUKUK MAHKEMESİNE</h2>
      <p style="text-align: center"><strong>İSTANBUL</strong></p>
      <p></p>
      <p>Bu metin <strong>JURIX</strong> ile hazırlanmıştır. Yeni arayüze hoş geldiniz!</p>
    `,
  });

  if (!editor) return null;

  const handleCopyForUyap = async () => {
    const success = await copyToClipboardMultiMime(editor);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      toast.success("UYAP formatında kopyalandı!");
    } else {
      toast.error("Kopyalama hatası.");
    }
  };

  const handleWordExport = () => {
    exportToDocx(editor.getHTML());
    toast.success("Word dosyası indiriliyor...");
  };

  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  
  const insertPageBreak = () => {
    editor.chain().focus().setHorizontalRule().insertContent('<p></p>').run();
    toast.success("Sayfa Sonu Eklendi");
  };

  const autoFormatPages = () => {
    if (!editor) return;
    const toastId = toast.loading("Sayfa sınırları hesaplanıyor...");

    let tr = editor.state.tr;
    let hrPositions: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'horizontalRule') hrPositions.push(pos);
    });
    
    if (hrPositions.length > 0) {
      hrPositions.reverse().forEach(pos => tr.delete(pos, pos + 1));
      editor.view.dispatch(tr);
    }

    setTimeout(() => {
      const MAX_PAGE_HEIGHT = 930; 
      let currentHeight = 0;
      let positionsToBreak: number[] = [];

      editor.state.doc.forEach((node, offset) => {
         const domNode = editor.view.nodeDOM(offset) as HTMLElement;
         if (domNode && domNode.nodeType === 1) { 
            const style = window.getComputedStyle(domNode);
            const height = domNode.offsetHeight + parseFloat(style.marginBottom || '0') + parseFloat(style.marginTop || '0');
            
            if (currentHeight + height > MAX_PAGE_HEIGHT) {
               positionsToBreak.push(offset);
               currentHeight = height; 
            } else {
               currentHeight += height;
            }
         }
      });

      if (positionsToBreak.length === 0) {
        toast.success("Dilekçe 1 sayfa olarak düzenlendi.", { id: toastId });
        return;
      }

      let chain = editor.chain();
      positionsToBreak.reverse().forEach((p) => {
         chain = chain.insertContentAt(p, { type: 'horizontalRule' });
      });
      chain.run();

      toast.success(`Metin toplam ${positionsToBreak.length + 1} sayfaya otomatik bölündü!`, { id: toastId });
    }, 150);
  };

  return (
    <div className={`flex flex-col h-full font-sans transition-all ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-100 p-4' : 'w-full'}`}>
      
      {/* 1. YENİ ŞIK TOOLBAR (Kutu içinde değil, havada asılı gibi) */}
      <div className="flex flex-wrap items-center justify-between p-2 bg-white border border-slate-200 rounded-xl shadow-sm mb-4 shrink-0">
        
        {/* Sol Grup: Biçimlendirme Araçları */}
        <div className="flex items-center gap-1 flex-wrap">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Geri Al" />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="İleri Al" />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} title="Kalın" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} title="İtalik" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} title="Altı Çizili" />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} title="Sola Yasla" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} title="Ortala" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} title="Sağa Yasla" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} title="İki Yana Yasla" />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} title="Madde İşaretleri" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} title="Numaralı Liste" />
          <ToolbarButton onClick={insertTable} isActive={editor.isActive('table')} icon={TableIcon} title="Tablo Ekle" />
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
          
          <button onClick={insertPageBreak} title="İmlecin bulunduğu yere manuel sayfa sonu çizgisi ekler" className="hidden sm:flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-orange-600 rounded-md transition-colors">
            <Scissors size={14} /> Böl
          </button>
          <button onClick={autoFormatPages} title="Metni hesaplayıp A4 sınırından otomatik böler" className="hidden sm:flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 rounded-md transition-colors">
            <Wand2 size={14} /> Sayfala
          </button>
        </div>

        {/* Sağ Grup: Eylemler (Dışarı Aktar, Kaydet, UYAP, Tam Ekran) */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-auto">
          <button onClick={() => saveAsLexge(editor.getJSON())} className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors" title="Taslağı Sakla"><Save size={16} /></button>
          <button onClick={handleWordExport} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Word Olarak İndir"><FileText size={16} /></button>
          
          <button onClick={handleCopyForUyap} className={`flex items-center gap-1.5 px-3 py-1.5 ml-1 rounded-md text-xs font-bold transition-all shadow-sm ${isCopied ? 'bg-emerald-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`} title="UYAP Döküman Editörüne (UDF) Kopyala">
            {isCopied ? <Check size={14} /> : <Copy size={14} />} <span className="hidden sm:inline">UYAP</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="flex items-center gap-1 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-md transition-colors"
            title={isFullscreen ? "Küçült" : "Tam Ekran Odak Modu"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* 2. YAZI ALANI - GERÇEKÇİ A4 ALTYAPISI */}
      <div className="flex-1 overflow-y-auto flex justify-center custom-scrollbar pb-20">
        <div className="editor-wrapper w-full max-w-[850px]" onClick={() => editor.commands.focus()}>
           <EditorContent editor={editor} />
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* Kağıt Tasarımı */
        .editor-wrapper .ProseMirror {
          background-color: #ffffff;
          min-height: 1123px; /* A4 minimum yüksekliği */
          padding: 96px; /* Hukuki belge kenar boşlukları */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        .editor-wrapper .ProseMirror p { margin-bottom: 1em; line-height: 1.5; }
        .editor-wrapper .ProseMirror h1, .editor-wrapper .ProseMirror h2, .editor-wrapper .ProseMirror h3 { 
          font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; 
        }

        /* THE MAGIC: GÖRSEL SAYFA BÖLME İLLÜZYONU */
        .editor-wrapper .ProseMirror hr {
          border: none;
          background-color: #f1f5f9; /* page.tsx bg-slate-100 rengi ile aynı (kaynaşması için) */
          height: 40px; 
          
          margin-top: 96px; 
          margin-bottom: 96px; 
          margin-left: -96px; 
          margin-right: -96px; 
          
          border-top: 1px dashed #cbd5e1;
          border-bottom: 1px dashed #cbd5e1;
          position: relative;
          page-break-after: always; 
          cursor: pointer;
        }
        
        .editor-wrapper .ProseMirror hr::after {
          content: "SAYFA SONU";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #f1f5f9; /* page.tsx bg-slate-100 rengi */
          color: #94a3b8;
          font-weight: bold;
          font-size: 10px;
          letter-spacing: 2px;
          padding: 4px 10px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default TextEditor;