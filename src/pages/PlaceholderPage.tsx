import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
};

export default function PlaceholderPage({ title, subtitle }: Props) {
  return (
    <div className="min-h-screen bg-[#f0f2f5] px-4 py-10 font-sans text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Noctal</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">{title}</h1>
        {subtitle && <p className="mt-3 text-slate-600">{subtitle}</p>}
        <Link
          to="/"
          className="mt-8 inline-flex rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white hover:bg-slate-900"
        >
          Voltar ao feed
        </Link>
      </div>
    </div>
  );
}
