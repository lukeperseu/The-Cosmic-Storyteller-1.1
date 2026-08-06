'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getStoredUserProfile, getPatenteColorClass, UserProfileData, PatenteType } from '@/lib/patentes';
import { processarRolagensComandos } from '@/lib/diceUtils';
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MensagemCampanhaGlobal {
  id: string;
  autorNome: string;
  autorFoto?: string;
  patente: PatenteType;
  tipo: 'fala' | 'off' | 'sussurro' | 'pensamento' | 'acao';
  texto: string;
  midiaUrl?: string;
  midiaTipo?: 'image' | 'audio' | 'video' | 'sticker';
  dataHora: string;
  personagemTabId?: string;
}

interface SalaPlayerOnline {
  id: string;
  personagemNome: string;
  playerNome: string;
  playerFoto?: string;
  classeRaca?: string;
  isMeuPersonagem?: boolean;
}

interface CampanhaGlobal {
  id: string;
  titulo: string;
  sistema: string;
  universo: string;
  descricao: string;
  capaUrl: string;
  criador: string;
  criadorEmail?: string;
  criadorUid?: string;
  aoVivo: boolean;
  dataCriacao: string;
  salas: SalaPlayerOnline[];
}

const CAMPANHAS_GLOBAIS_PADRAO: CampanhaGlobal[] = [
  {
    id: 'camp-taverna',
    titulo: '🐉 A Taverna da Estela Central',
    sistema: 'Tormenta20 / D&D 5e',
    universo: 'Fantasia Medieval Clássica & Multiverso',
    descricao: 'Ponto de encontro lendário de aventureiros de todos os reinos. Roleplay livre, contratação de mercenários, duelos na arena e missões de guilda.',
    capaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    criador: 'Mestre Estelar (IA)',
    criadorEmail: 'mestre.estelar@cosmic.app',
    aoVivo: true,
    dataCriacao: '2026-08-01',
    salas: [
      { id: 'sala-valeros', personagemNome: 'Valeros, o Bravo', playerNome: 'Kaelen_Player', playerFoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=Valeros', classeRaca: 'Guerreiro Humano (Nível 5)' },
      { id: 'sala-lysandra', personagemNome: 'Lysandra Arcana', playerNome: 'Elena_RPG', playerFoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lysandra', classeRaca: 'Maga Elfa (Nível 6)' },
      { id: 'sala-thorin', personagemNome: 'Thorin Escudo de Pedra', playerNome: 'Gimli_Fan', playerFoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=Thorin', classeRaca: 'Clérigo Anão (Nível 4)' },
    ],
  },
  {
    id: 'camp-sombras',
    titulo: '⚔️ Guerra das Sombras Paranormais',
    sistema: 'Ordem Paranormal / Vampiro',
    universo: 'Investigação Sombria & Horror Urbano',
    descricao: 'Investigações macabras e combate a seitas ocultistas nas sombras da grande metrópole. Rituais de sangue, investigações de campo e perigo constante.',
    capaUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    criador: 'Owner (Guardião)',
    criadorEmail: 'lukeperseu@gmail.com',
    aoVivo: true,
    dataCriacao: '2026-08-02',
    salas: [
      { id: 'sala-victor', personagemNome: 'Agente Victor', playerNome: 'Lucas_Detetive', playerFoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=Victor', classeRaca: 'Ocultista (Nível 3)' },
      { id: 'sala-kaelen', personagemNome: 'Kaelen Bloodborn', playerNome: 'Night_Walker', playerFoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=Kaelen', classeRaca: 'Vampiro Ventrue' },
    ],
  },
  {
    id: 'camp-astral',
    titulo: '🌌 Fronteira Astral & Ruínas Cósmiacas',
    sistema: 'Sci-Fi / 3D&T / Cyberpunk',
    universo: 'Ficção Científica & Espaço Profundo',
    descricao: 'Viagens interplanetárias, exploração de naves abandonadas, caça a recompensas alienígenas e cibernética avançada na borda do cosmos.',
    capaUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    criador: 'Nave Mãe Cosmos',
    criadorEmail: 'nave.mae@cosmic.app',
    aoVivo: false,
    dataCriacao: '2026-08-03',
    salas: [
      { id: 'sala-vance', personagemNome: 'Capitão Vance', playerNome: 'Star_Pilot', playerFoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=Vance', classeRaca: 'Piloto Ciborgue' },
    ],
  },
];

function generateUniqueId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function SecaoCampanhasGlobais() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData>(() => ({
    nomeJogador: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aventureiro'),
    fotoPerfilUrl: user?.photoURL || '',
    patente: 'Jogador',
    chatStorageType: 'local',
    enterEnviaTexto: true,
  }));

  // Navegação Intermediária: 'menu' | 'criar' | 'jogar'
  const [visao, setVisao] = useState<'menu' | 'criar' | 'jogar'>('menu');

  // Modal de confirmação de exclusão
  const [campanhaExcluirModal, setCampanhaExcluirModal] = useState<CampanhaGlobal | null>(null);
  const [feedbackNotif, setFeedbackNotif] = useState<string | null>(null);

  // Armazenamento de IDs excluídos localmente
  const [campanhasExcluidasLocal, setCampanhasExcluidasLocal] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cosmic_campanhas_globais_excluidas');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Campanhas Globais Salvas
  const [campanhasGlobais, setCampanhasGlobais] = useState<CampanhaGlobal[]>(CAMPANHAS_GLOBAIS_PADRAO);
  const [campanhaAtiva, setCampanhaAtiva] = useState<CampanhaGlobal>(CAMPANHAS_GLOBAIS_PADRAO[0]);

  // Aba / Sala do Personagem Ativo na Mesa
  const [salaPersonagemAtiva, setSalaPersonagemAtiva] = useState<SalaPlayerOnline>(CAMPANHAS_GLOBAIS_PADRAO[0].salas[0]);

  // Chat State
  const [mensagens, setMensagens] = useState<MensagemCampanhaGlobal[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [carregandoIA, setCarregandoIA] = useState(false);

  // Form de Criar Nova Campanha Global
  const [formTitulo, setFormTitulo] = useState('');
  const [formSistema, setFormSistema] = useState('Tormenta20 / D&D 5e');
  const [formUniverso, setFormUniverso] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCapaUrl, setFormCapaUrl] = useState('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop');

  // Personagens do Usuário para Vincular
  const [meusPersonagensList, setMeusPersonagensList] = useState<any[]>([]);
  const [personagemSelecionadoId, setPersonagemSelecionadoId] = useState<string>('');
  const [novoPcNome, setNovoPcNome] = useState('');
  const [novoPcClasse, setNovoPcClasse] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Estados do Painel de Controle e Ficha do Personagem nas Campanhas Globais
  const [drawerFichaAberto, setDrawerFichaAberto] = useState(false);
  const [painelDireitaAberto, setPainelDireitaAberto] = useState(true);
  const [abaPainel, setAbaPainel] = useState<'inventario' | 'habilidades' | 'acoes'>('inventario');
  const [filtroHabilidades, setFiltroHabilidades] = useState('');

  // Resolvendo o Personagem Ativo para a Mesa Global
  const personagemAtivo = React.useMemo(() => {
    if (!salaPersonagemAtiva) return meusPersonagensList[0] || null;
    return (
      meusPersonagensList.find(
        (p) =>
          p.id === salaPersonagemAtiva.id ||
          (p.nome && salaPersonagemAtiva.personagemNome && p.nome.toLowerCase() === salaPersonagemAtiva.personagemNome.toLowerCase())
      ) ||
      meusPersonagensList[0] || {
        id: 'pc-padrao-1',
        nome: salaPersonagemAtiva.personagemNome || profile.nomeJogador || 'Aventureiro',
        frstclasse: 'Guerreiro',
        raca: 'Humano',
        niveltotal: 1,
        pvAtual: '20',
        pvMax: '20',
        pmAtual: '10',
        pmMax: '10',
        tibares: 50,
        defesa: '15',
        inventario: [],
        equipamentos: [],
        textosDinamicos: [],
        ataques: [],
      }
    );
  }, [salaPersonagemAtiva, meusPersonagensList, profile.nomeJogador]);

  const equipadosCombinados = React.useMemo(() => {
    if (!personagemAtivo) return [];
    const equipados = Array.isArray(personagemAtivo.equipamentos) ? [...personagemAtivo.equipamentos] : [];
    const invEquipados = Array.isArray(personagemAtivo.inventario)
      ? personagemAtivo.inventario.filter((i: any) => i && i.equipado)
      : [];
    const map = new Map<string, any>();
    [...equipados, ...invEquipados].forEach((item, idx) => {
      const key = (item.nome || item.itemNome || item.id || `eq-${idx}`).toLowerCase();
      if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values());
  }, [personagemAtivo]);

  const inventarioLista: any[] = Array.isArray(personagemAtivo?.inventario) ? personagemAtivo.inventario : [];
  const habilidadesLista: any[] = Array.isArray(personagemAtivo?.textosDinamicos) ? personagemAtivo.textosDinamicos : [];
  const ataquesLista: any[] = Array.isArray(personagemAtivo?.ataques) ? personagemAtivo.ataques : [];

  const getPvAtual = () => {
    if (!personagemAtivo) return '10';
    return personagemAtivo.pvAtual ?? personagemAtivo.hpAtual ?? '10';
  };

  const getPvMax = () => {
    if (!personagemAtivo) return '10';
    return personagemAtivo.pvMax ?? personagemAtivo.hpMax ?? '10';
  };

  const getPmAtual = () => {
    if (!personagemAtivo) return '5';
    return personagemAtivo.pmAtual ?? '5';
  };

  const getPmMax = () => {
    if (!personagemAtivo) return '5';
    return personagemAtivo.pmMax ?? '5';
  };

  const formatDefesa = () => {
    if (!personagemAtivo) return '10';
    const def = personagemAtivo.defesaTotal ?? personagemAtivo.defesa;
    if (def == null) return '10';
    if (typeof def === 'object') return String(def.total ?? def.arm ?? '10');
    return String(def);
  };

  const extrairBonusItem = (item: any): number => {
    if (!item) return 0;
    if (typeof item.defesaBonus === 'number') return item.defesaBonus;
    if (typeof item.bonusDefesa === 'number') return item.bonusDefesa;
    const texto = `${item.nome || ''} ${item.itemNome || ''} ${item.desc || ''} ${item.descricao || ''}`.toLowerCase();
    const match = texto.match(/\+(\d+)\s*(def|defesa|armadura)/i);
    if (match && match[1]) return parseInt(match[1], 10);
    return 0;
  };

  const isItemConsumavel = (item: any): boolean => {
    if (!item) return false;
    const nomeStr = `${item.nome || item.itemNome || ''} ${item.desc || item.descricao || ''} ${item.tipo || ''} ${item.categoria || ''}`.toLowerCase();
    const palavrasChave = [
      'poção', 'pocao', 'cura', 'bálsamo', 'balsamo', 'pergaminho', 'elixir', 
      'comida', 'ração', 'racao', 'consumivel', 'consumível', 'veneno', 'frasco', 
      'ingrediente', 'antídoto', 'antidoto', 'poção de'
    ];
    return palavrasChave.some((p) => nomeStr.includes(p));
  };

  const toggleEquiparItem = async (item: any, paraEquipar: boolean) => {
    if (!personagemAtivo) return;
    const itemNome = item.nome || item.itemNome;
    if (!itemNome) return;

    const clone = { ...personagemAtivo };
    let inv = Array.isArray(clone.inventario) ? [...clone.inventario] : [];
    let eq = Array.isArray(clone.equipamentos) ? [...clone.equipamentos] : [];

    inv = inv.map((i: any) => {
      if ((i.nome || i.itemNome || '').toLowerCase() === itemNome.toLowerCase()) {
        return { ...i, equipado: paraEquipar };
      }
      return i;
    });

    if (paraEquipar) {
      const jaExisteEq = eq.some((e: any) => (e.nome || e.itemNome || '').toLowerCase() === itemNome.toLowerCase());
      if (!jaExisteEq) {
        eq.push({ ...item, equipado: true });
      }
    } else {
      eq = eq.filter((e: any) => (e.nome || e.itemNome || '').toLowerCase() !== itemNome.toLowerCase());
    }

    clone.inventario = inv;
    clone.equipamentos = eq;

    setMeusPersonagensList((prev) => {
      const existe = prev.some((p) => p.id === clone.id);
      if (existe) {
        return prev.map((p) => (p.id === clone.id ? clone : p));
      }
      return [...prev, clone];
    });

    try {
      const pcLocal = localStorage.getItem('cosmic_meus_personagens');
      if (pcLocal) {
        const parsed = JSON.parse(pcLocal);
        if (Array.isArray(parsed)) {
          const at = parsed.map((p: any) => (p.id === clone.id ? clone : p));
          localStorage.setItem('cosmic_meus_personagens', JSON.stringify(at));
        }
      }
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }

    if (clone.id && !clone.id.startsWith('pc-padrao')) {
      try {
        const pRef = doc(db, "Personagens", clone.id);
        await updateDoc(pRef, {
          inventario: clone.inventario,
          equipamentos: clone.equipamentos,
          data_atualizacao: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Erro ao atualizar item equipado no Firestore:", e);
      }
    }
  };

  const alterarRecurso = async (campo: 'pvAtual' | 'pmAtual' | 'tibares', delta: number) => {
    if (!personagemAtivo) return;
    const clone = { ...personagemAtivo };

    let maxVal = 999;
    if (campo === 'pvAtual') maxVal = parseInt(getPvMax()) || 999;
    if (campo === 'pmAtual') maxVal = parseInt(getPmMax()) || 999;

    const atual = parseInt(clone[campo] || (campo === 'pvAtual' ? getPvAtual() : campo === 'pmAtual' ? getPmAtual() : '0')) || 0;
    const novo = Math.min(maxVal, Math.max(0, atual + delta)).toString();

    clone[campo] = campo === 'tibares' ? parseInt(novo) || 0 : novo;

    setMeusPersonagensList((prev) => {
      const existe = prev.some((p) => p.id === clone.id);
      if (existe) {
        return prev.map((p) => (p.id === clone.id ? clone : p));
      }
      return [...prev, clone];
    });

    try {
      const pcLocal = localStorage.getItem('cosmic_meus_personagens');
      if (pcLocal) {
        const parsed = JSON.parse(pcLocal);
        if (Array.isArray(parsed)) {
          const at = parsed.map((p: any) => (p.id === clone.id ? clone : p));
          localStorage.setItem('cosmic_meus_personagens', JSON.stringify(at));
        }
      }
    } catch (e) {}

    if (clone.id && !clone.id.startsWith('pc-padrao')) {
      try {
        const pRef = doc(db, "Personagens", clone.id);
        await updateDoc(pRef, {
          [campo]: clone[campo],
          data_atualizacao: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Erro ao salvar recurso no Firestore:", e);
      }
    }
  };

  const rolarDadoEEnviar = (lados: number) => {
    // eslint-disable-next-line react-hooks/purity
    const resultado = Math.floor(Math.random() * lados) + 1;
    setInputTexto((prev) => (prev ? `${prev} [d${lados}: ${resultado}]` : `Rolagem de d${lados}: **${resultado}**`));
  };

  // Carregar Perfil do Usuário
  useEffect(() => {
    queueMicrotask(() => {
      const p = getStoredUserProfile(user?.email, user?.displayName, user?.photoURL);
      setProfile(p);
    });
  }, [user]);

  // Ouvir Campanhas Globais do Firestore em tempo real
  useEffect(() => {
    const q = query(collection(db, "CampanhasGlobais"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listFirestore: CampanhaGlobal[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        listFirestore.push({
          id: docSnap.id,
          titulo: d.titulo || 'Campanha Sem Título',
          sistema: d.sistema || 'Livre',
          universo: d.universo || 'Multiverso',
          descricao: d.descricao || '',
          capaUrl: d.capaUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
          criador: d.criador || 'Mestre',
          criadorEmail: d.criadorEmail || '',
          criadorUid: d.criadorUid || '',
          aoVivo: d.aoVivo !== undefined ? d.aoVivo : true,
          dataCriacao: d.dataCriacao || new Date().toISOString().split('T')[0],
          salas: Array.isArray(d.salas) ? d.salas : [],
        });
      });

      const idsFs = new Set(listFirestore.map((c) => c.id));
      const mescladas = [
        ...listFirestore,
        ...CAMPANHAS_GLOBAIS_PADRAO.filter((p) => !idsFs.has(p.id) && !campanhasExcluidasLocal.includes(p.id)),
      ];
      setCampanhasGlobais(mescladas);

      // Atualizar campanha ativa se estiver selecionada
      if (campanhaAtiva) {
        const atual = mescladas.find((c) => c.id === campanhaAtiva.id);
        if (atual) setCampanhaAtiva(atual);
      }
    }, (err) => {
      console.error("Erro ao escutar CampanhasGlobais no Firestore:", err);
    });

    return () => unsubscribe();
  }, [campanhaAtiva?.id, campanhasExcluidasLocal]);

  // Carregar Personagens do Usuário (Firestore + Local)
  useEffect(() => {
    const carregarPersonagens = async () => {
      try {
        const uid = user?.uid;
        let pcs: any[] = [];
        if (uid) {
          const q = query(collection(db, "Personagens"), where("userId", "==", uid));
          const snap = await getDocs(q);
          snap.forEach((d) => pcs.push({ id: d.id, ...d.data() }));
        }

        const pcLocal = localStorage.getItem('cosmic_meus_personagens');
        if (pcLocal) {
          try {
            const parsed = JSON.parse(pcLocal);
            if (Array.isArray(parsed)) {
              pcs = [...pcs, ...parsed];
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (pcs.length === 0) {
          pcs = [
            {
              id: 'pc-padrao-1',
              nome: profile.nomeJogador || 'Aventureiro Estelar',
              frstclasse: 'Guerreiro',
              raca: 'Humano',
              niveltotal: 1,
            },
          ];
        }

        setMeusPersonagensList(pcs);
        setPersonagemSelecionadoId(pcs[0]?.id || '');
      } catch (err) {
        console.error("Erro ao carregar personagens:", err);
      }
    };

    if (visao === 'criar' || visao === 'jogar') {
      carregarPersonagens();
    }
  }, [visao, user, profile.nomeJogador]);

  // Carregar Mensagens da Campanha em Tempo Real no Firestore
  useEffect(() => {
    if (visao !== 'jogar' || !campanhaAtiva || !salaPersonagemAtiva) return;

    const q = query(
      collection(db, "CampanhasGlobaisMsgs"),
      where("campanhaId", "==", campanhaAtiva.id),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgsFirestore: MensagemCampanhaGlobal[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgsFirestore.push({
          id: docSnap.id,
          autorNome: data.autorNome || 'Aventureiro',
          autorFoto: data.autorFoto || '',
          patente: data.patente || 'Jogador',
          tipo: data.tipo || 'acao',
          texto: data.texto || '',
          midiaUrl: data.midiaUrl,
          midiaTipo: data.midiaTipo,
          dataHora: data.dataHora || '--:--',
          personagemTabId: data.personagemTabId,
        });
      });

      if (msgsFirestore.length > 0) {
        setMensagens(msgsFirestore);
      } else {
        const msgsIniciais: MensagemCampanhaGlobal[] = [
          {
            id: `init-cg-1`,
            autorNome: '🔮 Íris (Mestre Narratora)',
            autorFoto: 'https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg',
            patente: 'ADM',
            tipo: 'acao',
            texto: `✨ Aventura ativada na mesa **"${campanhaAtiva.titulo}"**! A cena foca no herói **${salaPersonagemAtiva.personagemNome}** (${salaPersonagemAtiva.classeRaca || 'Aventureiro'}). O que você pretende fazer?`,
            dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            personagemTabId: salaPersonagemAtiva.id,
          },
          {
            id: `init-cg-2`,
            autorNome: '⚙️ Aurora (IA Mediadora)',
            autorFoto: 'https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg',
            patente: 'ADM',
            tipo: 'off',
            texto: `{"// Dica: Cada jogador tem sua própria aba de personagem ativo nesta campanha global. Se você visitar a aba de outro jogador, suas mensagens serão automaticamente enviadas em OFF (//)!"}`,
            dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            personagemTabId: salaPersonagemAtiva.id,
          },
        ];
        setMensagens(msgsIniciais);
      }
    }, (err) => {
      console.error("Erro no listener realtime de mensagens da campanha:", err);
    });

    return () => unsubscribe();
  }, [visao, campanhaAtiva?.id, salaPersonagemAtiva?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregandoIA]);

  const salvarEMandarMensagemCampanha = async (novaMsg: MensagemCampanhaGlobal) => {
    setMensagens((prev) => [...prev, novaMsg]);
    if (!campanhaAtiva) return;
    try {
      await addDoc(collection(db, "CampanhasGlobaisMsgs"), {
        ...novaMsg,
        campanhaId: campanhaAtiva.id,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro ao enviar mensagem de campanha para o Firestore:", err);
    }
  };

  const inferirTipoMensagem = (texto: string): 'fala' | 'off' | 'sussurro' | 'pensamento' | 'acao' => {
    const t = texto.trim();
    if (t.startsWith('//') || t.startsWith('/')) return 'off';
    if (t.startsWith('-')) return 'fala';
    if (t.startsWith('~')) return 'sussurro';
    if (t.startsWith('(') && t.endsWith(')')) return 'pensamento';
    return 'acao';
  };

  // Entrar na Mesa de uma Campanha Global
  const handleEntrarMesa = async (campanha: CampanhaGlobal) => {
    setCampanhaAtiva(campanha);

    let minhaSala = campanha.salas.find((s) => s.isMeuPersonagem || s.playerNome === profile.nomeJogador);
    let salasAtualizadas = [...campanha.salas];

    if (!minhaSala) {
      minhaSala = {
        id: generateUniqueId('sala-minha'),
        personagemNome: profile.nomeJogador || 'Meu Herói',
        playerNome: profile.nomeJogador || 'Aventureiro',
        playerFoto: profile.fotoPerfilUrl || user?.photoURL || '',
        classeRaca: 'Aventureiro Principal',
        isMeuPersonagem: true,
      };
      salasAtualizadas.push(minhaSala);

      try {
        await updateDoc(doc(db, "CampanhasGlobais", campanha.id), {
          salas: salasAtualizadas,
        });
      } catch (e) {
        try {
          await setDoc(doc(db, "CampanhasGlobais", campanha.id), {
            ...campanha,
            salas: salasAtualizadas,
          });
        } catch (err) {
          console.error("Erro ao atualizar salas no Firestore:", err);
        }
      }
    } else {
      const fotoAtual = profile.fotoPerfilUrl || user?.photoURL || '';
      if (fotoAtual && minhaSala.playerFoto !== fotoAtual) {
        minhaSala.playerFoto = fotoAtual;
        try {
          await updateDoc(doc(db, "CampanhasGlobais", campanha.id), {
            salas: salasAtualizadas,
          });
        } catch (e) {}
      }
    }

    setCampanhaAtiva({ ...campanha, salas: salasAtualizadas });
    setSalaPersonagemAtiva(minhaSala);
    setVisao('jogar');
  };

  // Adicionar Nova Aba de Personagem na Campanha Global
  const handleAdicionarAbaPersonagem = async () => {
    const pcEncontrado = meusPersonagensList.find((p) => p.id === personagemSelecionadoId);
    const pcNome = pcEncontrado?.nome || novoPcNome || 'Novo Herói';
    const pcClasse = pcEncontrado ? `${pcEncontrado.raca || ''} ${pcEncontrado.frstclasse || ''}` : (novoPcClasse || 'Aventureiro');

    const novaSala: SalaPlayerOnline = {
      id: generateUniqueId('sala-pc'),
      personagemNome: pcNome,
      playerNome: profile.nomeJogador || 'Aventureiro',
      playerFoto: profile.fotoPerfilUrl || user?.photoURL || '',
      classeRaca: pcClasse,
      isMeuPersonagem: true,
    };

    const salasAtualizadas = [...campanhaAtiva.salas, novaSala];
    const campAtualizada = { ...campanhaAtiva, salas: salasAtualizadas };

    setCampanhaAtiva(campAtualizada);
    setSalaPersonagemAtiva(novaSala);

    try {
      await updateDoc(doc(db, "CampanhasGlobais", campanhaAtiva.id), {
        salas: salasAtualizadas,
      });
    } catch (err) {
      try {
        await setDoc(doc(db, "CampanhasGlobais", campanhaAtiva.id), campAtualizada);
      } catch (e) {
        console.error("Erro ao adicionar aba de personagem:", e);
      }
    }
  };

  // Criar Nova Campanha Global
  const handleCriarCampanhaGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) return;

    const pcEncontrado = meusPersonagensList.find((p) => p.id === personagemSelecionadoId);
    const pcNome = pcEncontrado?.nome || novoPcNome || 'Herói Fundador';
    const pcClasse = pcEncontrado ? `${pcEncontrado.raca || ''} ${pcEncontrado.frstclasse || ''}` : (novoPcClasse || 'Aventureiro');

    const novaCamp: CampanhaGlobal = {
      id: generateUniqueId('cg-custom'),
      titulo: formTitulo.trim(),
      sistema: formSistema,
      universo: formUniverso.trim() || 'Multiverso Livre',
      descricao: formDescricao.trim() || 'Nova campanha global aberta a todos os aventureiros.',
      capaUrl: formCapaUrl.trim() || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      criador: profile.nomeJogador || 'Mestre da Rede',
      criadorEmail: user?.email || '',
      criadorUid: user?.uid || '',
      aoVivo: true,
      dataCriacao: new Date().toISOString().split('T')[0],
      salas: [
        {
          id: generateUniqueId('sala-fundador'),
          personagemNome: pcNome,
          playerNome: profile.nomeJogador || 'Aventureiro',
          playerFoto: profile.fotoPerfilUrl || user?.photoURL || '',
          classeRaca: pcClasse,
          isMeuPersonagem: true,
        },
      ],
    };

    try {
      await setDoc(doc(db, "CampanhasGlobais", novaCamp.id), novaCamp);
    } catch (err) {
      console.error("Erro ao salvar campanha global no Firestore:", err);
    }

    setCampanhaAtiva(novaCamp);
    setSalaPersonagemAtiva(novaCamp.salas[0]);
    setVisao('jogar');

    setFormTitulo('');
    setFormUniverso('');
    setFormDescricao('');
  };

  // Checagem de patentes e autoridade para exclusão
  const isOwner = user?.email?.toLowerCase() === 'lukeperseu@gmail.com' || profile.patente === 'Owner' || (profile.patente as string) === 'Zane';
  const isADM = isOwner || profile.patente === 'ADM';

  // Função para verificar se o usuário atual pode excluir a campanha global
  const podeExcluirCampanha = (camp: CampanhaGlobal): boolean => {
    if (!camp) return false;

    // Patentes Owner e ADM possuem autoridade para excluir QUALQUER campanha global
    if (isADM) return true;

    // Usuários normais podem excluir APENAS as próprias campanhas globais
    if (user?.uid && camp.criadorUid && camp.criadorUid === user.uid) return true;
    if (user?.email && camp.criadorEmail && camp.criadorEmail.toLowerCase() === user.email.toLowerCase()) return true;
    if (camp.criador && profile.nomeJogador && camp.criador.trim().toLowerCase() === profile.nomeJogador.trim().toLowerCase()) return true;

    return false;
  };

  // Função de Exclusão de Campanha Global
  const handleExcluirCampanhaGlobal = async (camp: CampanhaGlobal) => {
    try {
      await deleteDoc(doc(db, "CampanhasGlobais", camp.id));
    } catch (err) {
      console.warn("Removendo campanha localmente...", err);
    }

    const novasExcluidas = [...campanhasExcluidasLocal, camp.id];
    setCampanhasExcluidasLocal(novasExcluidas);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cosmic_campanhas_globais_excluidas', JSON.stringify(novasExcluidas));
    }

    setCampanhasGlobais((prev) => prev.filter((c) => c.id !== camp.id));

    if (campanhaAtiva?.id === camp.id) {
      setVisao('menu');
    }

    setFeedbackNotif(`🗑️ Campanha global "${camp.titulo}" foi excluída com sucesso.`);
    setTimeout(() => setFeedbackNotif(null), 4000);
    setCampanhaExcluirModal(null);
  };

  // Enviar Mensagem no Chat da Campanha Global
  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim() || carregandoIA) return;

    let textoProcessado = processarRolagensComandos(inputTexto.trim());
    setInputTexto('');

    const ehAbaDeOutro = !salaPersonagemAtiva.isMeuPersonagem && salaPersonagemAtiva.playerNome !== profile.nomeJogador;

    if (ehAbaDeOutro && !textoProcessado.startsWith('//') && !textoProcessado.startsWith('/')) {
      textoProcessado = `// ${textoProcessado}`;
    }

    const tipoMsg = inferirTipoMensagem(textoProcessado);

    const novaMsg: MensagemCampanhaGlobal = {
      id: `cg-${Date.now()}`,
      autorNome: ehAbaDeOutro ? `${profile.nomeJogador} (Espectador)` : salaPersonagemAtiva.personagemNome,
      autorFoto: profile.fotoPerfilUrl || user?.photoURL || '',
      patente: profile.patente,
      tipo: tipoMsg,
      texto: textoProcessado,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      personagemTabId: salaPersonagemAtiva.id,
    };

    await salvarEMandarMensagemCampanha(novaMsg);

    if (ehAbaDeOutro && tipoMsg === 'off') {
      return;
    }

    const msgLower = textoProcessado.toLowerCase();
    const ehOff = tipoMsg === 'off';
    const mencionaIris = msgLower.includes('iris') || msgLower.includes('íris') || (!ehOff && Math.random() < 0.3);
    const mencionaAurora = msgLower.includes('aurora');

    if (mencionaIris || mencionaAurora) {
      setCarregandoIA(true);
      try {
        const res = await fetch('/api/chatbot-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem: `[Mesa Global: ${campanhaAtiva.titulo} - Personagem Ativo da Aba: ${salaPersonagemAtiva.personagemNome}] ${textoProcessado}`,
            autorNome: salaPersonagemAtiva.personagemNome,
            mencionaIris,
            mencionaAurora,
            ehOffGame: ehOff,
            origem: 'campanha_global',
            historico: mensagens.slice(-6).map((m) => ({
              autor: m.autorNome,
              texto: m.texto,
            })),
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          const resps = data.respostas || [];
          for (let idx = 0; idx < resps.length; idx++) {
            const r = resps[idx];
            const msgIA: MensagemCampanhaGlobal = {
              id: `cg-ia-${Date.now()}-${idx}`,
              autorNome: r.autor === 'Íris' ? '🔮 Íris (Mestre Narratora)' : '⚙️ Aurora (IA Mediadora)',
              autorFoto: r.autor === 'Íris'
                ? 'https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg'
                : 'https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg',
              patente: 'ADM',
              tipo: r.autor === 'Íris' ? 'acao' : 'off',
              texto: r.texto,
              dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              personagemTabId: salaPersonagemAtiva.id,
            };
            await salvarEMandarMensagemCampanha(msgIA);
          }
        }
      } catch (err) {
        console.error('Erro na resposta da IA:', err);
      } finally {
        setCarregandoIA(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (profile.enterEnviaTexto !== false) {
        if (!e.shiftKey) {
          e.preventDefault();
          handleEnviar();
        }
      }
    }
  };

  const inserirPrefixo = (prefixo: string) => {
    setInputTexto((prev) => `${prefixo} ${prev}`);
  };

  return (
    <section id="secao-campanhas-globais" className="hidden min-h-[calc(100vh-4rem)] p-3 sm:p-6 max-w-7xl mx-auto">
      
      {/* NOTIFICAÇÃO DE FEEDBACK */}
      {feedbackNotif && (
        <div className="mb-4 p-3 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-bold rounded-xl shadow-lg flex items-center justify-between animate-fadeIn">
          <span>{feedbackNotif}</span>
          <button onClick={() => setFeedbackNotif(null)} className="text-slate-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* NAVEGAÇÃO DE TOPO */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-emerald-500/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900/80 border border-emerald-500 flex items-center justify-center text-xl shadow-md">
            🌐
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              Campanhas Globais
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                ● Rede Multi-Sessão Ativa
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Crie mesas abertas, dispute reinos e navegue pelas abas dos personagens online!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {visao !== 'menu' && (
            <button
              onClick={() => setVisao('menu')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2 shadow"
            >
              ⬅️ Menu de Campanhas
            </button>
          )}

          {visao === 'menu' && (
            <button
              onClick={() => setVisao('criar')}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-emerald-400/60 shadow-lg transition-all flex items-center gap-2"
            >
              ➕ Criar Nova Campanha Global
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VISÃO 1: MENU INTERMEDIÁRIO DE CAMPANHAS GLOBAIS             */}
      {/* ------------------------------------------------------------- */}
      {visao === 'menu' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* SEÇÃO 1: CAMPANHAS BEING PLAYED NOW (AO VIVO / ONLINE) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                🟢 Campanhas Sendo Jogadas Naquele Momento (Ao Vivo)
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {campanhasGlobais.filter((c) => c.aoVivo).length} Mesas em Andamento
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campanhasGlobais.filter((c) => c.aoVivo).map((camp) => (
                <div
                  key={camp.id}
                  className="bg-slate-900/90 border border-emerald-500/50 hover:border-emerald-400 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950 flex flex-col group"
                >
                  <div className="h-40 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={camp.capaUrl}
                      alt={camp.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="bg-red-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5 animate-pulse">
                        ● AO VIVO
                      </span>
                      <span className="bg-black/80 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-700/80">
                        {camp.sistema}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-bold text-white tracking-wide drop-shadow">
                        {camp.titulo}
                      </h3>
                      <p className="text-[11px] text-slate-300 italic truncate">
                        {camp.universo}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-slate-950/80">
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {camp.descricao}
                    </p>

                    {/* Personagens Ativos / Online na Mesa */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        🎭 Personagens Ativos nesta Mesa ({camp.salas.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {camp.salas.map((sala) => (
                          <div
                            key={sala.id}
                            className="flex items-center gap-1.5 px-2 py-1 bg-black/60 rounded-lg border border-emerald-900/60 text-[11px] text-emerald-200 font-mono"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>{sala.personagemNome}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Criado por: {camp.criador}
                      </span>
                      <div className="flex items-center gap-2">
                        {podeExcluirCampanha(camp) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCampanhaExcluirModal(camp);
                            }}
                            className="px-2.5 py-2 bg-red-950/80 hover:bg-red-800 text-red-300 hover:text-white rounded-xl border border-red-800/80 transition-all text-xs font-bold active:scale-95 flex items-center gap-1 shadow-sm"
                            title={isADM && (camp.criador !== profile.nomeJogador && camp.criadorEmail !== user?.email) ? "Excluir campanha por autoridade (Owner/ADM)" : "Excluir minha campanha global"}
                          >
                            <span>🗑️</span>
                            <span className="hidden sm:inline text-[10px] uppercase">Excluir</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleEntrarMesa(camp)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          Entrar na Mesa ➔
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEÇÃO 2: CAMPANHAS GLOBAIS EXISTENTES */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                📚 Todas as Campanhas Globais Existentes
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                {campanhasGlobais.length} Mundos Registrados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {campanhasGlobais.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div className="h-32 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={camp.capaUrl}
                      alt={camp.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/80 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-800">
                        {camp.sistema}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-3 right-3">
                      <h3 className="text-sm font-bold text-white truncate">
                        {camp.titulo}
                      </h3>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {camp.descricao}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                      <span>👥 {camp.salas.length} Personagens</span>
                      <div className="flex items-center gap-1.5">
                        {podeExcluirCampanha(camp) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCampanhaExcluirModal(camp);
                            }}
                            className="p-1.5 bg-red-950/80 hover:bg-red-800 text-red-300 hover:text-white rounded-lg border border-red-800/80 transition-colors text-xs font-bold"
                            title={isADM && (camp.criador !== profile.nomeJogador && camp.criadorEmail !== user?.email) ? "Excluir campanha por autoridade (Owner/ADM)" : "Excluir minha campanha global"}
                          >
                            🗑️
                          </button>
                        )}
                        <button
                          onClick={() => handleEntrarMesa(camp)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-700 hover:text-white text-emerald-300 font-bold rounded-lg border border-slate-700 transition-colors"
                        >
                          Jogar / Ingressar ➔
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VISÃO 2: CRIAR NOVA CAMPANHA GLOBAL                           */}
      {/* ------------------------------------------------------------- */}
      {visao === 'criar' && (
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl backdrop-blur-md space-y-6 animate-fadeIn">
          <div className="text-center border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 tracking-wider uppercase">
              🚀 Criar Nova Campanha Global
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Forje um novo mundo aberto na rede central do Cosmic Storyteller.
            </p>
          </div>

          <form onSubmit={handleCriarCampanhaGlobal} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Título da Campanha Global *
              </label>
              <input
                type="text"
                required
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex: As Crônicas da Estela Perdida..."
                className="w-full p-3 bg-black border border-slate-700 focus:border-emerald-500 rounded-xl text-slate-200 font-bold text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Sistema de RPG Base
                </label>
                <select
                  value={formSistema}
                  onChange={(e) => setFormSistema(e.target.value)}
                  className="w-full p-3 bg-black border border-slate-700 text-emerald-300 font-bold text-xs rounded-xl outline-none"
                >
                  <option value="Tormenta20 / D&D 5e">Tormenta20 / D&D 5e</option>
                  <option value="Ordem Paranormal / Vampiro">Ordem Paranormal / Vampiro</option>
                  <option value="Sci-Fi / 3D&T / Cyberpunk">Sci-Fi / 3D&T / Cyberpunk</option>
                  <option value="GURPS / Call of Cthulhu">GURPS / Call of Cthulhu</option>
                  <option value="Sistema Próprio / Customizado">Sistema Próprio / Customizado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Universo / Cenário
                </label>
                <input
                  type="text"
                  value={formUniverso}
                  onChange={(e) => setFormUniverso(e.target.value)}
                  placeholder="Ex: Arton, Neo-Tokyo, Galáxia Central..."
                  className="w-full p-3 bg-black border border-slate-700 focus:border-emerald-500 rounded-xl text-slate-200 text-xs outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Descrição &amp; Lore Inicial
              </label>
              <textarea
                rows={3}
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Explique o início da aventura, o grande mistério e as diretrizes do mundo..."
                className="w-full p-3 bg-black border border-slate-700 focus:border-emerald-500 rounded-xl text-slate-200 text-xs outline-none resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                URL da Imagem de Capa
              </label>
              <input
                type="url"
                value={formCapaUrl}
                onChange={(e) => setFormCapaUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full p-3 bg-black border border-slate-700 text-slate-200 text-xs rounded-xl outline-none"
              />
            </div>

            {/* SELEÇÃO DO PERSONAGEM VINCULADO DO JOGADOR */}
            <div className="p-4 bg-slate-950 border border-amber-500/50 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                👤 Vincular Seu Personagem a esta Campanha (Obrigatório)
              </span>

              {meusPersonagensList.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={personagemSelecionadoId}
                    onChange={(e) => setPersonagemSelecionadoId(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 text-amber-200 font-bold text-xs rounded-xl outline-none"
                  >
                    {meusPersonagensList.map((pc) => (
                      <option key={pc.id} value={pc.id}>
                        {pc.nome} — {pc.raca || 'Humano'} {pc.frstclasse || 'Aventureiro'} (Nível {pc.niveltotal || 1})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={novoPcNome}
                    onChange={(e) => setNovoPcNome(e.target.value)}
                    placeholder="Nome do seu Personagem..."
                    className="p-2.5 bg-black border border-slate-700 text-slate-200 text-xs rounded-xl outline-none"
                  />
                  <input
                    type="text"
                    value={novoPcClasse}
                    onChange={(e) => setNovoPcClasse(e.target.value)}
                    placeholder="Classe / Raça (Ex: Guerreiro Elfo)..."
                    className="p-2.5 bg-black border border-slate-700 text-slate-200 text-xs rounded-xl outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setVisao('menu')}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
              >
                🚀 Lançar Campanha Global
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VISÃO 3: MESA DE JOGO DA CAMPANHA GLOBAL CONECTADA            */}
      {/* ------------------------------------------------------------- */}
      {visao === 'jogar' && campanhaAtiva && (
        <div className="bg-slate-950 border border-emerald-600/50 rounded-2xl flex flex-col min-h-[750px] max-h-[85vh] h-[83vh] shadow-2xl overflow-hidden ring-1 ring-emerald-500/20 animate-fadeIn">
          
          {/* HEADER DA MESA */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-3.5 border-b border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={campanhaAtiva.capaUrl}
                alt={campanhaAtiva.titulo}
                className="w-10 h-10 rounded-xl object-cover border border-emerald-500/80 shadow"
              />
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  {campanhaAtiva.titulo}
                  <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                    ● {campanhaAtiva.sistema}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  {campanhaAtiva.universo} • Mestre: {campanhaAtiva.criador}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {podeExcluirCampanha(campanhaAtiva) && (
                <button
                  onClick={() => setCampanhaExcluirModal(campanhaAtiva)}
                  className="px-3 py-1.5 rounded-xl bg-red-950/90 hover:bg-red-800 text-red-300 border border-red-700/80 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow"
                  title={isADM && (campanhaAtiva.criador !== profile.nomeJogador && campanhaAtiva.criadorEmail !== user?.email) ? "Excluir esta campanha por autoridade (Owner/ADM)" : "Excluir minha campanha global"}
                >
                  <span>🗑️</span>
                  <span className="hidden sm:inline">Excluir Mesa</span>
                </button>
              )}
              <button
                onClick={() => setMostrarGuia(!mostrarGuia)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800 text-xs font-bold transition-all flex items-center gap-1"
              >
                📜 Guia de Sinais
              </button>
            </div>
          </div>

          {/* BARRA DE RECURSOS E ACESSO À FICHA & PAINEL DE CONTROLE */}
          <div className="bg-slate-950 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Esquerda: Botão Ficha + Stats do Personagem */}
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <button
                onClick={() => setDrawerFichaAberto(true)}
                className="px-3 py-1 bg-violet-950 hover:bg-violet-900 text-violet-200 text-xs font-bold rounded border border-violet-800 flex items-center gap-1 transition-colors shadow"
                title="Abrir Ficha do Personagem em Drawer"
              >
                📋 Ficha do Personagem
              </button>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
                <span className="text-slate-200 font-bold">{personagemAtivo?.nome || salaPersonagemAtiva?.personagemNome || 'Herói'}</span>
                <span className="text-slate-500 text-[10px]">(Nível {personagemAtivo?.niveltotal || 1})</span>
              </div>
              <span className="text-red-400 font-bold flex items-center gap-1 px-2 py-0.5 bg-red-950/40 border border-red-900/60 rounded">
                ❤️ PV: {getPvAtual()}/{getPvMax()}
              </span>
              <span className="text-blue-400 font-bold flex items-center gap-1 px-2 py-0.5 bg-blue-950/40 border border-blue-900/60 rounded">
                💧 PM: {getPmAtual()}/{getPmMax()}
              </span>
              <span className="text-yellow-400 font-bold flex items-center gap-1 px-2 py-0.5 bg-yellow-950/40 border border-yellow-900/60 rounded">
                🪙 T$: {personagemAtivo?.tibares || 0}
              </span>
              <span className="text-slate-300 font-bold flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
                🛡️ Def: {formatDefesa()}
              </span>
            </div>

            {/* Direita: Botão Painel */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPainelDireitaAberto(!painelDireitaAberto)}
                className="px-3 py-1 bg-violet-950 hover:bg-violet-900 text-violet-200 text-xs font-bold rounded border border-violet-800 flex items-center gap-1 transition-colors shadow"
                title="Expandir / Retrair Painel de Controle Lateral"
              >
                🎒 Painel {painelDireitaAberto ? '◀' : '▶'}
              </button>
            </div>
          </div>

          {/* BARRA DE ABAS - SESSÕES POR PLAYER / PERSONAGEM ONLINE */}
          <div className="bg-slate-900/90 border-b border-slate-800 p-2 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 whitespace-nowrap">
              🎭 Personagens Online:
            </span>

            {campanhaAtiva.salas.map((sala) => {
              const isAtiva = salaPersonagemAtiva.id === sala.id;
              const isMeuPc = sala.isMeuPersonagem || sala.playerNome === profile.nomeJogador;
              const fotoAvatar = sala.playerFoto || (isMeuPc ? (profile.fotoPerfilUrl || user?.photoURL) : '');

              return (
                <button
                  key={sala.id}
                  onClick={() => setSalaPersonagemAtiva(sala)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border shadow-sm ${
                    isAtiva
                      ? 'bg-emerald-700 text-white border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {fotoAvatar ? (
                    <img src={fotoAvatar} alt={sala.playerNome} className="w-5 h-5 rounded-full object-cover border border-emerald-400 shadow-sm" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${isMeuPc ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                  )}
                  <span>{sala.personagemNome}</span>
                  {isMeuPc ? (
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800">
                      Você
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-normal">
                      ({sala.playerNome})
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={handleAdicionarAbaPersonagem}
              className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all"
              title="Vincular mais um personagem a esta mesa"
            >
              ➕ Nova Aba PC
            </button>
          </div>

          {/* BANNER SE ESTIVER VISITANDO A ABA DE OUTRO JOGADOR (MODO ESPECTADOR) */}
          {!salaPersonagemAtiva.isMeuPersonagem && salaPersonagemAtiva.playerNome !== profile.nomeJogador && (
            <div className="bg-amber-950/80 border-b border-amber-600/60 p-2.5 text-xs text-amber-200 flex items-center gap-2 font-mono">
              <span className="text-base">👁️</span>
              <span>
                <strong>Modo Espectador:</strong> Você está assistindo à aba de <strong>{salaPersonagemAtiva.personagemNome}</strong> ({salaPersonagemAtiva.playerNome}). Suas mensagens serão enviadas OBRIGATORIAMENTE em OFF (//) e não interferem na narração ON das IAs para ele.
              </span>
            </div>
          )}

          {/* GUIA DE SINAIS */}
          {mostrarGuia && (
            <div className="p-3 bg-slate-900/95 border-b border-cyan-800/60 text-xs text-slate-300 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-cyan-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                <span>📜 Sinais de Classificação de Mensagens nas Campanhas Globais</span>
                <button onClick={() => setMostrarGuia(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                <div className="p-2 bg-black/60 border border-slate-800 rounded-lg">
                  <span className="font-bold text-emerald-400 block">- Fala em Jogo</span>
                  <span className="text-[10px] text-slate-400">Ex: &quot;- Eu abro a porta com cuidado.&quot;</span>
                </div>
                <div className="p-2 bg-black/60 border border-slate-800 rounded-lg">
                  <span className="font-bold text-amber-400 block">{"// Fala em Off"}</span>
                  <span className="text-[10px] text-slate-400">Ex: &quot;// Alguém tem poção sobrando?&quot;</span>
                </div>
                <div className="p-2 bg-black/60 border border-slate-800 rounded-lg">
                  <span className="font-bold text-violet-400 block">~ Sussurro</span>
                  <span className="text-[10px] text-slate-400">Ex: &quot;~ Vou tentar enganar o guarda.&quot;</span>
                </div>
                <div className="p-2 bg-black/60 border border-slate-800 rounded-lg">
                  <span className="font-bold text-cyan-400 block">() Pensamento</span>
                  <span className="text-[10px] text-slate-400">Ex: &quot;(Isso não cheira nada bem...)&quot;</span>
                </div>
                <div className="p-2 bg-black/60 border border-slate-800 rounded-lg">
                  <span className="font-bold text-pink-400 block"># Rolagem Tática</span>
                  <span className="text-[10px] text-slate-400">Ex: &quot;#iniciativa&quot; ou &quot;#furtividade&quot;</span>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA MESA: CHAT FEED + PAINEL DE CONTROLE LATERAL */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
            {/* LADO ESQUERDO: CHAT & INPUT */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* FEED DE MENSAGENS DA ABA DO PERSONAGEM */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/90 text-slate-200">
                {mensagens.map((msg) => {
                  let badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                  let labelTipo = 'AÇÃO';

                  if (msg.tipo === 'fala') {
                    badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                    labelTipo = '💬 FALA';
                  } else if (msg.tipo === 'off') {
                    badgeStyle = 'bg-amber-950 text-amber-300 border-amber-800';
                    labelTipo = '💬 OFF';
                  } else if (msg.tipo === 'sussurro') {
                    badgeStyle = 'bg-violet-950 text-violet-300 border-violet-800';
                    labelTipo = '🤫 SUSSURRO';
                  } else if (msg.tipo === 'pensamento') {
                    badgeStyle = 'bg-cyan-950 text-cyan-300 border-cyan-800';
                    labelTipo = '🧠 PENSAMENTO';
                  }

                  return (
                    <div key={msg.id} className="flex gap-3 items-start group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          msg.autorFoto ||
                          'https://api.dicebear.com/7.x/bottts/svg?seed=' + msg.autorNome
                        }
                        alt={msg.autorNome}
                        className="w-9 h-9 rounded-full object-cover border border-emerald-500/60 flex-shrink-0 shadow"
                      />

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider border ${getPatenteColorClass(msg.patente as PatenteType)}`}>
                            {msg.patente}
                          </span>
                          <span className="font-bold text-xs text-slate-200">
                            {msg.autorNome}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${badgeStyle}`}>
                            {labelTipo}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {msg.dataHora}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-slate-200 w-fit max-w-[90%] shadow space-y-2">
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.texto}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {carregandoIA && (
                  <div className="flex gap-2 items-center text-xs text-emerald-400 animate-pulse font-mono">
                    <span>🔮 Íris / ⚙️ Aurora formulando desdobramento da ação...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* BARRA DE BOTÕES RÁPIDOS */}
              <div className="px-3 py-2 bg-slate-900/80 border-t border-slate-800 flex gap-2 items-center overflow-x-auto text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inserir:</span>
                <button
                  onClick={() => inserirPrefixo('-')}
                  className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-800 text-[11px] font-bold"
                >
                  - Fala
                </button>
                <button
                  onClick={() => inserirPrefixo('//')}
                  className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 rounded border border-amber-800 text-[11px] font-bold"
                >
                  {"// Off"}
                </button>
                <button
                  onClick={() => inserirPrefixo('~')}
                  className="px-2 py-1 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded border border-violet-800 text-[11px] font-bold"
                >
                  ~ Sussurro
                </button>
                <button
                  onClick={() => inserirPrefixo('()')}
                  className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-800 text-[11px] font-bold"
                >
                  () Pensamento
                </button>
                <button
                  onClick={() => inserirPrefixo('#furtividade')}
                  className="px-2 py-1 bg-pink-950 hover:bg-pink-900 text-pink-300 rounded border border-pink-800 text-[11px] font-bold"
                >
                  # Perícia
                </button>
              </div>

              {/* INPUT DE DIGITAÇÃO */}
              <form onSubmit={handleEnviar} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
                <button
                  type="button"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-xl border border-slate-700 text-xs font-bold"
                  title="Gravar Áudio 🔳"
                >
                  🔳
                </button>

                <button
                  type="button"
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700 text-xs font-bold"
                  title="Enviar Mídia 🎦"
                >
                  🎦
                </button>

                <input
                  type="text"
                  value={inputTexto}
                  onChange={(e) => setInputTexto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    !salaPersonagemAtiva.isMeuPersonagem && salaPersonagemAtiva.playerNome !== profile.nomeJogador
                      ? "Aba de outro jogador: Mande comentários em OFF (//)..."
                      : `Ação de ${salaPersonagemAtiva.personagemNome} (- fala, // off, ~ sussurro, #comando)...`
                  }
                  className="flex-1 p-2.5 bg-black border border-slate-800 focus:border-emerald-500 rounded-xl text-slate-200 text-xs outline-none"
                />

                <button
                  type="submit"
                  disabled={!inputTexto.trim() || carregandoIA}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md"
                >
                  Enviar ➔
                </button>
              </form>
            </div>

            {/* LADO DIREITO: PAINEL DE CONTROLE DA FICHA & AÇÕES */}
            {painelDireitaAberto && (
              <aside className="w-full lg:w-80 xl:w-96 min-w-[300px] bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-3 flex flex-col gap-3 backdrop-blur-md shadow-xl overflow-y-auto animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h2 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                    🎒 Painel de Controle
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">Consulta &amp; Ações</span>
                    <button
                      onClick={() => setPainelDireitaAberto(false)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded border border-slate-700 transition-colors flex items-center gap-1"
                      title="Recolher Painel de Controle"
                    >
                      ✕ Ocultar
                    </button>
                  </div>
                </div>

                {/* Submenus / Abas do Painel */}
                <div className="flex bg-black/60 rounded p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setAbaPainel('inventario')}
                    className={`flex-1 py-1.5 font-bold rounded transition-colors ${
                      abaPainel === 'inventario' ? 'bg-violet-900 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Mochila
                  </button>
                  <button
                    onClick={() => setAbaPainel('habilidades')}
                    className={`flex-1 py-1.5 font-bold rounded transition-colors ${
                      abaPainel === 'habilidades' ? 'bg-violet-900 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Poderes
                  </button>
                  <button
                    onClick={() => setAbaPainel('acoes')}
                    className={`flex-1 py-1.5 font-bold rounded transition-colors ${
                      abaPainel === 'acoes' ? 'bg-violet-900 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ações &amp; Dados
                  </button>
                </div>

                {/* Conteúdo da Aba 1: Equipamentos & Inventário */}
                {abaPainel === 'inventario' && (
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 text-xs">
                    {/* Itens Equipados */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
                        🛡️ ITENS EQUIPADOS ({equipadosCombinados.length})
                      </span>
                      {equipadosCombinados.length === 0 ? (
                        <span className="text-slate-600 italic">Nenhum equipamento listado.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {equipadosCombinados.map((eq, i) => {
                            const bonus = extrairBonusItem(eq);
                            const nomeEq = eq.nome || eq.itemNome || 'Equipamento';
                            return (
                              <div key={i} className="p-2 bg-slate-950 border border-cyan-900/60 rounded flex justify-between items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-cyan-200 truncate">{nomeEq}</div>
                                  <div className="text-[10px] text-cyan-400/80 truncate">
                                    {eq.tipo || 'Equipamento'} {bonus > 0 ? `| Bônus: +${bonus} Def` : ''}
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleEquiparItem(eq, false)}
                                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-200 font-bold text-[10px] rounded border border-red-800 whitespace-nowrap transition-colors"
                                >
                                  Desequipar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Inventário Completo */}
                    <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                      <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider flex items-center justify-between">
                        📦 INVENTÁRIO &amp; CONSUMÍVEIS ({inventarioLista.length})
                      </span>
                      {inventarioLista.length === 0 ? (
                        <span className="text-slate-600 italic">Mochila vazia.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {inventarioLista.map((inv, i) => {
                            const nomeInv = inv.nome || inv.itemNome || 'Item';
                            const ehConsumavel = isItemConsumavel(inv);
                            const isEquipado = inv.equipado || (Array.isArray(personagemAtivo?.equipamentos) && personagemAtivo.equipamentos.some((e: any) => (e.nome || e.itemNome || '').toLowerCase() === nomeInv.toLowerCase()));
                            
                            return (
                              <div key={i} className={`p-2 bg-black border ${isEquipado ? 'border-cyan-800 bg-cyan-950/20' : 'border-slate-800'} rounded flex justify-between items-center gap-2 transition-colors`}>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                                    <span>{nomeInv}</span>
                                    {isEquipado && (
                                      <span className="text-[9px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 font-mono border border-cyan-800 rounded font-bold">
                                        EQUIPADO
                                      </span>
                                    )}
                                    {ehConsumavel && (
                                      <span className="text-[9px] px-1.5 py-0.2 bg-amber-950 text-amber-300 font-mono border border-amber-800 rounded font-bold">
                                        CONSUMÍVEL
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">{inv.desc || inv.descricao || 'Sem descrição'}</div>
                                </div>
                                <span className="text-[10px] font-mono text-yellow-400 font-bold whitespace-nowrap">x{inv.qtd || 1}</span>
                                
                                {ehConsumavel ? (
                                  <button
                                    onClick={() => setInputTexto(`Uso o item ${nomeInv} do meu inventário`)}
                                    className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 text-amber-200 font-bold text-[10px] rounded border border-amber-800 whitespace-nowrap transition-colors"
                                  >
                                    Usar
                                  </button>
                                ) : isEquipado ? (
                                  <button
                                    onClick={() => toggleEquiparItem(inv, false)}
                                    className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 font-bold text-[10px] rounded border border-cyan-700 whitespace-nowrap transition-colors"
                                  >
                                    Desequipar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => toggleEquiparItem(inv, true)}
                                    className="px-2.5 py-1 bg-yellow-950 hover:bg-yellow-900 text-yellow-200 font-bold text-[10px] rounded border border-yellow-800 whitespace-nowrap transition-colors"
                                  >
                                    Equipar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conteúdo da Aba 2: Habilidades & Magias */}
                {abaPainel === 'habilidades' && (
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 text-xs">
                    <input
                      type="text"
                      placeholder="Filtrar habilidades / magias..."
                      value={filtroHabilidades}
                      onChange={(e) => setFiltroHabilidades(e.target.value)}
                      className="p-2 bg-black border border-slate-800 text-slate-200 rounded text-xs focus:outline-none focus:border-violet-500"
                    />

                    <div className="flex flex-col gap-2">
                      {habilidadesLista.length === 0 ? (
                        <span className="text-slate-600 italic">Nenhuma habilidade cadastrada na ficha.</span>
                      ) : (
                        habilidadesLista
                          .filter((h) => !filtroHabilidades || (h.titulo || h.nome || '').toLowerCase().includes(filtroHabilidades.toLowerCase()))
                          .map((hab, i) => (
                            <div key={i} className="p-2.5 bg-black border border-slate-800 rounded flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-violet-300">{hab.titulo || hab.nome || `Habilidade ${i+1}`}</span>
                                <button
                                  onClick={() => setInputTexto(`Ativo a habilidade ${hab.titulo || hab.nome}`)}
                                  className="px-2 py-0.5 bg-violet-950 hover:bg-violet-900 text-violet-200 font-bold text-[10px] rounded border border-violet-800"
                                >
                                  Ativar
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-snug">{hab.conteudo || hab.descricao || 'Sem descrição'}</p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Conteúdo da Aba 3: Ações Rápidas & Rolagem de Dados */}
                {abaPainel === 'acoes' && (
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 text-xs">
                    {/* Ataques Registrados */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                        ⚔️ Ataques Registrados ({ataquesLista.length})
                      </span>
                      {ataquesLista.length === 0 ? (
                        <span className="text-slate-600 italic">Nenhum ataque cadastrado.</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {ataquesLista.map((atk, i) => (
                            <div key={i} className="p-2 bg-black border border-slate-800 rounded flex justify-between items-center gap-2">
                              <div>
                                <div className="font-bold text-red-300">{atk.nome || 'Ataque'}</div>
                                <div className="text-[10px] text-slate-400">
                                  Ataque: {atk.teste || '+0'} | Dano: {atk.dano || '1d6'} | Crit: {atk.critico || 'x2'}
                                </div>
                              </div>
                              <button
                                onClick={() => setInputTexto(`Ataco com ${atk.nome} (Ataque ${atk.teste}, Dano ${atk.dano})`)}
                                className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-200 font-bold text-[10px] rounded border border-red-800"
                              >
                                Atacar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rolador Express de Dados */}
                    <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        🎲 Rolagem Rápida de Dados
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {[4, 6, 8, 10, 12, 20, 100].map((d) => (
                          <button
                            key={d}
                            onClick={() => rolarDadoEEnviar(d)}
                            className="py-2 bg-slate-950 hover:bg-amber-950 text-amber-300 font-mono font-bold rounded border border-amber-800/80 transition-colors text-center"
                          >
                            d{d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        </div>
      )}

      {/* DRAWER / MENU OCULTO DA FICHA DO PERSONAGEM NAS CAMPANHAS GLOBAIS */}
      {drawerFichaAberto && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fundo escuro overlay */}
          <div
            onClick={() => setDrawerFichaAberto(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Conteúdo do Menu Deslizante na Esquerda */}
          <div className="relative z-10 w-full sm:w-[480px] bg-slate-900 border-r border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto shadow-2xl text-slate-200 animate-fadeIn">
            
            {/* Header da Ficha */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-violet-400">{personagemAtivo?.nome || salaPersonagemAtiva?.personagemNome || 'Ficha do Personagem'}</h2>
                <p className="text-xs text-slate-400">
                  {personagemAtivo?.raca || 'Raça'} • {personagemAtivo?.frstclasse || 'Classe'} (Nível {personagemAtivo?.niveltotal || 1})
                </p>
              </div>
              <button
                onClick={() => setDrawerFichaAberto(false)}
                className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Controle de Saúde & Recursos com Ajuste Rápido */}
            <div className="bg-black/80 p-4 rounded-lg border border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Controle Rápido de Recursos</span>
              
              {/* PV (Pontos de Vida) */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-xs font-bold text-red-400 w-16">❤️ PV</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {getPvAtual()} / {getPvMax()}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => alterarRecurso('pvAtual', -5)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs rounded border border-red-800">-5</button>
                  <button onClick={() => alterarRecurso('pvAtual', -1)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs rounded border border-red-800">-1</button>
                  <button onClick={() => alterarRecurso('pvAtual', 1)} className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold text-xs rounded border border-emerald-800">+1</button>
                  <button onClick={() => alterarRecurso('pvAtual', 5)} className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold text-xs rounded border border-emerald-800">+5</button>
                </div>
              </div>

              {/* PM (Pontos de Mana) */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-xs font-bold text-blue-400 w-16">💧 PM</span>
                <span className="text-sm font-mono font-bold text-slate-200">
                  {getPmAtual()} / {getPmMax()}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => alterarRecurso('pmAtual', -1)} className="px-2 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 font-bold text-xs rounded border border-blue-800">-1</button>
                  <button onClick={() => alterarRecurso('pmAtual', 1)} className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold text-xs rounded border border-cyan-800">+1</button>
                </div>
              </div>

              {/* Tibares T$ */}
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-xs font-bold text-yellow-400 w-16">🪙 T$</span>
                <span className="text-sm font-mono font-bold text-yellow-300">
                  {personagemAtivo?.tibares || 0} T$
                </span>
                <div className="flex gap-1">
                  <button onClick={() => alterarRecurso('tibares', -10)} className="px-2 py-1 bg-yellow-950 hover:bg-yellow-900 text-yellow-300 font-bold text-xs rounded border border-yellow-800">-10</button>
                  <button onClick={() => alterarRecurso('tibares', 10)} className="px-2 py-1 bg-yellow-950 hover:bg-yellow-900 text-yellow-300 font-bold text-xs rounded border border-yellow-800">+10</button>
                </div>
              </div>
            </div>

            {/* Atributos do Personagem */}
            <div className="bg-black/80 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Atributos Principais</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {['for', 'des', 'con', 'int', 'sab', 'car'].map((attr) => {
                  const valObj = personagemAtivo?.atributos?.[attr];
                  const mod = typeof valObj === 'object' ? valObj?.mod : valObj || '0';
                  return (
                    <div key={attr} className="p-2 bg-slate-950 border border-slate-800 rounded flex flex-col">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">{attr}</span>
                      <span className="text-base font-mono font-bold text-violet-300">{mod}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visão Geral & Lore */}
            <div className="bg-black/80 p-4 rounded-lg border border-slate-800 flex flex-col gap-2 text-xs">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Detalhes &amp; Lore</span>
              <div><strong className="text-slate-400">Origem:</strong> {personagemAtivo?.origem || 'Nenhuma'}</div>
              <div><strong className="text-slate-400">Divindade:</strong> {personagemAtivo?.divindade || 'Nenhuma'}</div>
              <div><strong className="text-slate-400">Carga:</strong> {personagemAtivo?.carga || '0/0'}</div>
              {personagemAtivo?.loreText && (
                <div className="mt-2 border-t border-slate-800 pt-2">
                  <span className="font-bold text-slate-400 block mb-1">História / Background:</span>
                  <p className="text-slate-300 leading-relaxed italic">{personagemAtivo.loreText}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CAMPANHA GLOBAL */}
      {campanhaExcluirModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-red-600/70 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-500 flex items-center justify-center text-xl text-red-400">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-red-200 uppercase tracking-wider">
                  Excluir Campanha Global
                </h3>
                <p className="text-xs text-slate-400">
                  Esta ação é irreversível e removerá a mesa da rede global.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">{campanhaExcluirModal.titulo}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                Sistema: {campanhaExcluirModal.sistema} | Criador: {campanhaExcluirModal.criador}
              </p>
              {isADM && (campanhaExcluirModal.criador !== profile.nomeJogador && campanhaExcluirModal.criadorEmail !== user?.email) && (
                <span className="inline-block mt-1 text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800 font-bold">
                  👑 Exclusão por Autoridade ({profile.patente === 'Owner' || isOwner ? 'Owner' : 'ADM'})
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCampanhaExcluirModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExcluirCampanhaGlobal(campanhaExcluirModal)}
                className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg border border-red-500"
              >
                🗑️ Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
