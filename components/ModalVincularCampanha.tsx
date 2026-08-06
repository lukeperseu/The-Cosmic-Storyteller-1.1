'use client';

import React from 'react';

export default function ModalVincularCampanha() {
  return (
    <div id="modal-vincular-campanha" className="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-wider" id="modal-vincular-titulo">Vincular Herói a Campanha</h3>
          <button id="modal-vincular-fechar" className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
        </div>
        <p id="modal-vincular-subtitulo" className="text-xs text-slate-300 font-medium">Selecione uma das suas campanhas existentes para vincular a este herói:</p>
        <select id="modal-vincular-select" className="w-full p-3 bg-slate-950 border border-slate-700 text-slate-100 font-bold rounded text-xs focus:outline-none focus:border-emerald-500">
          <option value="">Carregando campanhas...</option>
        </select>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button id="modal-vincular-cancelar" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-xs transition-colors">Cancelar</button>
          <button id="modal-vincular-confirmar" className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-xs shadow transition-colors">Salvar Vinculação</button>
        </div>
      </div>
    </div>
  );
}
