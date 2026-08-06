import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-100 p-4 text-center">
      <h2 className="text-3xl font-bold mb-2">404 - Página Não Encontrada</h2>
      <p className="text-slate-400 mb-6 text-sm">A página que você procura não existe ou foi movida.</p>
      <Link href="/" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors text-xs">
        Voltar ao Início
      </Link>
    </div>
  );
}
