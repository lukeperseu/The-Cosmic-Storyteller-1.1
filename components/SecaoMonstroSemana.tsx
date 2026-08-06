'use client';

import React, { useState, useEffect } from 'react';
import { db, getCurrentUserId } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

interface ContratoMonstro {
  id: string;
  titulo: string;
  sistema: string;
  cenario?: string;
  pcVinculado?: string;
  personagemNome?: string;
  tematica?: string;
  status?: string;
  dataCriacao?: string;
}

export default function SecaoMonstroSemana() {
  const [sistema, setSistema] = useState('Tormenta20 (Nativo)');
  const [cenario, setCenario] = useState('Arton (Nativo)');
  const [nomeJogador, setNomeJogador] = useState('');
  const [nomeHeroi, setNomeHeroi] = useState('');
  const [racaHeroi, setRacaHeroi] = useState('Humano');
  const [classeHeroi, setClasseHeroi] = useState('Guerreiro');
  const [nivelHeroi, setNivelHeroi] = useState('1');
  const [tematica, setTematica] = useState('Caça a Monstro');
  const [carregando, setCarregando] = useState(false);
  const [contratos, setContratos] = useState<ContratoMonstro[]>([]);

  const carregarContratos = async () => {
    try {
      const uid = getCurrentUserId();
      const constraints: any[] = [where("tipo", "==", "monstro_semana")];
      if (uid) {
        constraints.push(where("userId", "==", uid));
      } else {
        constraints.push(where("userId", "==", "public"));
      }
      const q = query(collection(db, "Campanhas"), ...constraints);
      const snap = await getDocs(q);
      const lista: ContratoMonstro[] = [];
      snap.forEach((d) => {
        lista.push({ id: d.id, ...d.data() } as ContratoMonstro);
      });
      setContratos(lista);
    } catch (err) {
      console.warn("Erro ao buscar contratos de Monstro da Semana:", err);
    }
  };

  useEffect(() => {
    let active = true;
    const carregar = async () => {
      try {
        const uid = getCurrentUserId();
        const constraints: any[] = [where("tipo", "==", "monstro_semana")];
        if (uid) {
          constraints.push(where("userId", "==", uid));
        } else {
          constraints.push(where("userId", "==", "public"));
        }
        const q = query(collection(db, "Campanhas"), ...constraints);
        const snap = await getDocs(q);
        const lista: ContratoMonstro[] = [];
        snap.forEach((d) => {
          lista.push({ id: d.id, ...d.data() } as ContratoMonstro);
        });
        if (active) setContratos(lista);
      } catch (err) {
        console.warn("Erro ao buscar contratos de Monstro da Semana:", err);
      }
    };
    void carregar();

    const handleAuthChange = () => {
      void carregar();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-changed', handleAuthChange);
    }

    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-changed', handleAuthChange);
      }
    };
  }, []);

  const gerarMissaoEJogar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    try {
      const nomeFinal = nomeHeroi.trim() || 'Caçador de Monstros';
      const nomeJogadorFinal = nomeJogador.trim() || 'Aventureiro';
      const uid = getCurrentUserId() || 'public';

      // 1. Criar Personagem Exclusivo de Monstro da Semana
      const pcRef = await addDoc(collection(db, "Personagens"), {
        nome: nomeFinal,
        nomeJogador: nomeJogadorFinal,
        raca: racaHeroi,
        frstclasse: classeHeroi,
        nívelfrstclasse: nivelHeroi,
        niveltotal: parseInt(nivelHeroi) || 1,
        sistema: sistema.includes('D&D') ? 'D&D 5e' : 'Tormenta20',
        pvAtual: 20 + parseInt(nivelHeroi) * 4,
        pvMax: 20 + parseInt(nivelHeroi) * 4,
        pmAtual: 10 + parseInt(nivelHeroi) * 2,
        pmMax: 10 + parseInt(nivelHeroi) * 2,
        isJogador: false, // Não aparece em Meus Personagens a menos que convertido!
        isMonstroSemana: true,
        dataCriacao: new Date().toISOString(),
        userId: uid
      });

      // 2. Criar a Campanha de Monstro da Semana
      const tituloCampanha = `[Monstro da Semana] ${tematica}: ${nomeFinal}`;
      const campRef = await addDoc(collection(db, "Campanhas"), {
        titulo: tituloCampanha,
        tipo: 'monstro_semana',
        sistema: sistema.includes('D&D') ? 'D&D 5e' : 'Tormenta20',
        cenario: cenario,
        pcVinculado: pcRef.id,
        personagemNome: nomeFinal,
        nomeJogador: nomeJogadorFinal,
        tematica: tematica,
        episodioAtual: 1,
        status: 'Caça Ativa',
        historicoMensagens: [
          {
            id: '1',
            autor: 'iris',
            texto: `📜 **CONTRATO DE CAÇA: ${tematica.toUpperCase()}**\n\nSaudações, **${nomeFinal}** (${racaHeroi} ${classeHeroi}, Nível ${nivelHeroi})!\nVocê acaba de aceitar um contrato urgente de Monstro da Semana no cenário **${cenario}**.\n\nRelatos assustadores chegam da região próxima: rituais estranhos, silêncio na floresta e rastros de uma criatura formidável. O perigo é iminente. Como você inicia sua caçada?`,
            dataHora: new Date().toLocaleTimeString(),
          },
        ],
        dataCriacao: new Date().toISOString(),
        userId: uid
      });

      // 3. Setar como Campanha Ativa no LocalStorage e avisar o aplicativo
      if (typeof window !== 'undefined') {
        localStorage.setItem('campanha_ativa_id', campRef.id);
        window.dispatchEvent(new Event('carregarCampanhaJogo'));
      }

      // 4. Mudar de tela para secao-tela-jogo
      const todasSecoes = document.querySelectorAll('main > section');
      todasSecoes.forEach((sec) => sec.classList.add('hidden'));
      const secaoJogo = document.getElementById('secao-tela-jogo');
      if (secaoJogo) secaoJogo.classList.remove('hidden');

      if ((window as any).adicionarLog) {
        (window as any).adicionarLog(`Missão Monstro da Semana iniciada: "${tituloCampanha}"!`, 'sucesso');
      }

      await carregarContratos();
    } catch (err: any) {
      console.error("Erro ao criar missão Monstro da Semana:", err);
      alert("Erro ao criar missão: " + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const jogarContrato = (campId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('campanha_ativa_id', campId);
      window.dispatchEvent(new Event('carregarCampanhaJogo'));
    }
    const todasSecoes = document.querySelectorAll('main > section');
    todasSecoes.forEach((sec) => sec.classList.add('hidden'));
    const secaoJogo = document.getElementById('secao-tela-jogo');
    if (secaoJogo) secaoJogo.classList.remove('hidden');
  };

  const converterParaCampanha = async (contrato: ContratoMonstro) => {
    if (!confirm(`Deseja converter a missão "${contrato.titulo}" em uma Campanha Permanente?\n\nO herói passará a constar na sua lista de "Meus Personagens"!`)) {
      return;
    }

    try {
      // 1. Atualizar tipo da campanha para 'campanha_padrao'
      await updateDoc(doc(db, "Campanhas", contrato.id), {
        tipo: 'campanha_padrao',
        status: 'Campanha Convertida',
      });

      // 2. Tornar o personagem visível em "Meus Personagens"
      if (contrato.pcVinculado) {
        await updateDoc(doc(db, "Personagens", contrato.pcVinculado), {
          isJogador: true,
          isMonstroSemana: false,
        });
      }

      if ((window as any).adicionarLog) {
        (window as any).adicionarLog(`Contrato "${contrato.titulo}" convertido com sucesso em Campanha Permanente!`, 'sucesso');
      }

      await carregarContratos();
    } catch (err: any) {
      alert("Erro ao converter contrato: " + err.message);
    }
  };

  const excluirContrato = async (contrato: ContratoMonstro) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato "${contrato.titulo}"?`)) return;

    try {
      await deleteDoc(doc(db, "Campanhas", contrato.id));
      if (contrato.pcVinculado) {
        await deleteDoc(doc(db, "Personagens", contrato.pcVinculado));
      }
      await carregarContratos();
    } catch (err: any) {
      alert("Erro ao excluir contrato: " + err.message);
    }
  };

  return (
    <section id="secao-monstro-semana" className="hidden flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 sm:p-6">
      <div className="flex flex-col gap-6 w-full max-w-4xl p-6 sm:p-8 bg-slate-900/60 border border-violet-800/40 rounded-xl shadow-2xl backdrop-blur-md">
        
        {/* Cabeçalho */}
        <div className="text-center mb-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/80 border border-violet-600 text-violet-300 text-xs font-bold uppercase tracking-widest mb-2 shadow">
            ⚔️ Módulo One-Shot Auto-Contido
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 tracking-widest uppercase mb-1">
            Monstro da Semana
          </h1>
          <p className="text-xs font-light text-slate-400 tracking-wider">
            Crie heróis temporários e jogue caçadas épicas sem poluir sua lista de personagens principais!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Formulário de Nova Missão */}
          <form onSubmit={gerarMissaoEJogar} className="bg-black/60 p-5 rounded-xl border border-violet-900/50 shadow-xl flex flex-col gap-4">
            <h3 className="text-violet-300 font-bold uppercase text-xs tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
              ✨ Configurar Nova Caçada
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sistema de Jogo</label>
                <select
                  value={sistema}
                  onChange={(e) => setSistema(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
                >
                  <option value="Tormenta20 (Nativo)">Tormenta20 (Nativo)</option>
                  <option value="D&D 5e">D&amp;D 5ª Edição</option>
                  <option value="Custom RPG">Custom / Outro Sistema</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cenário Base</label>
                <select
                  value={cenario}
                  onChange={(e) => setCenario(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
                >
                  <option value="Arton (Nativo)">Arton (Tormenta20)</option>
                  <option value="Toril / Forgotten Realms">Forgotten Realms (D&amp;D)</option>
                  <option value="O Herdeiro de Hogwarts">O Herdeiro de Hogwarts</option>
                  <option value="Mundo Próprio">Mundo Próprio Customizado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome do Jogador (Você)</label>
                <input
                  type="text"
                  value={nomeJogador}
                  onChange={(e) => setNomeJogador(e.target.value)}
                  placeholder="Ex: 'Lucas', 'Gabriel'..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome do Herói Exclusivo</label>
                <input
                  type="text"
                  value={nomeHeroi}
                  onChange={(e) => setNomeHeroi(e.target.value)}
                  placeholder="Ex: 'Kaelen, o Caçador de Bruxas'..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Raça</label>
                  <select
                    value={racaHeroi}
                    onChange={(e) => setRacaHeroi(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
                  >
                    <option value="Humano">Humano</option>
                    <option value="Elfo">Elfo</option>
                    <option value="Anão">Anão</option>
                    <option value="Qareen">Qareen</option>
                    <option value="Lefou">Lefou</option>
                    <option value="Dahllan">Dahllan</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Classe</label>
                  <select
                    value={classeHeroi}
                    onChange={(e) => setClasseHeroi(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
                  >
                    <option value="Guerreiro">Guerreiro</option>
                    <option value="Arcanista">Arcanista</option>
                    <option value="Clérigo">Clérigo</option>
                    <option value="Ladino">Ladino</option>
                    <option value="Caçador">Caçador</option>
                    <option value="Bárbaro">Bárbaro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nível</label>
                  <select
                    value={nivelHeroi}
                    onChange={(e) => setNivelHeroi(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
                  >
                    <option value="1">Lvl 1</option>
                    <option value="3">Lvl 3</option>
                    <option value="5">Lvl 5</option>
                    <option value="9">Lvl 9</option>
                    <option value="12">Lvl 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Temática do Contrato</label>
                <select
                  value={tematica}
                  onChange={(e) => setTematica(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500 font-bold"
                >
                  <option value="Caça a Monstro">Caça a Monstro (Ameaça Bestial)</option>
                  <option value="Investigação Obscura">Investigação Obscura</option>
                  <option value="Escolta Perigosa">Escolta Perigosa</option>
                  <option value="Limpeza de Masmorra">Limpeza de Masmorra</option>
                  <option value="Resgate de Reféns">Resgate de Reféns</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 mt-1 bg-gradient-to-r from-violet-800 to-purple-800 hover:from-violet-700 hover:to-purple-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {carregando ? '⚔️ Gerando Missão...' : '⚔️ Gerar Missão e Jogar ➔'}
            </button>
          </form>

          {/* Arquivos de Contrato Salvos */}
          <div className="bg-black/60 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-3">
            <h3 className="text-cyan-300 font-bold uppercase text-xs tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
              📁 Contratos de Monstro da Semana Ativos
            </h3>

            {contratos.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs italic border border-dashed border-slate-800 rounded-lg">
                Nenhum contrato ativo. Crie uma caçada ao lado para jogar instantaneamente!
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[380px] flex flex-col gap-3 pr-1">
                {contratos.map((contrato) => (
                  <div
                    key={contrato.id}
                    className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 flex flex-col gap-2 hover:border-violet-500/80 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-violet-300 font-bold text-xs group-hover:text-violet-200 transition-colors">
                        {contrato.titulo}
                      </span>
                      <span className="text-[9px] bg-black px-2 py-0.5 rounded border border-slate-700 text-slate-400 font-mono">
                        {contrato.personagemNome || 'Herói'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Sistema: {contrato.sistema || 'Tormenta20'}</span>
                      <span className="text-emerald-400">{contrato.status || 'Ativo'}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <button
                        onClick={() => jogarContrato(contrato.id)}
                        className="py-1.5 bg-violet-900/70 hover:bg-violet-700 text-violet-100 text-[10px] font-bold rounded border border-violet-700 transition-colors uppercase tracking-wide flex items-center justify-center gap-1"
                      >
                        ⚔️ Jogar
                      </button>
                      <button
                        onClick={() => converterParaCampanha(contrato)}
                        className="py-1.5 bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 text-[10px] font-bold rounded border border-emerald-700 transition-colors uppercase tracking-wide flex items-center justify-center gap-1"
                        title="Tornar campanha permanente e mover herói para 'Meus Personagens'"
                      >
                        🔄 Converter
                      </button>
                      <button
                        onClick={() => excluirContrato(contrato)}
                        className="py-1.5 bg-red-950/80 hover:bg-red-800 text-red-200 text-[10px] font-bold rounded border border-red-800 transition-colors uppercase tracking-wide flex items-center justify-center gap-1"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Botão de Voltar */}
        <div className="w-full mt-1">
          <button
            onClick={() => {
              const todasSecoes = document.querySelectorAll('main > section');
              todasSecoes.forEach((sec) => sec.classList.add('hidden'));
              document.getElementById('secao-inicio')?.classList.remove('hidden');
            }}
            className="w-full py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-lg border border-slate-800 transition-colors uppercase tracking-wider text-xs"
          >
            ← Voltar ao Menu Inicial
          </button>
        </div>

      </div>
    </section>
  );
}
