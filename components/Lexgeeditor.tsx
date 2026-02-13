'use client';


import { useEditor, EditorContent } from '@tiptap/react';
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

// --- ÖZEL DİPNOT DÜĞÜMÜ ---
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
      // --- GÜNCELLENMİŞ SÜRÜKLE-BIRAK (DRAG & DROP) MANTIĞI ---
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

            // ProseMirror/TipTap transaction kullanarak HTML ekliyoruz
            // Not: Normalde editor.chain() burada çalışmayabilir, bu yüzden view kullanıyoruz ama 
            // en temiz yöntem useEffect ile editor instance'ına erişmekti. 
            // Ancak sürüklenen yere tam bırakmak için burada bir trick (hile) yapıp
            // manuel HTML oluşturmak yerine Event Listener'ı tetiklemek de bir yöntemdir.
            // Fakat burada doğrudan transaction ile çözelim:
            
            // Basit çözüm: Olayı durdur ve manuel ekle (eğer editor instance'ı global olsaydı)
            // Ancak editor instance'ı hook içinde. O yüzden burada view.dispatch ile ekleme yapacağız.
            
            // Daha güvenli ve şık bir yol:
            // Sadece metni bırakmayı engelliyoruz ve aşağıda useEffect ile dinlediğimiz yapıyı kullanıyoruz?
            // Hayır, Drag&Drop anlık olmalı.
             
            // -- BASİT SÜRÜKLEME ÇÖZÜMÜ --
            // Eğer başlık ve içerik ayrışabiliyorsa özel format, yoksa düz metin.
            if (parts.length > 1) {
                // Şema üzerinden node oluşturmak karmaşık olabilir, bu yüzden
                // HTML parse edip insertHTML komutu simüle ediyoruz.
                const htmlContent = `<blockquote><strong>${title}</strong><br/>${content}</blockquote><p></p>`;
                
                // Koordinata odaklan
                const { tr } = view.state;
                tr.setSelection(TextSelection.near(view.state.doc.resolve(coordinates.pos)));                // Bu yüzden basitçe "return false" yapıp varsayılan davranışı (düz metin) 
                // engellemek ve manuel işlem yapmak gerekir.
                // En temiz yöntem: Buradan bir event fırlatıp useEffect'te yakalamak olabilir ama koordinat kaybolur.
                
                // ama useEffect hook'u "Metne Ekle" butonu için asıl şık formatı sağlayacak.
                
                // -- EN PRATİK ÇÖZÜM: --
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

  // --- 1. BUTON İLE EKLEME VE 2. SÜRÜKLEME İLE EKLEME DİNLEYİCİSİ ---
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

      <div className="flex-1 overflow-y-auto flex justify-center custom-scrollbar pb-20">
        <div className="editor-wrapper w-full max-w-[850px]" onClick={() => editor.commands.focus()}>
           <EditorContent editor={editor} />
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        .editor-wrapper .ProseMirror {
          background-color: #ffffff;
          min-height: 1123px;
          padding: 96px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        .editor-wrapper .ProseMirror p { margin-bottom: 1em; line-height: 1.5; }
        .editor-wrapper .ProseMirror h1, .editor-wrapper .ProseMirror h2, .editor-wrapper .ProseMirror h3 { 
          font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; 
        }
        
        .editor-wrapper .ProseMirror span { transition: background-color 0.2s; }

        /* --- ŞIK ALINTI (BLOCKQUOTE) STİLİ --- */
        .editor-wrapper .ProseMirror blockquote {
          border-left: 4px solid #f97316; /* Orange-500 */
          margin-left: 0;
          margin-right: 0;
          padding-left: 1rem;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          font-style: italic;
          background-color: #fff7ed; /* Orange-50 */
          color: #4b5563;
          border-radius: 0 4px 4px 0;
        }
        
        .editor-wrapper .ProseMirror blockquote strong {
            color: #c2410c; /* Orange-700 */
            font-style: normal;
            display: block;
            margin-bottom: 0.25rem;
        }

        sup[data-footnote] {
          color: #ea580c;
          cursor: help;
          font-weight: bold;
          font-size: 11px;
          padding: 2px 4px;
          margin: 0 2px;
          background: #ffedd5;
          border-radius: 4px;
          border: 1px solid #fed7aa;
          vertical-align: super;
        }

        .editor-wrapper .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1em 0;
        }
        .editor-wrapper .ProseMirror td, .editor-wrapper .ProseMirror th {
          min-width: 1em;
          border: 1px solid #cbd5e1;
          padding: 8px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .editor-wrapper .ProseMirror th { background-color: #f8fafc; font-weight: bold; }

        .editor-wrapper .ProseMirror hr {
          border: none;
          background-color: #f1f5f9; 
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
          top: -10px;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #f1f5f9; 
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