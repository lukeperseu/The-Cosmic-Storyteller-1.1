'use client';

import React from 'react';

export default function SidebarLogs() {
  return (
    <aside id="sidebar-logs" className="bg-slate-900/95 backdrop-blur-md w-80 h-full fixed top-0 right-0 transform translate-x-full transition-transform duration-300 z-40 pt-16 border-l border-slate-800 flex flex-col shadow-2xl">
      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Console de Logs</span>
        <button id="btn-fechar-logs" className="text-slate-500 hover:text-white text-xs px-2 transition-colors">✕</button>
      </div>
      <div id="container-logs-conteudo" className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 font-mono text-[11px]">
        <div className="text-slate-500">[Sistema] Monitor de eventos iniciado.</div>
      </div>
    </aside>
  );
}
