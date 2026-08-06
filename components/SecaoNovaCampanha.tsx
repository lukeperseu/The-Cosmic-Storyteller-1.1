'use client';

import React from 'react';

export default function SecaoNovaCampanha() {
  return (
    <section id="secao-nova-campanha" className="hidden flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl p-10 bg-slate-900/40 border border-slate-800 rounded-lg shadow-2xl backdrop-blur-md">
        <div className="text-center mb-2">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-600 tracking-widest uppercase mb-2">Nova Campanha</h1>
          <h2 className="text-sm font-light text-slate-400 tracking-[0.2em] uppercase">Configuração de Mundo e Sistema</h2>
        </div>

        <div className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-violet-400 font-bold uppercase tracking-wider pl-1">Título da Campanha</label>
            <input type="text" id="campanha-nome" placeholder="Ex: O Herdeiro de Hogwarts..." className="w-full p-3 bg-black/60 border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500 font-bold shadow-inner" />
          </div>

          {/* Bloco de Mecânicas */}
          <div className="bg-black/50 p-4 rounded border border-slate-700 shadow-md">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-3 border-b border-slate-800 pb-3">
              <span className="text-violet-400 font-bold uppercase text-sm tracking-wider">Mecânica do Sistema</span>
              <div className="flex gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-violet-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-colors shadow-md flex items-center gap-1">
                  ↑ Upload Arquivos
                  <input type="file" id="upload-mecanica" accept=".pdf,.txt,.doc,.docx,.md" className="hidden" multiple />
                </label>
                <button id="btn-explorar-mecanica" className="px-3 py-1.5 bg-slate-800 hover:bg-violet-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-colors shadow-md">
                  Explorar Arquivos
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2" id="lista-arquivos-mecanicas">
              <span className="text-xs text-slate-500 italic">Nenhuma mecânica carregada...</span>
            </div>
          </div>

          {/* Bloco de História / Lore */}
          <div className="bg-black/50 p-4 rounded border border-slate-700 shadow-md">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-3 border-b border-slate-800 pb-3">
              <span className="text-blue-400 font-bold uppercase text-sm tracking-wider">História &amp; Lore</span>
              <div className="flex gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-blue-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-colors shadow-md flex items-center gap-1">
                  ↑ Upload Arquivos
                  <input type="file" id="upload-historia" accept=".pdf,.txt,.doc,.docx,.md" className="hidden" multiple />
                </label>
                <button id="btn-explorar-historia" className="px-3 py-1.5 bg-slate-800 hover:bg-blue-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-colors shadow-md">
                  Explorar Arquivos
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2" id="lista-arquivos-historia">
              <span className="text-xs text-slate-500 italic">Nenhum lore carregado...</span>
            </div>
          </div>

          {/* Bloco de Personagem Vinculado */}
          <div className="bg-black/50 p-4 rounded border border-slate-700 shadow-md flex flex-col gap-2">
            <span className="text-yellow-400 font-bold uppercase text-sm tracking-wider border-b border-slate-800 pb-2">Personagem Principal / Grupo (Obrigatório)</span>
            <p className="text-xs text-slate-400">Selecione um herói do mesmo sistema ou crie/vincule agora mesmo:</p>
            <div className="flex flex-col md:flex-row gap-2 items-center">
              <select id="campanha-personagem-select" className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-yellow-500 font-bold">
                <option value="">Selecione um Herói (Tormenta20)...</option>
              </select>
              <button id="btn-criar-pc-rapido" type="button" className="whitespace-nowrap px-3 py-2 bg-yellow-950 hover:bg-yellow-800 text-yellow-300 border border-yellow-700 rounded text-xs font-bold transition-colors">
                + Criar Novo Herói
              </button>
            </div>
          </div>
        </div>

        {/* Botões de Ação Final */}
        <div className="flex gap-4 w-full mt-2">
          <button onClick={() => document.getElementById('btn-inicio')?.click()} className="py-3 px-6 bg-transparent hover:bg-slate-800 text-slate-400 font-bold rounded border border-slate-700 transition-colors uppercase tracking-wider text-sm w-1/3">Cancelar</button>
          <button id="btn-criar-campanha" className="py-3 px-6 bg-violet-950 hover:bg-violet-700 text-white font-bold rounded border border-violet-800 transition-colors uppercase tracking-wider text-sm flex-1 shadow-lg">Iniciar Aventura</button>
        </div>
      </div>
    </section>
  );
}
