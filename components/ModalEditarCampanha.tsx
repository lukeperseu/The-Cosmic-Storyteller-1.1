'use client';

import React from 'react';

export default function ModalEditarCampanha() {
  return (
    <div id="modal-editar-campanha" className="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full p-6 flex flex-col gap-5 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h3 className="text-lg font-bold text-cyan-400 uppercase tracking-wider" id="modal-editar-campanha-titulo">
              Editar Materiais e Dados da Campanha
            </h3>
          </div>
          <button id="modal-editar-campanha-fechar" className="text-slate-400 hover:text-white font-bold text-lg p-1">✕</button>
        </div>

        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Informações Básicas */}
          <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded border border-slate-800">
            <h4 className="text-xs font-bold uppercase text-violet-400 tracking-wider">Identificação da Campanha</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Título da Campanha</label>
                <input type="text" id="edit-camp-titulo" className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-100 font-bold rounded text-xs focus:outline-none focus:border-cyan-500" placeholder="Nome da Aventura" />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-bold block mb-1">Herói Principal (PC Vinculado)</label>
                <select id="edit-camp-heroi" className="w-full p-2.5 bg-slate-900 border border-slate-700 text-emerald-300 font-bold rounded text-xs focus:outline-none focus:border-cyan-500">
                  <option value="">Nenhum Herói Vinculado</option>
                </select>
              </div>
            </div>
          </div>

          {/* NPCs Vinculados */}
          <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded border border-slate-800">
            <h4 className="text-xs font-bold uppercase text-yellow-400 tracking-wider">NPCs e Ameaças Vinculados</h4>
            <p className="text-[11px] text-slate-400">Selecione os NPCs e monstros cadastrados que fazem parte desta campanha:</p>
            <div id="edit-camp-npcs-list" className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-xs text-slate-500 italic">Carregando NPCs...</span>
            </div>
          </div>

          {/* Materiais de Mecânica */}
          <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded border border-slate-800">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase text-cyan-400 tracking-wider">Materiais de Mecânica / Regras</h4>
              <button type="button" id="btn-edit-add-mecanica" className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-800 bg-cyan-950/60 px-2.5 py-1 rounded font-bold transition-colors">
                + Adicionar Material
              </button>
            </div>
            <div id="edit-camp-mecanicas-container" className="flex flex-col gap-2"></div>
          </div>

          {/* Materiais de Lore / História */}
          <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded border border-slate-800">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase text-purple-400 tracking-wider">Materiais de Lore / História (Universo)</h4>
              <button type="button" id="btn-edit-add-historia" className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800 bg-purple-950/60 px-2.5 py-1 rounded font-bold transition-colors">
                + Adicionar Lore
              </button>
            </div>
            <div id="edit-camp-historia-container" className="flex flex-col gap-2"></div>
          </div>

          {/* Notas do Mestre */}
          <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded border border-slate-800">
            <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider">Notas da Campanha / Diário do Mestre</h4>
            <textarea id="edit-camp-notas" rows={4} className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded focus:outline-none focus:border-amber-500" placeholder="Anotações secretas, ganchos de aventura, prazos, etc..."></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button id="modal-editar-campanha-cancelar" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-xs transition-colors">
            Cancelar
          </button>
          <button id="modal-editar-campanha-salvar" className="px-5 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded text-xs shadow-lg transition-colors flex items-center gap-1">
            💾 Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
