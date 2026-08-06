'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-100 p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Ocorreu um erro no sistema</h2>
      <p className="text-slate-400 mb-6 text-xs max-w-md">{error?.message || 'Erro inesperado'}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors text-xs"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
