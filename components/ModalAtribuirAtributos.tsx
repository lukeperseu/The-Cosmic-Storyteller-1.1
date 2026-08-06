'use client';

import React, { useState } from 'react';

interface ModalAtribuirAtributosProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (attrs: { for: number; des: number; con: number; int: number; sab: number; car: number }) => void;
}

const COST_TABLE: Record<number, number> = {
  '-1': -1,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 4,
  '4': 7,
};

function convertD6ScoreToT20(score: number): number {
  if (score <= 3) return -4;
  if (score <= 5) return -3;
  if (score <= 7) return -2;
  if (score <= 9) return -1;
  if (score <= 11) return 0;
  if (score <= 13) return 1;
  if (score <= 15) return 2;
  if (score <= 17) return 3;
  return 4;
}

export default function ModalAtribuirAtributos({ isOpen, onClose, onApply }: ModalAtribuirAtributosProps) {
  const [metodo, setMetodo] = useState<'pontos' | 'rolagens'>('pontos');

  // Estado para Método de Pontos
  const [pontosAttrs, setPontosAttrs] = useState<{ for: number; des: number; con: number; int: number; sab: number; car: number }>({
    for: 0,
    des: 0,
    con: 0,
    int: 0,
    sab: 0,
    car: 0,
  });

  // Estado para Método de Rolagens
  interface RollDetail {
    dadoOriginal: number[]; // ex: [4, 5, 2, 6]
    menorDescartado: number; // ex: 2
    soma3Maiores: number; // ex: 15
    valorT20: number; // ex: +2
    rerolado?: boolean;
  }
  const [rollHistory, setRollHistory] = useState<RollDetail[]>([]);
  const [rolledValues, setRolledValues] = useState<number[]>([]);
  const [assignment, setAssignment] = useState<Record<string, number | null>>({
    for: null,
    des: null,
    con: null,
    int: null,
    sab: null,
    car: null,
  });
  const [rerollLog, setRerollLog] = useState<string[]>([]);

  if (!isOpen) return null;

  // Cálculo de Pontos Gastos
  const calcularPontosGastos = () => {
    return Object.values(pontosAttrs).reduce((acc, val) => acc + (COST_TABLE[val] ?? 0), 0);
  };

  const pontosGastos = calcularPontosGastos();
  const pontosRestantes = 10 - pontosGastos;

  const handlePontosChange = (attrKey: keyof typeof pontosAttrs, delta: number) => {
    const atual = pontosAttrs[attrKey];
    const novo = atual + delta;
    if (novo < -1 || novo > 4) return; // Limites de compra de pontos em T20

    const novoObjeto = { ...pontosAttrs, [attrKey]: novo };
    const custoTotal = Object.values(novoObjeto).reduce((acc, val) => acc + (COST_TABLE[val] ?? 0), 0);
    if (custoTotal > 10) return; // Não permite exceder 10 pontos

    setPontosAttrs(novoObjeto);
  };

  // Função para Rolar 4d6 Descarte Menor com Proteção de Soma Mínima 6
  const executarRolagem4d6 = () => {
    const logs: string[] = [];

    const rollOne = (): RollDetail => {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      const sorted = [...dice].sort((a, b) => b - a);
      const top3Sum = sorted[0] + sorted[1] + sorted[2];
      const t20 = convertD6ScoreToT20(top3Sum);
      return {
        dadoOriginal: dice,
        menorDescartado: sorted[3],
        soma3Maiores: top3Sum,
        valorT20: t20,
      };
    };

    let rolls: RollDetail[] = [];
    for (let i = 0; i < 6; i++) {
      rolls.push(rollOne());
    }

    let t20Values = rolls.map((r) => r.valorT20);
    let totalSum = t20Values.reduce((a, b) => a + b, 0);

    let attempts = 0;
    while (totalSum < 6 && attempts < 50) {
      attempts++;
      // Encontrar o menor valor obtido e re-rolar
      let minIdx = 0;
      let minVal = rolls[0].valorT20;
      for (let i = 1; i < rolls.length; i++) {
        if (rolls[i].valorT20 < minVal) {
          minVal = rolls[i].valorT20;
          minIdx = i;
        }
      }

      logs.push(`Soma atual (${totalSum}) é menor que 6. Re-rolando o menor valor (Rolagem #${minIdx + 1}: ${minVal >= 0 ? '+' + minVal : minVal})...`);
      const newRoll = rollOne();
      newRoll.rerolado = true;
      rolls[minIdx] = newRoll;

      t20Values = rolls.map((r) => r.valorT20);
      totalSum = t20Values.reduce((a, b) => a + b, 0);
    }

    if (logs.length > 0) {
      logs.push(`Soma final atingida com sucesso: ${totalSum} (>= 6).`);
    }

    setRollHistory(rolls);
    setRolledValues(t20Values);
    setRerollLog(logs);

    // Auto-distribuir inicialmente
    setAssignment({
      for: t20Values[0],
      des: t20Values[1],
      con: t20Values[2],
      int: t20Values[3],
      sab: t20Values[4],
      car: t20Values[5],
    });
  };

  const handleApplyToSheet = () => {
    let finalAttrs = { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 };

    if (metodo === 'pontos') {
      finalAttrs = { ...pontosAttrs };
    } else {
      finalAttrs = {
        for: assignment.for ?? 0,
        des: assignment.des ?? 0,
        con: assignment.con ?? 0,
        int: assignment.int ?? 0,
        sab: assignment.sab ?? 0,
        car: assignment.car ?? 0,
      };
    }

    // Atualizar no DOM e disparar listener
    const attrsList = ['for', 'des', 'con', 'int', 'sab', 'car'] as const;
    attrsList.forEach((attr) => {
      const el = document.getElementById(`pc-${attr}-base`) as HTMLInputElement;
      if (el) {
        el.value = finalAttrs[attr].toString();
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    if (onApply) {
      onApply(finalAttrs);
    }

    onClose();
  };

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
            🎲
          </div>
          <div>
            <h2 className="text-xl font-bold text-violet-300">Gerador de Atributos Iniciais</h2>
            <p className="text-xs text-slate-400">Tormenta20 — Escolha seu Método de Distribuição</p>
          </div>
        </div>

        {/* Seleção do Método */}
        <div className="flex bg-black p-1 rounded-lg border border-slate-800 mb-6 gap-1">
          <button
            type="button"
            onClick={() => setMetodo('pontos')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              metodo === 'pontos'
                ? 'bg-violet-900 text-white shadow border border-violet-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            ⚖️ Método por Pontos (10 Pts)
          </button>
          <button
            type="button"
            onClick={() => setMetodo('rolagens')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              metodo === 'rolagens'
                ? 'bg-violet-900 text-white shadow border border-violet-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            🎲 Método por Rolagens (4d6)
          </button>
        </div>

        {/* Conteúdo do Método de Pontos */}
        {metodo === 'pontos' && (
          <div className="space-y-4">
            <div className="bg-black/60 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Pontos Disponíveis:</span>
                <span className="text-[11px] text-slate-500">Distribua entre os 6 atributos (-1 a +4)</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xl font-black font-mono ${
                    pontosRestantes === 0
                      ? 'text-green-400'
                      : pontosRestantes > 0
                      ? 'text-amber-400'
                      : 'text-red-500'
                  }`}
                >
                  {pontosRestantes}
                </span>
                <span className="text-xs text-slate-400 block font-mono">/ 10 pts</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'for', label: 'FORÇA (FOR)' },
                { key: 'des', label: 'DESTREZA (DES)' },
                { key: 'con', label: 'CONSTITUIÇÃO (CON)' },
                { key: 'int', label: 'INTELICÊNCIA (INT)' },
                { key: 'sab', label: 'SABEDORIA (SAB)' },
                { key: 'car', label: 'CARISMA (CAR)' },
              ].map(({ key, label }) => {
                const k = key as keyof typeof pontosAttrs;
                const val = pontosAttrs[k];
                const cust = COST_TABLE[val] ?? 0;

                return (
                  <div
                    key={key}
                    className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">{label}</span>
                      <span className="text-[10px] text-slate-500">
                        Custo acumulado:{' '}
                        <strong className={cust < 0 ? 'text-green-400' : 'text-violet-300'}>
                          {cust < 0 ? `${cust} pt (+1 rec.)` : `${cust} pt${cust !== 1 ? 's' : ''}`}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePontosChange(k, -1)}
                        disabled={val <= -1}
                        className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-200 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        -
                      </button>

                      <span
                        className={`w-10 text-center font-bold text-base font-mono ${
                          val > 0 ? 'text-violet-400' : val < 0 ? 'text-red-400' : 'text-slate-200'
                        }`}
                      >
                        {val >= 0 ? `+${val}` : `${val}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handlePontosChange(k, 1)}
                        disabled={val >= 4 || pontosRestantes < (COST_TABLE[val + 1] ?? 0) - cust}
                        className="w-8 h-8 rounded bg-violet-950 hover:bg-violet-800 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-violet-200 border border-violet-700 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-950/70 p-3 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">💡 Tabela Oficial de Custo de Pontos:</span>
              <div className="grid grid-cols-6 gap-1 text-center font-mono text-[10px] pt-1">
                <div className="bg-black/60 p-1 rounded border border-slate-800">
                  -1 ➔ <span className="text-green-400 font-bold">-1pt</span>
                </div>
                <div className="bg-black/60 p-1 rounded border border-slate-800">
                  0 ➔ <span>0pt</span>
                </div>
                <div className="bg-black/60 p-1 rounded border border-slate-800">
                  +1 ➔ <span>1pt</span>
                </div>
                <div className="bg-black/60 p-1 rounded border border-slate-800">
                  +2 ➔ <span>2pts</span>
                </div>
                <div className="bg-black/60 p-1 rounded border border-slate-800">
                  +3 ➔ <span>4pts</span>
                </div>
                <div className="bg-black/60 p-1 rounded border border-slate-800">
                  +4 ➔ <span>7pts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo do Método de Rolagens */}
        {metodo === 'rolagens' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-black/60 p-4 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs text-slate-300 font-bold block">
                  Rolar 6 Atributos (4d6 descarte o menor)
                </span>
                <span className="text-[11px] text-slate-500">
                  Garante proteção de soma total mínima &ge; 6 em T20
                </span>
              </div>
              <button
                type="button"
                onClick={executarRolagem4d6}
                className="w-full sm:w-auto px-5 py-2.5 bg-violet-900 hover:bg-violet-800 text-violet-100 font-bold text-xs rounded-lg border border-violet-600 transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🎲</span> Rolar Dados
              </button>
            </div>

            {rollHistory.length > 0 && (
              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="text-xs font-bold text-violet-400 mb-2 uppercase tracking-wide">
                    Resultados Obtidos ({rolledValues.reduce((a, b) => a + b, 0)} pts no total):
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {rollHistory.map((rh, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs flex flex-col justify-between ${
                          rh.rerolado
                            ? 'bg-amber-950/20 border-amber-800/60'
                            : 'bg-black border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>
                            Rolagem #{idx + 1} {rh.rerolado && '🔄 (Re-rolado)'}
                          </span>
                          <span className="font-mono">[{rh.dadoOriginal.join(', ')}]</span>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[11px] text-slate-400">
                            Soma (3d6): <strong>{rh.soma3Maiores}</strong>
                          </span>
                          <span
                            className={`font-black font-mono text-sm ${
                              rh.valorT20 > 0
                                ? 'text-violet-400'
                                : rh.valorT20 < 0
                                ? 'text-red-400'
                                : 'text-slate-200'
                            }`}
                          >
                            T20: {rh.valorT20 >= 0 ? `+${rh.valorT20}` : `${rh.valorT20}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {rerollLog.length > 0 && (
                  <div className="bg-amber-950/20 p-2.5 rounded border border-amber-900/40 text-[10px] text-amber-300 space-y-1">
                    <span className="font-bold block">🛡️ Proteção do Sistema Tormenta20 Aplicada:</span>
                    {rerollLog.map((log, i) => (
                      <p key={i} className="font-mono">
                        • {log}
                      </p>
                    ))}
                  </div>
                )}

                {/* Atribuição dos Valores */}
                <div className="bg-black/60 p-3.5 rounded-lg border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Atribuir Valores aos Atributos:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: 'for', label: 'FORÇA (FOR)' },
                      { key: 'des', label: 'DESTREZA (DES)' },
                      { key: 'con', label: 'CONSTITUIÇÃO (CON)' },
                      { key: 'int', label: 'INTELICÊNCIA (INT)' },
                      { key: 'sab', label: 'SABEDORIA (SAB)' },
                      { key: 'car', label: 'CARISMA (CAR)' },
                    ].map(({ key, label }) => {
                      const k = key as keyof typeof assignment;
                      const currentVal = assignment[k];

                      return (
                        <div
                          key={key}
                          className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-slate-300">{label}</span>
                          <select
                            value={currentVal ?? ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setAssignment({ ...assignment, [k]: isNaN(val) ? null : val });
                            }}
                            className="p-1.5 bg-black border border-slate-700 text-violet-300 font-bold rounded text-xs focus:outline-none focus:border-violet-500 font-mono"
                          >
                            {rolledValues.map((rv, i) => (
                              <option key={i} value={rv}>
                                Valor #{i + 1}: {rv >= 0 ? `+${rv}` : `${rv}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-slate-800 pt-4 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded border border-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyToSheet}
            disabled={metodo === 'pontos' && pontosRestantes < 0}
            className="px-5 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg border border-green-500 shadow transition-all cursor-pointer flex items-center gap-2"
          >
            <span>✓</span> Aplicar Atributos na Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
