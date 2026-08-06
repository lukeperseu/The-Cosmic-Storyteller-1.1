'use client';

import React from 'react';

interface ModalTabelaDinheiroProps {
  isOpen: boolean;
  onClose: () => void;
  onAplicarDinheiro?: (valor: number) => void;
}

const TABELA_DINHEIRO: { nivel: number; valor: number }[] = [
  { nivel: 1, valor: 20 },
  { nivel: 2, valor: 300 },
  { nivel: 3, valor: 600 },
  { nivel: 4, valor: 1000 },
  { nivel: 5, valor: 2000 },
  { nivel: 6, valor: 3000 },
  { nivel: 7, valor: 5000 },
  { nivel: 8, valor: 7000 },
  { nivel: 9, valor: 10000 },
  { nivel: 10, valor: 13000 },
  { nivel: 11, valor: 19000 },
  { nivel: 12, valor: 27000 },
  { nivel: 13, valor: 36000 },
  { nivel: 14, valor: 49000 },
  { nivel: 15, valor: 66000 },
  { nivel: 16, valor: 88000 },
  { nivel: 17, valor: 110000 },
  { nivel: 18, valor: 150000 },
  { nivel: 19, valor: 200000 },
  { nivel: 20, valor: 260000 }
];

export default function ModalTabelaDinheiro({ isOpen, onClose, onAplicarDinheiro }: ModalTabelaDinheiroProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-yellow-700/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-full bg-yellow-950 border border-yellow-500 flex items-center justify-center text-xl">
            💰
          </div>
          <div>
            <h2 className="text-xl font-bold text-yellow-400">Dinheiro Inicial & Equipamento por Nível</h2>
            <p className="text-xs text-slate-400">Diretrizes de Tibares (T$) de acordo com o Nível do Herói</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h3 className="font-bold text-yellow-400 text-xs uppercase tracking-wider">🎒 Pertences Iniciais de Nível 1</h3>
            <p className="leading-relaxed">
              Todo herói recém-criado de Nível 1 começa automaticamente com os seguintes itens e equipamentos:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 font-mono">
              <li><strong>Mochila, saco de dormir e traje de viajante.</strong></li>
              <li>Uma <strong>arma simples</strong> à sua escolha (ou arma marcial caso possua proficiência).</li>
              <li>Uma <strong>armadura de couro</strong>, couro batido ou gibão de peles (ou brunea se tiver proficiência com armaduras pesadas; escudo leve se tiver proficiência com escudos; Arcanistas começam sem armadura).</li>
              <li>Dinheiro inicial: <strong>4d4 T$ (ou T$ 4 a 20)</strong>.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-yellow-400 mb-2 uppercase tracking-wider text-xs">
              📊 Tabela de Dinheiro Inicial por Nível Superior
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Para personagens criados em níveis acima de 1, utilize a tabela abaixo para determinar o valor total de patrimônio/dinheiro inicial:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              {TABELA_DINHEIRO.map((item) => (
                <div
                  key={item.nivel}
                  className="bg-black p-2.5 rounded border border-slate-800 flex items-center justify-between hover:border-yellow-600 transition-colors"
                >
                  <span className="font-bold text-slate-400">Nível {item.nivel}:</span>
                  <span className="font-bold text-yellow-400">T$ {item.valor.toLocaleString('pt-BR')}</span>
                  {onAplicarDinheiro && (
                    <button
                      type="button"
                      onClick={() => {
                        onAplicarDinheiro(item.valor);
                        onClose();
                      }}
                      title="Usar este valor na ficha"
                      className="ml-1 text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-800 px-1 rounded"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
