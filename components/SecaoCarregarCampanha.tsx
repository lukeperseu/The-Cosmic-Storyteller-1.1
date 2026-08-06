'use client';

import React from 'react';

export default function SecaoCarregarCampanha() {
  return (
    <section id="secao-carregar-campanha" className="hidden flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl p-10 bg-slate-900/40 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-md">
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-600 tracking-widest uppercase mb-2">Carregar Campanha</h1>
          <h2 className="text-sm font-light text-slate-400 tracking-[0.2em] uppercase">Selecione uma Aventura Salva</h2>
        </div>

        <div className="w-full flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1" id="lista-campanhas-salvas">
          <span className="text-slate-400 italic p-4">Carregando campanhas...</span>
        </div>

        <div className="w-full mt-4">
          <button onClick={() => document.getElementById('btn-inicio')?.click()} className="w-full py-3 px-6 bg-transparent hover:bg-slate-800 text-slate-400 font-bold rounded border border-slate-700 transition-colors uppercase tracking-wider text-sm">Voltar ao Menu</button>
        </div>
      </div>
    </section>
  );
}
