'use client';

import React, { useState } from 'react';

interface ModalRegrasIdadeProps {
  isOpen: boolean;
  onClose: () => void;
  onAplicarIdade?: (idade: number) => void;
}

export default function ModalRegrasIdade({ isOpen, onClose, onAplicarIdade }: ModalRegrasIdadeProps) {
  const [classeSelecionada, setClasseSelecionada] = useState('barbaro');
  const [resultadoRolagem, setResultadoRolagem] = useState<number | null>(null);

  if (!isOpen) return null;

  const rolarDado = (quantidade: number, lados: number) => {
    let total = 0;
    for (let i = 0; i < quantidade; i++) {
      total += Math.floor(Math.random() * lados) + 1;
    }
    return total;
  };

  const handleRolarIdade = () => {
    let idade = 0;
    if (['barbaro', 'bucaneiro', 'ladino', 'lutador'].includes(classeSelecionada)) {
      idade = rolarDado(1, 6) + 15;
    } else if (['bardo', 'cacador', 'cavaleiro', 'guerreiro', 'nobre', 'paladino'].includes(classeSelecionada)) {
      idade = rolarDado(2, 4) + 15;
    } else {
      // Arcanista, Clérigo, Druida, Inventor
      idade = rolarDado(2, 6) + 15;
    }

    setResultadoRolagem(idade);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-violet-700/80 rounded-xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-full bg-violet-950 border border-violet-500 flex items-center justify-center text-xl">
            📜
          </div>
          <div>
            <h2 className="text-xl font-bold text-violet-300">Regras de Idade & Envelhecimento</h2>
            <p className="text-xs text-slate-400">Manual de regras do Sistema Tormenta20</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <h3 className="font-bold text-violet-400 mb-1">Idade</h3>
            <p className="text-xs leading-relaxed text-slate-300">
              Muitos heróis são jovens, mas nem todos precisam ser. Não há idade certa para viver aventuras, perseguir sonhos e combater o mal.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h3 className="font-bold text-violet-400 mb-2 text-xs uppercase tracking-wider">Idade Inicial por Classe</h3>
            <p className="text-xs leading-relaxed mb-3">
              Você pode escolher a idade inicial de seu personagem ou determiná-la aleatoriamente, com uma rolagem que varia conforme sua classe:
            </p>
            <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-300 font-mono">
              <li>
                <strong className="text-amber-300">Bárbaro, Bucaneiro, Ladino, Lutador:</strong> 1d6+15 anos (16 a 21 anos).
              </li>
              <li>
                <strong className="text-amber-300">Bardo, Caçador, Cavaleiro, Guerreiro, Nobre, Paladino:</strong> 2d4+15 anos (17 a 23 anos).
              </li>
              <li>
                <strong className="text-amber-300">Arcanista, Clérigo, Druida, Inventor:</strong> 2d6+15 anos (17 a 27 anos).
              </li>
            </ul>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <h3 className="font-bold text-violet-400 text-xs uppercase tracking-wider">Envelhecimento & Modificadores</h3>
            <p className="text-xs text-slate-300">
              Conforme envelhecem, personagens recebem modificadores nos atributos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block">Maduro (45 Anos):</span>
                <span>For -1, Des -1, Con -1</span><br/>
                <span>Int +1, Sab +1, Car +1</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-red-400 font-bold block">Velho (70 Anos):</span>
                <span>For -2, Des -2, Con -2</span><br/>
                <span>Int +1, Sab +1, Car +1</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              * Modificadores são cumulativos (Velho soma um total de For -3, Des -3, Con -3, Int +2, Sab +2, Car +2). Longevidade máxima: 70 + 2d20 anos.
            </p>
          </div>

          {/* Gerador e Rolador de Idade */}
          <div className="p-4 bg-violet-950/40 rounded-lg border border-violet-800/80 flex flex-col gap-3">
            <h4 className="font-bold text-violet-300 text-xs uppercase">🎲 Rolar Idade Inicial Aleatória</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={classeSelecionada}
                onChange={(e) => setClasseSelecionada(e.target.value)}
                className="flex-1 p-2 bg-black border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
              >
                <option value="barbaro">Bárbaro, Bucaneiro, Ladino, Lutador (1d6+15)</option>
                <option value="bardo">Bardo, Caçador, Cavaleiro, Guerreiro, Nobre, Paladino (2d4+15)</option>
                <option value="arcanista">Arcanista, Clérigo, Druida, Inventor (2d6+15)</option>
              </select>
              <button
                type="button"
                onClick={handleRolarIdade}
                className="px-4 py-2 bg-violet-900 hover:bg-violet-700 text-white font-bold text-xs rounded transition-colors whitespace-nowrap border border-violet-600"
              >
                🎲 Rolar Idade
              </button>
            </div>

            {resultadoRolagem !== null && (
              <div className="flex items-center justify-between p-3 bg-black rounded border border-violet-600">
                <span className="text-xs text-slate-300 font-bold">
                  Resultado da Rolagem: <span className="text-violet-300 text-base ml-1">{resultadoRolagem} anos</span>
                </span>
                {onAplicarIdade && (
                  <button
                    type="button"
                    onClick={() => {
                      onAplicarIdade(resultadoRolagem);
                      onClose();
                    }}
                    className="px-3 py-1 bg-emerald-900 hover:bg-emerald-700 text-emerald-100 font-bold text-xs rounded transition-colors border border-emerald-600"
                  >
                    Aplicar na Ficha
                  </button>
                )}
              </div>
            )}
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
