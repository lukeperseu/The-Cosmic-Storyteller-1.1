'use client';

import React from 'react';

export default function SecaoArquivosCarregados() {
  return (
    <section id="secao-arquivos-carregados" className="hidden flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="flex flex-col gap-6 w-full max-w-4xl p-10 bg-slate-900/40 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-md">
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-600 tracking-widest uppercase mb-2">Arquivos Carregados</h1>
          <h2 className="text-sm font-light text-slate-400 tracking-[0.2em] uppercase">Gerenciamento de Biblioteca e Tags</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full border-b border-slate-800 pb-5">
          <label className="flex-1 py-3 px-6 bg-violet-950 hover:bg-violet-700 text-white font-bold rounded border border-violet-800 transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer">
            ↑ Carregar Arquivo
            <input type="file" id="input-carregar-arquivo-bib" accept=".pdf,.txt,.doc,.docx,.md" className="hidden" multiple />
          </label>
          <button id="btn-adicionar-nota-bib" className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded border border-slate-700 hover:border-slate-500 transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-md">
            + Adicionar Nota
          </button>
        </div>

        <div id="secao-arquivos-carregados-lista" className="flex flex-col gap-4 overflow-y-auto max-h-[380px] pr-2">
          <span className="text-xs text-slate-500 italic p-4">Carregando biblioteca local...</span>
        </div>

        <div className="w-full mt-2">
          <button onClick={() => document.getElementById('btn-inicio')?.click()} className="w-full py-3 px-6 bg-transparent hover:bg-slate-800 text-slate-400 font-bold rounded border border-slate-700 transition-colors uppercase tracking-wider text-sm">Voltar ao Menu</button>
        </div>
      </div>
    </section>
  );
}
