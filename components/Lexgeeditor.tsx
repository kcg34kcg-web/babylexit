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
  Maximize2, Minimize2, Scissors 
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
        class: 'prose sm:prose-base focus:outline-none min-h-[1000px] max-w-none font-serif w-full text-slate-900',
        style: 'font-family: "Times New Roman", Times, serif;'
      },
    },
    content: `
      <h2 style="text-align: center">ASLİYE HUKUK MAHKEMESİNE</h2>
      <p style="text-align: center"><strong>İSTANBUL</strong></p>
      <p></p>
      <p>Bu metin <strong>JURIX</strong> ile hazırlanmıştır. Sağ üstteki "Sayfayı Büyüt" ikonuna tıklayarak odak moduna geçebilirsiniz.</p>
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
  
  // Yatay çizgiyi (hr) ekleyip alt satıra geçiyoruz
  const insertPageBreak = () => {
    editor.chain().focus().setHorizontalRule().insertContent('<p></p>').run();
    toast.success("Sayfa Sonu Eklendi");
  };

  return (
    <div className={`transition-all duration-300 flex flex-col font-sans bg-[#0A1128] ${
      isFullscreen 
        ? 'fixed inset-0 z-[100] p-0 m-0' 
        : 'w-full h-full p-2 sm:p-4 rounded-2xl gap-4' 
    }`}>
      
      {!isFullscreen && (
        <div className="flex justify-between items-center px-2 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white">JURIX <span className="text-orange-500">Editor</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => saveAsLexge(editor.getJSON())} className="p-2 text-slate-400 hover:text-orange-500 bg-white/5 rounded-lg transition-colors" title="Taslağı Sakla"><Save size={16} /></button>
            <button onClick={handleWordExport} className="p-2 text-slate-400 hover:text-blue-400 bg-white/5 rounded-lg transition-colors" title="Word Olarak İndir"><FileText size={16} /></button>
            <button onClick={handleCopyForUyap} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white'}`}>
              {isCopied ? <Check size={14} /> : <Copy size={14} />} <span>UYAP'a Kopyala</span>
            </button>
          </div>
        </div>
      )}

      <div className={`bg-slate-200 overflow-hidden flex flex-col border-slate-700 ${isFullscreen ? 'h-screen rounded-none border-0' : 'flex-1 rounded-xl shadow-2xl border-2'}`}>
        
        <div className="flex flex-wrap items-center justify-between p-2 bg-white border-b border-slate-300 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-1">
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
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button onClick={insertPageBreak} title="Araya sayfa sonu çizgisi ekler" className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-orange-600 hover:bg-orange-100 rounded-md transition-colors border border-transparent hover:border-orange-200">
              <Scissors size={14} /> Böl
            </button>
          </div>

          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
            title={isFullscreen ? "Küçült" : "Tam Ekran Odak Modu"}
          >
            {isFullscreen ? <><Minimize2 size={16} /> Küçült</> : <><Maximize2 size={16} /> Sayfayı Büyüt</>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-200/80 p-4 sm:p-10 flex justify-center custom-scrollbar">
          <div className="bg-white shadow-xl w-full max-w-[850px] min-h-[1123px] p-10 sm:px-[10%] sm:py-16 cursor-text editor-paper border border-slate-300" onClick={() => editor.commands.focus()}>
             <EditorContent editor={editor} className="h-full" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 5px; border: 2px solid #e2e8f0; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }

        .editor-paper {
          background-image: repeating-linear-gradient(
            to bottom,
            #ffffff,
            #ffffff 1100px,
            #f1f5f9 1100px,
            #f1f5f9 1123px
          );
        }

        .editor-paper hr {
          border: none;
          border-top: 2px dashed #cbd5e1;
          margin: 40px -10%;
          position: relative;
          overflow: visible;
          page-break-after: always; /* Çıktı alırken gerçekten bölsün */
        }
        
        .editor-paper hr::after {
          content: "SAYFA SONU";
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: #fff;
          padding: 0 10px;
          color: #94a3b8;
          font-weight: bold;
          font-size: 10px;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
};

export default TextEditor;