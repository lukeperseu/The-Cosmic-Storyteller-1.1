'use client';

import React from 'react';

export default function ModalExplorar() {
  return (
    <div id="modal-explorar" className="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-violet-400 uppercase tracking-wider" id="modal-titulo">Explorar Biblioteca Local</h3>
          <button id="modal-fechar" className="text-slate-400 hover:text-white font-bold">✕</button>
        </div>
        <div id="modal-lista-arquivos" className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          <span className="text-xs text-slate-500 italic">Nenhum arquivo na biblioteca...</span>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button id="modal-cancelar" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-xs">Cancelar</button>
          <button id="modal-confirmar" className="px-4 py-2 bg-violet-950 hover:bg-violet-700 text-white font-bold rounded text-xs shadow">Vincular Selecionados</button>
        </div>
      </div>
    </div>
  );
}
