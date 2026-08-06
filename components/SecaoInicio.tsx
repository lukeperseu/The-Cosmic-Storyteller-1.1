'use client';

import React from 'react';

export default function SecaoInicio() {
  return (
    <section id="secao-inicio" className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-md p-10 bg-slate-900/40 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-600 tracking-widest uppercase mb-2">The Cosmic</h1>
          <h2 className="text-2xl font-light text-slate-400 tracking-[0.3em] uppercase">Storyteller</h2>
        </div>
        <nav className="flex flex-col gap-3 w-full mt-4">
          <button id="nav-campanhas-globais" className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 hover:from-emerald-800 hover:to-teal-800 text-emerald-100 font-bold rounded border border-emerald-500/80 hover:border-emerald-400 transition-all duration-300 uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-2 ring-1 ring-emerald-500/30">
            🌐 Campanhas Globais
          </button>
          <button id="nav-nova-campanha" className="w-full py-3 px-6 bg-slate-800 hover:bg-violet-700 text-slate-200 font-bold rounded border border-slate-700 hover:border-violet-500 transition-all duration-300 uppercase tracking-wider text-sm shadow-md">Nova Campanha</button>
          <button id="nav-carregar-campanha" className="w-full py-3 px-6 bg-slate-800 hover:bg-violet-700 text-slate-200 font-bold rounded border border-slate-700 hover:border-violet-500 transition-all duration-300 uppercase tracking-wider text-sm shadow-md">Carregar Campanha</button>
          <button id="nav-monstro-semana" className="w-full py-3 px-6 bg-slate-800 hover:bg-violet-700 text-slate-200 font-bold rounded border border-slate-700 hover:border-violet-500 transition-all duration-300 uppercase tracking-wider text-sm shadow-md">Monstro da Semana</button>
          <button id="nav-meus-personagens" className="w-full py-3 px-6 bg-slate-800 hover:bg-violet-700 text-slate-200 font-bold rounded border border-slate-700 hover:border-violet-500 transition-all duration-300 uppercase tracking-wider text-sm shadow-md">Meus Personagens</button>
          <button id="nav-arquivos-carregados" className="w-full py-3 px-6 bg-slate-800 hover:bg-violet-700 text-slate-200 font-bold rounded border border-slate-700 hover:border-violet-500 transition-all duration-300 uppercase tracking-wider text-sm shadow-md">Arquivos Carregados</button>
          <button id="nav-sistemas-assimilados" className="w-full py-3 px-6 bg-violet-950 hover:bg-violet-800 text-violet-200 font-bold rounded border border-violet-700 hover:border-violet-500 transition-all duration-300 uppercase tracking-wider text-sm shadow-md flex items-center justify-center gap-2">📚 Sistemas Assimilados</button>
          <div className="flex gap-3 w-full mt-2">
            <button id="nav-features" className="flex-1 py-3 px-6 bg-gradient-to-r from-violet-900 to-purple-900 hover:from-violet-800 hover:to-purple-800 text-violet-100 font-bold rounded border border-violet-600/60 hover:border-violet-400 transition-all duration-300 uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-1.5">
              ⚡ Features &amp; IA Studio
            </button>
            <button id="nav-opcoes" className="flex-1 py-3 px-6 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded border border-slate-700 transition-all duration-300 uppercase tracking-wider text-xs">
              Opções
            </button>
          </div>
        </nav>
        <footer className="mt-6 text-[10px] text-slate-600 uppercase tracking-widest">
          Ordos Mundos Engine | v1.0.0
        </footer>
      </div>
    </section>
  );
}
