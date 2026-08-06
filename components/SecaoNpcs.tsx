'use client';

import React, { useState } from 'react';
import ModalRegrasAtributos from './ModalRegrasAtributos';

export default function SecaoNpcs() {
  const [modalRegrasAtributosOpen, setModalRegrasAtributosOpen] = useState(false);
  return (
    <section id="secao-npcs" className="hidden max-w-5xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-violet-400 tracking-tight">Painel de Personagens (NPCs)</h1>
        <p className="text-slate-500 mt-1 text-sm">Gerencie os registros mecânicos e narrativos.</p>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-lg border border-slate-800 flex flex-col gap-4 shadow-xl">
        <details id="details-novo-npc" className="group bg-slate-800/50 rounded border border-slate-800">
          <summary className="cursor-pointer font-bold text-slate-400 p-4 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
            Ficha Estruturada<span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
          </summary>

          <div className="p-3">
            <div className="flex flex-col gap-2 mb-2 p-3 bg-slate-950/60 rounded border border-slate-700/80">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sistema Base / Material de Mecânica & Lore RPG:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select defaultValue="Tormenta20 (Nativo)" id="npc-sistema" className="flex-1 p-3 bg-black border border-slate-700 text-violet-300 rounded focus:outline-none focus:border-violet-500 font-bold">
                  <option value="Tormenta20 (Nativo)">Tormenta20 (Nativo)</option>
                  <option value="D&amp;D 5e (Upload)">D&amp;D 5e (Upload)</option>
                </select>
                <div className="flex gap-2">
                  <input type="text" id="npc-novo-sistema-nome" placeholder="Digite novo RPG / Sistema..." className="p-3 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs flex-1 sm:w-60 focus:outline-none focus:border-violet-500" />
                  <button type="button" id="npc-btn-add-sistema" className="px-4 py-2 bg-violet-950 hover:bg-violet-800 text-violet-200 border border-violet-700 font-bold rounded text-xs transition-colors whitespace-nowrap">
                    + Incluir
                  </button>
                </div>
              </div>
            </div>

            <details className="group bg-slate-800 rounded border border-slate-700 mt-2">
              <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                Cabeçalho
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-3 border-t border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <input type="text" id="nome-personagem" placeholder="Nome" className="p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500" />
                  <select defaultValue="" id="tipo-npc" className="p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500">
                    <option value="" disabled>Tipo de NPC</option>
                    <option value="Figurante">Figurante</option>
                    <option value="Coadjuvante">Coadjuvante</option>
                    <option value="Principal">Principal</option>
                  </select>
                  <input type="text" id="raça-personagem" placeholder="Raça" className="p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500" />
                  <input type="text" id="origem-personagem" placeholder="Origem" className="p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500" />
                  <input type="text" id="divindade-personagem" placeholder="Divindade" className="p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500" />
                  <input type="number" id="nivel-total" placeholder="Nível Ttl (Auto)" readOnly className="p-3 bg-slate-900 border border-slate-700 text-slate-500 rounded cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <input type="text" id="1ªclasse-personagem" placeholder="1ª Classe" className="w-2/3 p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500" /> 
                    <input type="number" id="nível1ªclasse" placeholder="Lvl" defaultValue="1" min="1" className="w-1/3 p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500 num-nivel" />
                  </div>
                  <div>
                    <button id="btn-add-classe2" className="text-violet-400 hover:text-violet-300 text-sm mb-1 underline transition-colors">Adicionar 2ª Classe</button>
                    <div id="container-classe2" className="hidden flex gap-2">
                      <input type="text" id="2ªclasse-personagem" placeholder="2ª Classe" className="w-2/3 p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500" /> 
                      <input type="number" id="nível2ªclasse" placeholder="Lvl" defaultValue="0" min="0" className="w-1/3 p-3 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500 num-nivel" />
                    </div>
                  </div>
                </div>
              </div>
            </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span>Atributos</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalRegrasAtributosOpen(true);
                  }}
                  className="w-5 h-5 rounded-full bg-violet-950 border border-violet-600 hover:bg-violet-800 text-violet-300 text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer"
                  title="Orientação e Regras de Atributos T20"
                >
                  ?
                </button>
              </div>
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['for', 'des', 'con', 'int', 'sab', 'car'].map((attr) => (
                <div key={attr} className="bg-black p-2 rounded border border-slate-800 flex items-center justify-between gap-1">
                  <span className="font-bold text-slate-300 w-10">{attr.toUpperCase()}</span>
                  <input type="number" id={`${attr}-base`} placeholder="Base" className="w-16 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-violet-500 attr-calc" />
                  <span className="text-slate-500 text-xs">+</span>
                  <input type="number" id={`${attr}-bonus`} placeholder="Bônus" className="w-16 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-violet-500 attr-calc" />
                  <span className="text-slate-500 text-xs">=</span>
                  <input type="text" id={`${attr}-mod`} placeholder="Mod" readOnly className="w-16 p-2 bg-slate-800 border border-slate-700 text-violet-400 font-bold rounded text-center cursor-not-allowed" />
                </div>
              ))}
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Perícias
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 overflow-x-auto flex flex-col gap-4">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-400 uppercase font-bold text-center mb-2 px-2">
                  <div className="col-span-3 text-left">Perícia</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1">1/2 Lvl</div>
                  <div className="col-span-1">Attr</div>
                  <div className="col-span-1">Treino</div>
                  <div className="col-span-2">Outros</div>
                  <div className="col-span-3 text-left">Notas (Pen / Somente Treinado)</div>
                </div>
                <div id="container-pericias" className="flex flex-col gap-1"></div>
              </div>

              <div className="border-t border-slate-700 pt-3 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-violet-400 uppercase">Especialidades (Conhecimento / Ofício)</span>
                  <button id="btn-add-especialidade" className="text-xs text-green-500 border border-green-700 border-dashed rounded px-2 py-1 hover:bg-green-900/30 transition-colors">+ Adicionar Especialidade</button>
                </div>
                <div id="container-especialidades" className="flex flex-col gap-2"></div>
              </div>
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Recursos e Defesa
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3 bg-black p-4 rounded border border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-red-500 w-10">PV</span>
                  <input type="number" id="pv-atual" placeholder="Atual" className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-red-500" />
                  <span className="text-slate-500">/</span>
                  <input type="number" id="pv-max" placeholder="Máx" className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-red-500" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-blue-500 w-10">PM</span>
                  <input type="number" id="pm-atual" placeholder="Atual" className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-blue-500" />
                  <span className="text-slate-500">/</span>
                  <input type="number" id="pm-max" placeholder="Máx" className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="bg-black p-4 rounded border border-slate-800 flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-300">Defesa Total</span>
                  <input type="text" id="defesa-total" readOnly defaultValue="10" className="w-20 p-2 bg-slate-800 border border-slate-700 text-yellow-500 font-bold rounded text-center cursor-not-allowed" />
                </div>
                <div className="flex items-center justify-between gap-1 text-sm">
                  <span className="text-slate-500 font-bold">10 +</span>
                  <div className="flex flex-col items-center">
                    <input type="number" readOnly id="def-des" placeholder="0" className="w-12 p-1 bg-slate-800 border border-slate-700 text-slate-200 rounded text-center def-calc" />
                    <span className="text-slate-600 text-[10px] mt-1">DES</span>
                  </div>
                  <span className="text-slate-500">+</span>
                  <div className="flex flex-col items-center">
                    <input type="number" id="def-arm" placeholder="0" className="w-12 p-1 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center def-calc" />
                    <span className="text-slate-600 text-[10px] mt-1">ARM</span>
                  </div>
                  <span className="text-slate-500">+</span>
                  <div className="flex flex-col items-center">
                    <input type="number" id="def-esc" placeholder="0" className="w-12 p-1 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center def-calc" />
                    <span className="text-slate-600 text-[10px] mt-1">ESC</span>
                  </div>
                  <span className="text-slate-500">+</span>
                  <div className="flex flex-col items-center">
                    <input type="number" id="def-out" placeholder="0" className="w-12 p-1 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center def-calc" />
                    <span className="text-slate-600 text-[10px] mt-1">OUT</span>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Armaduras &amp; Escudos
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 flex flex-col gap-2">
              <div id="container-equipamentos" className="flex flex-col gap-2"></div>
              <button id="btn-add-equip" className="mt-2 text-sm text-yellow-500 border border-yellow-700 border-dashed rounded p-2 hover:bg-yellow-900/30 transition-colors">+ Adicionar Equipamento</button>
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Ataques
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 flex flex-col gap-2">
              <div id="container-ataques" className="flex flex-col gap-4"></div>
              <button id="btn-add-atk" className="mt-2 text-sm text-red-500 border border-red-700 border-dashed rounded p-2 hover:bg-red-900/30 transition-colors">+ Adicionar Ataque</button>
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Habilidades, Magias &amp; Informações Livres
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 flex flex-col gap-4">
              <div id="container-textos-dinamicos" className="flex flex-col gap-4"></div>
              <button id="btn-add-texto" className="mt-2 text-sm text-blue-500 border border-blue-700 border-dashed rounded p-2 hover:bg-blue-900/30 transition-colors">+ Adicionar Categoria</button>
              
              <div className="flex gap-4 border-t border-slate-700 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 font-bold">T$ (Tibares)</span>
                  <input type="number" id="valor-tibares" className="w-24 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-yellow-500" placeholder="0" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Carga</span>
                  <input type="text" id="valor-carga" className="w-24 p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-center focus:outline-none focus:border-violet-500" placeholder="0/0" />
                </div>
              </div>
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Inventário
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 flex flex-col gap-2">
              <div id="container-inventario" className="flex flex-col gap-2"></div>
              <button id="btn-add-inv" className="mt-2 text-sm text-green-500 border border-green-700 border-dashed rounded p-2 hover:bg-green-900/30 transition-colors">+ Adicionar Item</button>
            </div>
          </details>

          <details className="group bg-slate-800 rounded border border-slate-700">
            <summary className="cursor-pointer font-bold text-violet-400 p-3 flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
              Lore &amp; Diário
              <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-slate-700 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-violet-400 font-bold uppercase">Background</label>
                <textarea id="texto-lore" rows={4} className="w-full p-2 bg-black border border-slate-700 text-slate-200 rounded focus:outline-none focus:border-violet-500 text-sm" placeholder="História do personagem..."></textarea>
              </div>
              
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs text-violet-400 font-bold uppercase">Participação por Episódio</label>
                <div id="container-episodios" className="flex flex-col gap-3"></div>
                <button id="btn-add-ep" className="mt-2 text-sm text-blue-500 border border-blue-700 border-dashed rounded p-2 hover:bg-blue-900/30 transition-colors">+ Adicionar Episódio</button>
              </div>
            </div>
          </details>

          <div className="flex flex-col sm:flex-row gap-2 mt-6 mb-4">
            <button id="btn-salvar" className="flex-1 bg-violet-950 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg border border-violet-800">
              Salvar no Banco de Dados
            </button>
            <button id="btn-limpar-npc" type="button" className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded transition-colors border border-slate-700 text-xs">
              🔄 Limpar / Novo NPC
            </button>
          </div>
          </div>
        </details>
      </div>
      <div id="lista-personagens" className="mt-8 space-y-4 relative z-10"></div>

      <ModalRegrasAtributos
        isOpen={modalRegrasAtributosOpen}
        onClose={() => setModalRegrasAtributosOpen(false)}
      />
    </section>
  );
}
