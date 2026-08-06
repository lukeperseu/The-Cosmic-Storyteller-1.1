'use client';

import React from 'react';

interface ModalRegrasAtributosProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalRegrasAtributos({ isOpen, onClose }: ModalRegrasAtributosProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-violet-500/50 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-xl transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-full bg-violet-950 border border-violet-600 flex items-center justify-center text-xl font-bold text-violet-400 shadow">
            ?
          </div>
          <div>
            <h2 className="text-xl font-bold text-violet-300">Regras de Atributos — Tormenta20</h2>
            <p className="text-xs text-slate-400">Guia Oficial de Definição de Competências Básicas</p>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed">
          <p className="text-slate-300">
            Todo personagem tem seis atributos que definem suas competências básicas:{' '}
            <strong className="text-violet-300">Força</strong>, <strong className="text-violet-300">Destreza</strong>,{' '}
            <strong className="text-violet-300">Constituição</strong>, <strong className="text-violet-300">Inteligência</strong>,{' '}
            <strong className="text-violet-300">Sabedoria</strong> e <strong className="text-violet-300">Carisma</strong>.
          </p>

          <div className="bg-black/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <h3 className="font-bold text-amber-400 uppercase tracking-wide text-[11px]">Valores de Atributo em Tormenta20:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">0:</strong> Média humana.</li>
              <li><strong className="text-white">1 ou 2:</strong> Acima da média — o lenhador da vila acostumado ao trabalho pesado.</li>
              <li><strong className="text-white">3 ou 4:</strong> Pessoas extraordinárias — o conselheiro real erudito que leu toda a biblioteca.</li>
              <li><strong className="text-white">5 ou mais:</strong> Indivíduos heroicos.</li>
              <li><strong className="text-white">Valores Negativos:</strong> Abaixo da média (ex: criança tem Força –1; ancião frágil tem Constituição –2).</li>
            </ul>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <h3 className="font-bold text-violet-400 text-sm mb-2 flex items-center gap-1.5">
              <span>🎯</span> Definindo Seus Atributos Iniciais
            </h3>
            <p className="text-slate-400 mb-3">
              Há duas maneiras oficiais de definir seus atributos iniciais no Tormenta20:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Pontos */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-violet-300 mb-1 flex items-center gap-1">
                    <span>1.</span> Método por Pontos
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Você começa com todos os 6 atributos em <strong>0</strong> e recebe <strong>10 pontos</strong> para distribuí-los. Você também pode reduzir um atributo para <strong>–1</strong> para receber 1 ponto adicional.
                  </p>
                  
                  <table className="w-full text-center text-[11px] border-collapse bg-black/50 rounded overflow-hidden">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
                        <th className="py-1 px-2">Valor</th>
                        <th className="py-1 px-2">Custo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr><td className="py-1 font-mono text-red-400">-1</td><td className="py-1 text-green-400 font-bold">-1 (Ganha +1 pt)</td></tr>
                      <tr><td className="py-1 font-mono">0</td><td className="py-1">0 pt</td></tr>
                      <tr><td className="py-1 font-mono">+1</td><td className="py-1">1 pt</td></tr>
                      <tr><td className="py-1 font-mono">+2</td><td className="py-1">2 pts</td></tr>
                      <tr><td className="py-1 font-mono">+3</td><td className="py-1">4 pts</td></tr>
                      <tr><td className="py-1 font-mono">+4</td><td className="py-1">7 pts</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rolagens */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-violet-300 mb-1 flex items-center gap-1">
                    <span>2.</span> Método por Rolagens
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Role <strong>4d6</strong>, descarte o menor e some os 3 maiores. Repita 6 vezes. Converta os resultados para T20 conforme a tabela:
                  </p>

                  <div className="grid grid-cols-2 gap-1 text-[10px] bg-black/50 p-2 rounded border border-slate-800 mb-2 font-mono text-slate-300">
                    <div>3 ➔ <strong className="text-red-400">-4</strong></div>
                    <div>12-13 ➔ <strong className="text-violet-300">+1</strong></div>
                    <div>4-5 ➔ <strong className="text-red-400">-3</strong></div>
                    <div>14-15 ➔ <strong className="text-violet-300">+2</strong></div>
                    <div>6-7 ➔ <strong className="text-red-400">-2</strong></div>
                    <div>16-17 ➔ <strong className="text-violet-300">+3</strong></div>
                    <div>8-9 ➔ <strong className="text-red-400">-1</strong></div>
                    <div>18 ➔ <strong className="text-amber-300">+4</strong></div>
                    <div>10-11 ➔ <strong>0</strong></div>
                  </div>

                  <p className="text-[10px] text-amber-400/90 italic bg-amber-950/20 p-2 rounded border border-amber-900/40">
                    💡 <strong>Regra de Proteção:</strong> Caso a soma dos 6 atributos convertidos não atinja pelo menos <strong>6</strong>, o menor valor é automaticamente re-rolado até que a soma total seja 6 ou mais!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-violet-900 hover:bg-violet-800 text-violet-100 font-bold text-xs rounded border border-violet-700 transition-colors shadow cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
