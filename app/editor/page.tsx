// app/editor/page.tsx
import TextEditor from '@/components/Lexgeeditor';

export default function EditorPage() {
  return (
    <div className="flex flex-col h-full w-full p-6 md:p-10 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-transparent bg-clip-text">
          İçerik Editörü
        </h1>
        <p className="text-slate-400 mt-2">
          Hukuki notlarınızı veya makalelerinizi burada düzenleyebilirsiniz.
        </p>
      </div>

      <TextEditor />
    </div>
  );
}