import Link from 'next/link';
import moment from 'moment';

interface QuestionCardProps {
  question: {
    id: string;
    title: string;
    content: string;
    user_id: string;
    status: string;
    created_at: string;
  };
  authorName: string;
  timeAgo: string;
}

export default function QuestionCard({ question, authorName, timeAgo }: QuestionCardProps) {
  return (
    <div className="bg-slate-900 p-6 rounded-lg shadow-lg border border-slate-700 hover:border-amber-500 transition-colors duration-200">
      <Link href={`/questions/${question.id}`}>
        <h3 className="text-2xl font-semibold text-slate-200 hover:text-amber-500 transition-colors duration-200 mb-2">{question.title}</h3>
      </Link>
      <p className="text-slate-400 text-sm mb-4">{question.content.substring(0, 150)}{question.content.length > 150 ? '...' : ''}</p>
      <div className="flex justify-between items-center text-sm text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="text-amber-500">{authorName}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
        <Link href={`/questions/${question.id}/answer`}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Cevapla
        </Link>
      </div>
    </div>
  );
}
