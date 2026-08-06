'use client';

import React from 'react';

export interface VereditoAuroraData {
  aprovado: boolean;
  veredito: string;
  esporroMoral: string;
  correcoes: string[];
}

interface ModalVereditoAuroraProps {
  isOpen: boolean;
  data: VereditoAuroraData | null;
  loading: boolean;
  onConfirmarSalvar: () => void;
  onFechar: () => void;
}

export default function ModalVereditoAurora({
  isOpen,
  data,
  loading,
  onConfirmarSalvar,
  onFechar,
}: ModalVereditoAuroraProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-violet-600 rounded-xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onFechar}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-12 h-12 rounded-full bg-violet-950 border-2 border-violet-500 flex items-center justify-center text-2xl shadow-lg">
            🧙‍♀️
          </div>
          <div>
            <h2 className="text-xl font-bold text-violet-300">Veredito da Mestre Aurora</h2>
            <p className="text-xs text-slate-400">Fiscalização de Regras e Coerência de Tormenta20</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-violet-300 font-bold text-sm">
              Mestre Aurora está examinando cada linha da sua ficha...
            </p>
            <p className="text-slate-400 text-xs italic">
              &quot;Hum, vejamos se esse aventureiro não tentou burlar as leis do cosmos...&quot;
            </p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Verdict Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase font-bold">Status do Veredito:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  data.aprovado
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                    : 'bg-red-950 border-red-600 text-red-300'
                }`}
              >
                {data.aprovado ? '✅ Aprovada' : '❌ Reprovada'} - {data.veredito}
              </span>
            </div>

            {/* Aurora's Moral Reprimand Box */}
            <div className="bg-slate-950 p-4 rounded-lg border border-violet-800/80 space-y-2">
              <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase">
                <span>💬 Fala da Mestre Aurora:</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-200 font-serif italic border-l-2 border-violet-500 pl-3 py-1 bg-violet-950/20 rounded-r">
                &quot;{data.esporroMoral}&quot;
              </p>
            </div>

            {/* List of Fixes / Feedback */}
            {data.correcoes && data.correcoes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">
                  {data.aprovado ? 'Análise do Personagem:' : '⚠️ Ajustes Obrigatórios Necessários:'}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {data.correcoes.map((item, idx) => (
                    <li
                      key={idx}
                      className={`p-2.5 rounded border flex items-start gap-2 ${
                        data.aprovado
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                          : 'bg-red-950/40 border-red-800/60 text-red-200'
                      }`}
                    >
                      <span>{data.aprovado ? '✓' : '•'}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 border-t border-slate-800 pt-4">
              {data.aprovado ? (
                <button
                  type="button"
                  onClick={onConfirmarSalvar}
                  className="px-6 py-2.5 bg-emerald-900 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors border border-emerald-600 flex items-center gap-2 shadow-lg"
                >
                  ⚔️ Confirmar & Salvar no Banco
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFechar}
                  className="px-6 py-2.5 bg-red-900 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors border border-red-600 flex items-center gap-2 shadow-lg"
                >
                  📝 Entendido! Corrigir Ficha
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
