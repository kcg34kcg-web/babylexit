'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextSelection } from '@tiptap/pm/state';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Mention from '@tiptap/extension-mention';
import suggestion from './editor/extensions/suggestion'; 

import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';

// İKONLAR (Bubble Menu ve Floating Menu için eklendi)
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2 
} from 'lucide-react';

import { Node, mergeAttributes } from '@tiptap/core';
import { useState, useEffect } from 'react';
import { EditorToolbar } from './editor/EditorToolbar';
import toast from 'react-hot-toast';

// --- TİP TANIMLAMALARI ---
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: { insertFootnote: (content: string) => ReturnType }
  }
}

// --- ÖZEL DİPNOT DÜĞÜMÜ (KORUNDU) ---
const FootnoteNode = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { content: { default: '' }, id: { default: () => Math.random().toString(36).substr(2, 9) } }
  },
  parseHTML() { return [{ tag: 'sup[data-footnote]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { 'data-footnote': '', 'title': HTMLAttributes.content }), `[Dipnot]`]
  },
  addCommands() {
    return {
      insertFootnote: (content: string) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: { content } })
      },
    }
  },
});

const TextEditor = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      FootnoteNode, 
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Mention.configure({
        HTMLAttributes: { class: 'bg-orange-100 text-orange-700 px-1 py-0.5 rounded border border-orange-200 font-medium decoration-clone cursor-help' },
        suggestion, 
        renderLabel({ options, node }) { return `${node.attrs.label ?? node.attrs.id}`; },
      }),
      Placeholder.configure({ placeholder: 'Dilekçenizi yazın veya "@" tuşuna basarak kanun maddesi arayın...' }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }), 
      FontFamily.configure({ types: ['textStyle'] }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none w-full text-slate-900', 
        style: 'font-family: "Times New Roman", Times, serif;' 
      },
      // --- MEVCUT SÜRÜKLE-BIRAK MANTIĞI (KORUNDU) ---
      handleDrop: (view, event, slice, moved) => {
        // Eğer editör içinden değil de dışarıdan (sağ panelden) geliyorsa
        if (!moved && event.dataTransfer && event.dataTransfer.getData('text/plain')) {
          const text = event.dataTransfer.getData('text/plain');
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          
          if (coordinates) {
            // Sağ panelden "Başlık \n İçerik" formatında geldiğini varsayıyoruz
            const parts = text.split('\n');
            const title = parts[0]; 
            const content = parts.slice(1).join('<br/>'); // Geri kalan satırları birleştir

            
            // -- BASİT SÜRÜKLEME ÇÖZÜMÜ --
            // Eğer başlık ve içerik ayrışabiliyorsa özel format, yoksa düz metin.
            if (parts.length > 1) {

                // Olayı burada tüketiyoruz (preventDefault).
                event.preventDefault();
                
                // Editör instance'ına erişimimiz useEffect içinde olduğu için 
                // burada basit bir DOM event ile koordinatı ve veriyi gönderiyoruz.
                const customEvent = new CustomEvent('jurix:drop-text', { 
                    detail: { title, content, pos: coordinates.pos } 
                });
                window.dispatchEvent(customEvent);
                return true;
            }
          }
        }
        return false;
      }
    },
    content: `
      <h2 style="text-align: center; font-family: 'Times New Roman'">ASLİYE HUKUK MAHKEMESİNE</h2>
      <p style="text-align: center; font-family: 'Times New Roman'"><strong>İSTANBUL</strong></p>
      <p></p>
      <p style="font-family: 'Times New Roman'">Bu metin <strong>JURIX</strong> ile hazırlanmıştır. Sağ panelden arama yaparak içtihatları buraya sürükleyebilirsiniz.</p>
    `,
  });

  // --- 1. BUTON İLE EKLEME VE 2. SÜRÜKLEME İLE EKLEME DİNLEYİCİSİ (KORUNDU) ---
  useEffect(() => {
    // Butona basınca (İmlecin olduğu yere ekler)
    const handleInsertLegalText = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { title, content } = customEvent.detail;
      
      if (editor) {
        editor.chain().focus()
          .insertContent(`<blockquote><strong>${title}</strong><br/>${content}</blockquote><p></p>`)
          .run();
        toast.success("İçtihat metne eklendi!");
      }
    };

    // Sürükleyip bırakınca (Bırakılan yere ekler)
    const handleDropLegalText = (e: Event) => {
        const customEvent = e as CustomEvent;
        const { title, content, pos } = customEvent.detail;
        
        if (editor && pos !== undefined) {
          editor.chain().focus().setTextSelection(pos)
            .insertContent(`<blockquote><strong>${title}</strong><br/>${content}</blockquote><p></p>`)
            .run();
          toast.success("İçtihat sürüklenerek yerleştirildi!");
        }
    };

    window.addEventListener('jurix:insert-text', handleInsertLegalText);
    window.addEventListener('jurix:drop-text', handleDropLegalText); // Sürükleme için yeni dinleyici

    return () => {
        window.removeEventListener('jurix:insert-text', handleInsertLegalText);
        window.removeEventListener('jurix:drop-text', handleDropLegalText);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`flex flex-col h-full font-sans transition-all ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-100 p-4' : 'w-full'}`}>
      
      {/* TOOLBAR */}
      <EditorToolbar editor={editor} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />

      {/* --- YENİ EKLENEN: BUBBLE MENU (Metin seçince çıkar) --- */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-white shadow-xl border border-slate-200 rounded-lg overflow-hidden p-1 gap-1">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-slate-100 ${editor.isActive('bold') ? 'text-orange-600 bg-orange-50' : 'text-slate-600'}`}>
            <Bold size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-slate-100 ${editor.isActive('italic') ? 'text-orange-600 bg-orange-50' : 'text-slate-600'}`}>
            <Italic size={16} />
          </button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-slate-100 ${editor.isActive('underline') ? 'text-orange-600 bg-orange-50' : 'text-slate-600'}`}>
            <UnderlineIcon size={16} />
          </button>
          <div className="w-px bg-slate-200 mx-1" />
          <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded hover:bg-slate-100 ${editor.isActive({ textAlign: 'left' }) ? 'text-orange-600 bg-orange-50' : 'text-slate-600'}`}>
            <AlignLeft size={16} />
          </button>
           <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded hover:bg-slate-100 ${editor.isActive({ textAlign: 'center' }) ? 'text-orange-600 bg-orange-50' : 'text-slate-600'}`}>
            <AlignCenter size={16} />
          </button>
        </BubbleMenu>
      )}

      {/* --- YENİ EKLENEN: FLOATING MENU (Boş satıra tıklayınca solunda çıkar) --- */}
      {editor && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-white shadow-xl border border-slate-200 rounded-lg overflow-hidden p-1 gap-1 -ml-12">
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`flex items-center gap-2 px-2 py-1 text-xs font-medium rounded hover:bg-slate-100 ${editor.isActive('heading', { level: 1 }) ? 'text-orange-600' : 'text-slate-600'}`}>
            <Heading1 size={14} /> Başlık 1
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`flex items-center gap-2 px-2 py-1 text-xs font-medium rounded hover:bg-slate-100 ${editor.isActive('heading', { level: 2 }) ? 'text-orange-600' : 'text-slate-600'}`}>
            <Heading2 size={14} /> Başlık 2
          </button>
        </FloatingMenu>
      )}

      <div className="flex-1 overflow-y-auto flex justify-center custom-scrollbar pb-20 bg-slate-100/50">
        <div className="editor-wrapper w-full" onClick={() => editor.commands.focus()}>
           <EditorContent editor={editor} />
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        /* --- GÜNCELLENMİŞ KAĞIT GÖRÜNÜMÜ (WORD HİSSİ) --- */
        .editor-wrapper {
          padding: 40px 0;
          display: flex;
          justify-content: center;
        }

        .editor-wrapper .ProseMirror {
          background-color: #ffffff;
          width: 210mm; /* A4 Genişliği */
          min-height: 297mm; /* A4 Yüksekliği */
          padding: 2.5cm; /* Standart kenar boşlukları (yaklaşık 96px) */
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.05); /* Yumuşak gölge */
          border: 1px solid #e2e8f0;
          box-sizing: border-box; /* Padding dahil boyutlandırma */
        }
        
        /* Odaklanınca mavi çerçeveyi kaldır */
        .editor-wrapper .ProseMirror:focus {
           outline: none;
        }

        .editor-wrapper .ProseMirror p { margin-bottom: 1em; line-height: 1.5; }
        .editor-wrapper .ProseMirror h1, .editor-wrapper .ProseMirror h2, .editor-wrapper .ProseMirror h3 { 
          font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; 
        }
        
        .editor-wrapper .ProseMirror span { transition: background-color 0.2s; }

        /* Blockquote Stili */
        .editor-wrapper .ProseMirror blockquote {
          border-left: 4px solid #f97316;
          margin-left: 0; margin-right: 0;
          padding: 0.5rem 1rem;
          font-style: italic;
          background-color: #fff7ed;
          color: #4b5563;
          border-radius: 0 4px 4px 0;
        }
        .editor-wrapper .ProseMirror blockquote strong { color: #c2410c; display: block; margin-bottom: 0.25rem; }

        /* Dipnot Stili */
        sup[data-footnote] {
          color: #ea580c; cursor: help; font-weight: bold; font-size: 11px;
          padding: 2px 4px; margin: 0 2px; background: #ffedd5;
          border-radius: 4px; border: 1px solid #fed7aa; vertical-align: super;
        }

        /* --- GÜNCELLENMİŞ TABLO STİLİ (DAHA PROFESYONEL) --- */
        .editor-wrapper .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1em 0;
          border: 1px solid #000; /* Net siyah kenarlık */
        }
        .editor-wrapper .ProseMirror td, .editor-wrapper .ProseMirror th {
          min-width: 1em;
          border: 1px solid #000;
          padding: 8px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .editor-wrapper .ProseMirror th { background-color: #f1f5f9; font-weight: bold; }

        /* --- SAYFA SONU (WORD GİBİ BOŞLUK) --- */
        .editor-wrapper .ProseMirror hr {
          border: none;
          background-color: #f1f5f9; /* Arkaplan rengiyle uyumlu gri boşluk */
          height: 20px; 
          margin: 40px -2.5cm; /* Padding'i aşmak için negatif margin */
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          position: relative;
          page-break-after: always; 
          cursor: default;
        }
        
        /* Sayfa sonu yazısını kaldırdık, sadece görsel boşluk bıraktık */
        .editor-wrapper .ProseMirror hr::after {
          content: "";
          display: none;
        }
      `}</style>
    </div>
  );
};

export default TextEditor;