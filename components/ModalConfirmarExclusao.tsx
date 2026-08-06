'use client';

import React from 'react';

export default function ModalConfirmarExclusao() {
  return (
    <div id="modal-confirmar-exclusao" className="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-red-900/50 rounded-lg max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-red-400 uppercase tracking-wider">Confirmar Exclusão</h3>
          <button id="modal-excluir-fechar" className="text-slate-400 hover:text-white font-bold">✕</button>
        </div>
        <p id="modal-excluir-mensagem" className="text-sm text-slate-300">
          Tem certeza de que deseja apagar este item? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button id="modal-excluir-cancelar" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-xs">Cancelar</button>
          <button id="modal-excluir-confirmar" className="px-4 py-2 bg-red-950 hover:bg-red-800 text-red-200 font-bold rounded text-xs border border-red-800 shadow">Apagar Definitivamente</button>
        </div>
      </div>
    </div>
  );
}
