'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, getCurrentUserId } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { getStoredUserProfile, getPatenteColorClass } from '@/lib/patentes';

interface Message {
  id: string;
  autor: 'jogador' | 'iris' | 'aurora' | 'executora' | 'sistema';
  texto: string;
  notaMediador?: string;
  acoesExecutora?: any[];
  dataHora: string;
}

const AVATAR_IRIS = 'https://i.pinimg.com/736x/74/07/62/740762fa404514ccb11facc128517a56.jpg';
const AVATAR_AURORA = 'https://i.pinimg.com/1200x/ee/e4/55/eee455f92b1bd2fe011597fccaf89aa5.jpg';

export default function SecaoTelaJogo() {
  const [campanhaAtiva, setCampanhaAtiva] = useState<any>(null);
  const [personagemAtivo, setPersonagemAtivo] = useState<any>(null);

  const [userProfile, setUserProfile] = useState(() => ({
    nomeJogador: 'Aventureiro',
    fotoPerfilUrl: '',
    patente: 'Jogador' as any,
  }));

  useEffect(() => {
    setUserProfile(getStoredUserProfile());
    const handleProfileUpdate = (e: any) => {
      setUserProfile(e.detail || getStoredUserProfile());
    };
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdate);
  }, []);

  // Ref para Rolagem Automática das Mensagens da Campanha
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Estados de UI, Autosave e Episódio
  const [episodioAtual, setEpisodioAtual] = useState<number>(1);
  const [autoSalvoStatus, setAutoSalvoStatus] = useState<string>('Auto-save Ativo');
  const [falandoMensagemId, setFalandoMensagemId] = useState<string | null>(null);
  const [carregandoAudioId, setCarregandoAudioId] = useState<string | null>(null);
  const [motorVoz, setMotorVoz] = useState<'elevenlabs' | 'gemini' | 'local'>('gemini'); // 'gemini' = Multimodal Gemini HD | 'local' = Web Speech API | 'elevenlabs' = Desabilitado temporariamente
  const [vozIrisGemini, setVozIrisGemini] = useState<string>('Lyra'); // 'Lyra' | 'Despina'
  const [vozAuroraGemini, setVozAuroraGemini] = useState<string>('Ursa'); // 'Ursa' | 'Kore'
  const [controlesTopoAberto, setControlesTopoAberto] = useState<boolean>(false);
  const [focoNarrativo, setFocoNarrativo] = useState<string>('3ª Pessoa (Onisciente)');
  const [audioAtualRef, setAudioAtualRef] = useState<HTMLAudioElement | null>(null);
  const [modoRapido, setModoRapido] = useState<boolean>(false);

  const [drawerFichaAberto, setDrawerFichaAberto] = useState(false);
  const [painelDireitaAberto, setPainelDireitaAberto] = useState(true);
  const [abaPainel, setAbaPainel] = useState<'inventario' | 'habilidades' | 'acoes'>('inventario');
  const [filtroHabilidades, setFiltroHabilidades] = useState('');
  const [salvandoFicha, setSalvandoFicha] = useState(false);
  const [mensagemSucessoSalvar, setMensagemSucessoSalvar] = useState('');

  const [inputAcao, setInputAcao] = useState('');
  const [carregandoResposta, setCarregandoResposta] = useState(false);
  const [mostrarDicasFormatacao, setMostrarDicasFormatacao] = useState(false);

  const [mensagensJogo, setMensagensJogo] = useState<Message[]>([
    {
      id: '1',
      autor: 'iris',
      texto: 'Os ventos da aventura uivam pelos confins da galáxia e dos reinos antigos. As 3 IAs do sistema (Íris, Aurora e Executora) estão prontas para narrar, mediar regras e executar alterações na sua ficha em tempo real.',
      dataHora: '--:--',
    },
  ]);

  // Efeito de Rolagem Automática ao Enviar/Gerar Novas Mensagens
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagensJogo, carregandoResposta]);


  // Web Audio API Context e Source Refs para decodificação e tocar PCM sem latência
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Função para tocar áudio PCM vindo da API do Gemini via Web Audio API (AudioContext)
  const playGeminiAudioPCM = async (base64Data: string, sampleRate = 24000, onEnded?: () => void) => {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) throw new Error("AudioContext não é suportado neste navegador.");

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Parar reprodução de áudio anterior do AudioContext se houver
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop();
        } catch (e) {}
        currentAudioSourceRef.current = null;
      }

      let audioBuffer: AudioBuffer;

      try {
        // 1. Tentar decodificação nativa da Web Audio API
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      } catch (decodeError) {
        // 2. Decodificação manual de PCM bruto 16-bit Mono (16-bit Int16 LE)
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const sampleCount = Math.floor(len / 2);
        audioBuffer = ctx.createBuffer(1, sampleCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < len; i += 2) {
          const byte1 = binaryString.charCodeAt(i);
          const byte2 = binaryString.charCodeAt(i + 1);
          let uint16 = (byte2 << 8) | byte1;
          if (uint16 >= 0x8000) {
            uint16 -= 0x10000;
          }
          channelData[i / 2] = uint16 / 32768.0;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        currentAudioSourceRef.current = null;
        if (onEnded) onEnded();
      };

      source.start(0);
      currentAudioSourceRef.current = source;

      // Retorna objeto com método pause() para compatibilidade com o controle de parada
      return {
        pause: () => {
          try {
            source.stop();
          } catch (e) {}
          currentAudioSourceRef.current = null;
        }
      };
    } catch (err) {
      console.error("Erro ao tocar áudio PCM com AudioContext:", err);
      throw err;
    }
  };

  // Função de Leitura em Voz Alta (Botões de Voz travados temporariamente a pedido)
  const falarTexto = async (msgId: string, texto: string, autor: 'iris' | 'aurora' | string = 'iris') => {
    alert("🔒 Os botões de Voz da Íris e Aurora foram temporariamente travados para manutenção dos modelos de voz.");
    return;
  };

  const adicionarLogSistema = (texto: string) => {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setMensagensJogo((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        autor: 'sistema',
        texto,
        dataHora: hora,
      },
    ]);
  };

  const falarGemini = async (msgId: string, texto: string, autor: string) => {
    const voiceName = autor.toLowerCase() === 'aurora' ? vozAuroraGemini : vozIrisGemini;
    try {
      setCarregandoAudioId(msgId);
      setFalandoMensagemId(null);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto,
          autor,
          voiceNameOverride: voiceName,
        }),
      });

      const data = await res.json();
      setCarregandoAudioId(null);

      if (data.success && data.audioBase64) {
        setFalandoMensagemId(msgId);
        try {
          // Tocando via Web Audio API (AudioContext) para reprodução perfeita e sem atrasos
          const player = await playGeminiAudioPCM(data.audioBase64, 24000, () => {
            setFalandoMensagemId(null);
            setAudioAtualRef(null);
          });
          setAudioAtualRef(player as any);
        } catch (playErr) {
          console.warn("Falha ao decodificar PCM no Web Audio API, fallback para elemento HTML Audio...", playErr);
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.onended = () => {
            setFalandoMensagemId(null);
            setAudioAtualRef(null);
          };
          audio.onerror = () => {
            setFalandoMensagemId(null);
            setAudioAtualRef(null);
            falarLocal(msgId, texto, autor);
          };
          setAudioAtualRef(audio);
          await audio.play();
        }
      } else {
        console.warn("API Gemini TTS retornou sem áudio, recorrendo ao sintetizador local:", data.error);
        const errStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || '');
        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
          adicionarLogSistema(
            '⚠️ [Aviso de Voz Gemini] O limite de requisições por minuto do Gemini Free Tier foi atingido para a narração. A síntese local do navegador foi ativada temporariamente. Aguarde ~1 minuto para o limite resetar e clique em "Ouvir" novamente para usar a voz HD.'
          );
        }
        falarLocal(msgId, texto, autor);
      }
    } catch (err) {
      console.error("Erro ao chamar API de TTS do Gemini:", err);
      setCarregandoAudioId(null);
      adicionarLogSistema(
        '⚠️ [Aviso de Voz] Falha ao comunicar com o serviço de voz em nuvem. Ativando voz sintetizada local do navegador.'
      );
      falarLocal(msgId, texto, autor);
    }
  };

  const falarLocal = (msgId: string, texto: string, autor: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Leitura em voz alta não suportada neste navegador.');
      return;
    }
    const textoLimpo = texto.replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(textoLimpo);
    utterance.lang = 'pt-BR';

    if (autor === 'aurora') {
      utterance.pitch = 0.75;
      utterance.rate = 0.92;
    } else {
      utterance.pitch = 1.25;
      utterance.rate = 1.05;
    }

    const vozes = window.speechSynthesis.getVoices();
    const vozesPt = vozes.filter((v) => v.lang.includes('pt'));
    if (vozesPt.length > 0) {
      if (autor === 'aurora' && vozesPt.length > 1) {
        utterance.voice = vozesPt[1] || vozesPt[0];
      } else {
        utterance.voice = vozesPt[0];
      }
    }

    utterance.onend = () => setFalandoMensagemId(null);
    utterance.onerror = () => setFalandoMensagemId(null);

    setFalandoMensagemId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Helper para identificar consumíveis (poções, pergaminhos, elixires, alimentos)
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

  // Auto-salvar no Firestore ao atualizar o estado da jogada
  const autoSalvarCampanhaEHistorico = async (novasMensagens: Message[], fichaAtual: any, epNum: number) => {
    if (!campanhaAtiva || !campanhaAtiva.id) return;
    try {
      const campRef = doc(db, "Campanhas", campanhaAtiva.id);
      await updateDoc(campRef, {
        episodioAtual: epNum,
        historicoMensagens: novasMensagens.slice(-30),
        data_atualizacao: new Date().toISOString(),
      });
      if (fichaAtual && fichaAtual.id) {
        const pRef = doc(db, "Personagens", fichaAtual.id);
        await updateDoc(pRef, {
          ...fichaAtual,
          data_atualizacao: new Date().toISOString(),
        });
      }
      setAutoSalvoStatus(`Salvo às ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      console.error("Erro ao auto-salvar campanha:", e);
    }
  };

  // Avançar episódio
  const avançarEpisodio = async () => {
    const proxEp = episodioAtual + 1;
    setEpisodioAtual(proxEp);

    if (campanhaAtiva) {
      setCampanhaAtiva((prev: any) => ({ ...prev, episodioAtual: proxEp }));
    }

    const msgEp: Message = {
      id: Date.now().toString(),
      autor: 'sistema',
      texto: `🎬 **INÍCIO DO EPISÓDIO ${proxEp}** — O capítulo anterior foi registrado e salvo na ficha do herói e no banco da campanha!`,
      dataHora: new Date().toLocaleTimeString(),
    };

    const novoHistorico = [...mensagensJogo, msgEp];
    setMensagensJogo(novoHistorico);
    await autoSalvarCampanhaEHistorico(novoHistorico, personagemAtivo, proxEp);
  };

  // Fixar data/hora no cliente para evitar hydration mismatch
  useEffect(() => {
    setMensagensJogo((prev) =>
      prev.map((m) => (m.id === '1' ? { ...m, dataHora: new Date().toLocaleTimeString() } : m))
    );
  }, []);

  // Carregar Campanha e Personagem Ativo
  useEffect(() => {
    const buscarDados = async () => {
      try {
        const uid = getCurrentUserId();
        const campQuery = uid
          ? query(collection(db, "Campanhas"), where("userId", "==", uid))
          : query(collection(db, "Campanhas"), where("userId", "==", "public"));

        const pcQuery = uid
          ? query(collection(db, "Personagens"), where("userId", "==", uid))
          : query(collection(db, "Personagens"), where("userId", "==", "public"));

        const snapCamp = await getDocs(campQuery);
        const camps: any[] = [];
        snapCamp.forEach((d) => camps.push({ id: d.id, ...d.data() }));
        
        const targetCampId = typeof window !== 'undefined' ? localStorage.getItem('campanha_ativa_id') : null;
        let campSelecionada = (targetCampId ? camps.find((c) => c.id === targetCampId) : null) || camps[0] || null;
        setCampanhaAtiva(campSelecionada);

        const snapPCs = await getDocs(pcQuery);
        const pcs: any[] = [];
        snapPCs.forEach((d) => {
          pcs.push({ id: d.id, ...d.data() });
        });

        if (campSelecionada) {
          if (Array.isArray(campSelecionada.historicoMensagens) && campSelecionada.historicoMensagens.length > 0) {
            setMensagensJogo(campSelecionada.historicoMensagens);
          } else {
            // Se a nova campanha não possui histórico de mensagens, zera para o diálogo inicial limpo
            const nomeHeroi = campSelecionada.personagemNome || 'Aventureiro';
            setMensagensJogo([
              {
                id: Date.now().toString(),
                autor: 'iris',
                texto: `Saudações, **${nomeHeroi}**! A campanha **"${campSelecionada.titulo || 'Nova Aventura'}"** começou. Íris, Aurora e a Executora estão apostos! O que você deseja fazer em seu primeiro turno?`,
                dataHora: new Date().toLocaleTimeString(),
              },
            ]);
          }
          if (typeof campSelecionada.episodioAtual === 'number' && campSelecionada.episodioAtual > 0) {
            setEpisodioAtual(campSelecionada.episodioAtual);
          } else {
            setEpisodioAtual(1);
          }
        }

        // Tentar encontrar o personagem estritamente vinculado à campanha selecionada
        const targetPcId = campSelecionada?.personagemId || campSelecionada?.pcVinculado;
        if (targetPcId) {
          const pcMatch = pcs.find((p) => p.id === targetPcId || p.nome === targetPcId);
          if (pcMatch) {
            setPersonagemAtivo(pcMatch);
          } else if (pcs.length > 0) {
            setPersonagemAtivo(pcs[0]);
          }
        } else if (pcs.length > 0) {
          setPersonagemAtivo(pcs[0]);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do jogo:", e);
      }
    };

    buscarDados();

    const handleReload = () => buscarDados();
    window.addEventListener('carregarCampanhaJogo', handleReload);
    window.addEventListener('auth-changed', handleReload);
    return () => {
      window.removeEventListener('carregarCampanhaJogo', handleReload);
      window.removeEventListener('auth-changed', handleReload);
    };
  }, []);

  // Helpers de leitura de PV/PM/Defesa
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
    if (typeof def === 'object') return def.total ?? def.arm ?? '10';
    return String(def);
  };

  // Ajustes rápidos de recurso (PV/PM/Tibares) com persistência no Firestore
  const alterarRecurso = async (campo: 'pvAtual' | 'pmAtual' | 'tibares', delta: number) => {
    if (!personagemAtivo || !personagemAtivo.id) return;
    const clone = { ...personagemAtivo };

    let maxVal = 999;
    if (campo === 'pvAtual') maxVal = parseInt(getPvMax()) || 999;
    if (campo === 'pmAtual') maxVal = parseInt(getPmMax()) || 999;

    const atual = parseInt(clone[campo] || (campo === 'pvAtual' ? getPvAtual() : campo === 'pmAtual' ? getPmAtual() : '0')) || 0;
    const novo = Math.min(maxVal, Math.max(0, atual + delta)).toString();

    clone[campo] = novo;
    if (campo === 'pvAtual') clone.hpAtual = novo; // sincronia de compatibilidade

    setPersonagemAtivo(clone);

    try {
      const pRef = doc(db, "Personagens", clone.id);
      await updateDoc(pRef, clone);
    } catch (e) {
      console.error("Erro ao atualizar recurso no Firebase:", e);
    }
  };

  // Salvar ficha completa editada no Firestore
  const salvarFichaCompleta = async () => {
    if (!personagemAtivo || !personagemAtivo.id) return;
    setSalvandoFicha(true);
    try {
      const pRef = doc(db, "Personagens", personagemAtivo.id);
      await updateDoc(pRef, {
        ...personagemAtivo,
        data_atualizacao: new Date().toISOString(),
      });
      setMensagemSucessoSalvar('Ficha salva com sucesso no Firestore!');
      setTimeout(() => setMensagemSucessoSalvar(''), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar ficha:", err);
      alert(`Erro ao salvar ficha: ${err.message}`);
    } finally {
      setSalvandoFicha(false);
    }
  };

  // Rolador de dados rápido
  const rolarDadoEEnviar = (lados: number) => {
    const resultado = Math.floor(Math.random() * lados) + 1;
    const nomeDado = `d${lados}`;
    const msg: Message = {
      id: Date.now().toString(),
      autor: 'sistema',
      texto: `🎲 Rolou ${nomeDado}: **${resultado}** (Total: ${resultado})`,
      dataHora: new Date().toLocaleTimeString(),
    };
    setMensagensJogo((prev) => [...prev, msg]);
  };

  // Helper de extração de bônus de item (defesa)
  const extrairBonusItem = (item: any): number => {
    if (!item) return 0;
    if (typeof item.bonusDef === 'number' && item.bonusDef > 0) return item.bonusDef;
    if (typeof item.bonus === 'number' && item.bonus > 0) return item.bonus;
    if (typeof item.bonusDef === 'string' && !isNaN(parseInt(item.bonusDef))) return parseInt(item.bonusDef);

    const texto = `${item.nome || item.itemNome || ''} ${item.desc || item.descricao || ''} ${item.detalhes || ''}`;
    const textoLower = texto.toLowerCase();

    // Bônus mágico explícito ex: +5, +3
    const matchPlus = texto.match(/\+(\d+)/);
    let bonusMagico = matchPlus ? parseInt(matchPlus[1]) : 0;

    // Bônus base por categoria de armadura/escudo no T20
    let bonusBase = 0;
    if (textoLower.includes('brúnea') || textoLower.includes('brunea')) bonusBase = 5;
    else if (textoLower.includes('cota de malha') || textoLower.includes('cota')) bonusBase = 6;
    else if (textoLower.includes('armadura completa') || textoLower.includes('placas')) bonusBase = 8;
    else if (textoLower.includes('couro batido')) bonusBase = 3;
    else if (textoLower.includes('couro de sabre') || textoLower.includes('couro')) bonusBase = 2;
    else if (textoLower.includes('gibão de peles') || textoLower.includes('gibao')) bonusBase = 4;
    else if (textoLower.includes('corselete')) bonusBase = 2;
    else if (textoLower.includes('escudo pesado') || textoLower.includes('aegis')) bonusBase = 2;
    else if (textoLower.includes('escudo leve') || textoLower.includes('escudo')) bonusBase = 1;

    if (bonusBase > 0 || bonusMagico > 0) {
      return bonusBase + bonusMagico;
    }

    const matchDef = texto.match(/(?:defesa|def|ca)\s*:?\s*\+?(\d+)/i);
    if (matchDef) return parseInt(matchDef[1]);

    return 0;
  };

  // Helper para identificar o tipo de slot do equipamento
  const getTipoSlotItem = (nomeStr: string, descStr: string = '') => {
    const combo = `${nomeStr} ${descStr}`.toLowerCase();

    const ehArmadura = (
      combo.includes('brúnea') || combo.includes('brunea') || combo.includes('cota de malha') ||
      combo.includes('couro') || combo.includes('placas') || combo.includes('corselete') ||
      combo.includes('gibão') || combo.includes('gibao') || combo.includes('armadura')
    );

    const ehEscudo = combo.includes('escudo') || combo.includes('aegis') || combo.includes('broquel');

    const ehDuasMaos = (
      combo.includes('montante') || combo.includes('duas mãos') || combo.includes('duas maos') ||
      combo.includes('2 mãos') || combo.includes('2 maos') || combo.includes('alabarda') ||
      combo.includes('arco longo') || combo.includes('machado de guerra') || combo.includes('lança de montaria')
    );

    return { ehArmadura, ehEscudo, ehDuasMaos };
  };

  // Aplica equipar/desequipar respeitando slots de Armadura e Mãos (armas de 2 mãos x escudos)
  const equiparItemSmart = (personagem: any, itemNome: string, paraEquipar: boolean) => {
    if (!personagem) return personagem;
    let clone = { ...personagem };

    let invList: any[] = Array.isArray(clone.inventario) ? [...clone.inventario] : [];
    let equipList: any[] = Array.isArray(clone.equipamentos) ? [...clone.equipamentos] : [];

    if (!paraEquipar) {
      // Desequipar item específico
      invList = invList.map((i) => {
        if ((i.nome || i.itemNome || '').toLowerCase() === itemNome.toLowerCase()) {
          return { ...i, equipado: false };
        }
        return i;
      });
      equipList = equipList.filter((e) => (e.nome || e.itemNome || '').toLowerCase() !== itemNome.toLowerCase());
      clone.inventario = invList;
      clone.equipamentos = equipList;
      return recalcularFichaComEquipamentos(clone);
    }

    // Ação: EQUIPAR item
    const itemMatch = invList.find((i) => (i.nome || i.itemNome || '').toLowerCase() === itemNome.toLowerCase()) || { nome: itemNome };
    const slot = getTipoSlotItem(itemNome, itemMatch.desc || itemMatch.descricao || '');

    // Resolução de Conflitos de Slots
    const desequiparNomes: string[] = [];

    if (slot.ehArmadura) {
      // Se for Armadura, desequipar qualquer outra Armadura equipada
      invList.forEach((invItem) => {
        const nInv = invItem.nome || invItem.itemNome || '';
        if (invItem.equipado && nInv.toLowerCase() !== itemNome.toLowerCase()) {
          const sInv = getTipoSlotItem(nInv, invItem.desc || invItem.descricao || '');
          if (sInv.ehArmadura) desequiparNomes.push(nInv);
        }
      });
    }

    if (slot.ehDuasMaos) {
      // Se for Arma de 2 Mãos, desequipar todos os ESCUDOS e outras armas nas mãos!
      invList.forEach((invItem) => {
        const nInv = invItem.nome || invItem.itemNome || '';
        if (invItem.equipado && nInv.toLowerCase() !== itemNome.toLowerCase()) {
          const sInv = getTipoSlotItem(nInv, invItem.desc || invItem.descricao || '');
          if (sInv.ehEscudo || sInv.ehDuasMaos) desequiparNomes.push(nInv);
        }
      });
      equipList.forEach((eqItem) => {
        const nEq = eqItem.nome || eqItem.itemNome || '';
        if (nEq.toLowerCase() !== itemNome.toLowerCase()) {
          const sEq = getTipoSlotItem(nEq, eqItem.desc || eqItem.descricao || '');
          if (sEq.ehEscudo || sEq.ehDuasMaos) desequiparNomes.push(nEq);
        }
      });
    }

    if (slot.ehEscudo) {
      // Se for Escudo, desequipar qualquer Arma de 2 Mãos ou outro Escudo
      invList.forEach((invItem) => {
        const nInv = invItem.nome || invItem.itemNome || '';
        if (invItem.equipado && nInv.toLowerCase() !== itemNome.toLowerCase()) {
          const sInv = getTipoSlotItem(nInv, invItem.desc || invItem.descricao || '');
          if (sInv.ehDuasMaos || sInv.ehEscudo) desequiparNomes.push(nInv);
        }
      });
      equipList.forEach((eqItem) => {
        const nEq = eqItem.nome || eqItem.itemNome || '';
        if (nEq.toLowerCase() !== itemNome.toLowerCase()) {
          const sEq = getTipoSlotItem(nEq, eqItem.desc || eqItem.descricao || '');
          if (sEq.ehDuasMaos || sEq.ehEscudo) desequiparNomes.push(nEq);
        }
      });
    }

    // Aplicar as desequipagens conflitantes
    invList = invList.map((i) => {
      const n = (i.nome || i.itemNome || '').toLowerCase();
      if (n === itemNome.toLowerCase()) {
        return { ...i, equipado: true };
      }
      if (desequiparNomes.some((dn) => dn.toLowerCase() === n)) {
        return { ...i, equipado: false };
      }
      return i;
    });

    equipList = equipList.filter((e) => {
      const n = (e.nome || e.itemNome || '').toLowerCase();
      return !desequiparNomes.some((dn) => dn.toLowerCase() === n);
    });

    // Adicionar o novo item
    const jaExiste = equipList.some((e) => (e.nome || e.itemNome || '').toLowerCase() === itemNome.toLowerCase());
    if (!jaExiste) {
      equipList.push({
        nome: itemNome,
        bonusDef: extrairBonusItem(itemMatch),
        tipo: slot.ehEscudo ? 'esc' : slot.ehArmadura ? 'arm' : 'arma',
        desc: itemMatch.desc || itemMatch.descricao || '',
      });
    }

    clone.inventario = invList;
    clone.equipamentos = equipList;

    return recalcularFichaComEquipamentos(clone);
  };

  // Recalcular a Ficha e Defesa com base em todos os itens equipados
  const recalcularFichaComEquipamentos = (pc: any) => {
    if (!pc) return pc;
    const clone = { ...pc };

    const desMod = parseInt(
      clone.atributos?.des?.mod ?? clone.atributos?.des ?? clone.defDes ?? '0'
    ) || 0;

    let equipados = Array.isArray(clone.equipamentos) ? [...clone.equipamentos] : [];
    const inv = Array.isArray(clone.inventario) ? [...clone.inventario] : [];

    // Incluir itens do inventário marcados com equipado === true
    inv.forEach((itemInv: any) => {
      if (itemInv.equipado) {
        const nomeInv = itemInv.nome || itemInv.itemNome || '';
        const jaExiste = equipados.some((eq: any) => (eq.nome || eq.itemNome || '').toLowerCase() === nomeInv.toLowerCase());
        if (!jaExiste && nomeInv) {
          equipados.push({
            nome: nomeInv,
            bonusDef: extrairBonusItem(itemInv),
            tipo: itemInv.tipo || itemInv.categoria || (nomeInv.toLowerCase().includes('escudo') ? 'esc' : 'arm'),
          });
        }
      }
    });

    // Validar conflitos em equipados: se há arma de 2 mãos equipada, remover qualquer escudo
    const temDuasMaosEquipado = equipados.some((eq: any) => {
      const slot = getTipoSlotItem(eq.nome || eq.itemNome || '', eq.desc || '');
      return slot.ehDuasMaos;
    });

    if (temDuasMaosEquipado) {
      equipados = equipados.filter((eq: any) => {
        const slot = getTipoSlotItem(eq.nome || eq.itemNome || '', eq.desc || '');
        return !slot.ehEscudo;
      });
    }

    let totalDefArm = 0;
    let totalDefEsc = 0;
    let totalDefOut = parseInt(clone.defOut || '0') || 0;

    equipados.forEach((item: any) => {
      const bonus = extrairBonusItem(item);
      const nomeLower = (item.nome || item.itemNome || '').toLowerCase();
      const slot = getTipoSlotItem(nomeLower, item.desc || item.descricao || '');

      if (slot.ehEscudo) {
        totalDefEsc += bonus;
      } else if (slot.ehArmadura) {
        totalDefArm += bonus;
      } else {
        totalDefOut += bonus;
      }
    });

    const baseDef = 10;
    const totalDefesa = baseDef + desMod + totalDefArm + totalDefEsc + totalDefOut;

    clone.defDes = String(desMod);
    clone.defArm = String(totalDefArm);
    clone.defEsc = String(totalDefEsc);
    clone.defOut = String(totalDefOut);
    clone.defesaTotal = String(totalDefesa);
    clone.defesa = String(totalDefesa);
    clone.equipamentos = equipados;

    return clone;
  };

  // Toggling e Equipar/Desequipar
  const toggleEquiparItem = async (item: any, paraEquipar: boolean) => {
    if (!personagemAtivo || !personagemAtivo.id) return;

    const itemNome = item.nome || item.itemNome || 'Item';
    let clone = equiparItemSmart(personagemAtivo, itemNome, paraEquipar);

    setPersonagemAtivo(clone);

    // Persistir no Firestore
    try {
      const pRef = doc(db, "Personagens", clone.id);
      await updateDoc(pRef, clone);
    } catch (e) {
      console.error("Erro ao atualizar equipamentos no Firebase:", e);
    }

    // Enviar mensagem de ação de jogo para as 3 IAs
    const textoAcao = paraEquipar
      ? `Uso / Equipo o item ${itemNome} do meu inventário`
      : `Desequipo o item ${itemNome}`;

    enviarAcaoJogador(undefined, textoAcao);
  };

  // Lista combinada de equipamentos para exibição no painel
  const getEquipadosListaCombined = () => {
    const equipados = Array.isArray(personagemAtivo?.equipamentos) ? [...personagemAtivo.equipamentos] : [];
    const inv = Array.isArray(personagemAtivo?.inventario) ? personagemAtivo.inventario : [];

    inv.forEach((item: any) => {
      if (item.equipado) {
        const nomeInv = item.nome || item.itemNome || '';
        const jaExiste = equipados.some((eq: any) => (eq.nome || eq.itemNome || '').toLowerCase() === nomeInv.toLowerCase());
        if (!jaExiste && nomeInv) {
          equipados.push({
            nome: nomeInv,
            bonusDef: extrairBonusItem(item),
            tipo: item.tipo || item.categoria || 'Equipamento',
            desc: item.desc || item.descricao || '',
          });
        }
      }
    });

    return equipados;
  };

  // Enviar Ação do Jogador
  const enviarAcaoJogador = async (e?: React.FormEvent, textoCustomizado?: string) => {
    if (e) e.preventDefault();
    const textoAcao = (textoCustomizado || inputAcao).trim();
    if (!textoAcao || carregandoResposta) return;

    setInputAcao('');

    const msgJogador: Message = {
      id: Date.now().toString(),
      autor: 'jogador',
      texto: textoAcao,
      dataHora: new Date().toLocaleTimeString(),
    };

    const historicoAtualizado = [...mensagensJogo, msgJogador];
    setMensagensJogo(historicoAtualizado);
    setCarregandoResposta(true);

    try {
      let registrosSistema: any[] = [];
      try {
        const sisNome = campanhaAtiva?.sistema || 'Tormenta20';
        const snapRacas = await getDocs(collection(db, sisNome, 'Raças', 'Registros'));
        snapRacas.forEach((d) => registrosSistema.push({ id: d.id, categoria: 'Raça', ...d.data() }));

        const snapRegras = await getDocs(collection(db, sisNome, 'Regras e Mecânicas', 'Registros'));
        snapRegras.forEach((d) => registrosSistema.push({ id: d.id, categoria: 'Regra', ...d.data() }));
      } catch (err) {
        console.warn('Registros do sistema não carregados:', err);
      }

      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campanhaId: campanhaAtiva?.id,
          campanhaNome: campanhaAtiva?.nome || 'Campanha Desconhecida',
          sistemaRPG: campanhaAtiva?.sistema || 'Tormenta20',
          mensagemJogador: textoAcao,
          modoRapido: modoRapido,
          focoNarrativo: focoNarrativo,
          fichaJogador: personagemAtivo || {},
          npcsPresentes: [],
          historicoMensagens: historicoAtualizado.map((m) => ({ autor: m.autor, texto: m.texto })),
          registrosSistema,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const novasMsgsIa: Message[] = [];

        if (data.iris?.narracao && data.iris.narracao.trim() !== '') {
          novasMsgsIa.push({
            id: (Date.now() + 1).toString(),
            autor: 'iris',
            texto: data.iris.narracao,
            notaMediador: data.aurora?.notaMediação || undefined,
            acoesExecutora: data.executora?.acoesAgendadas || undefined,
            dataHora: new Date().toLocaleTimeString(),
          });
        } else if (data.aurora?.notaMediação && data.aurora.notaMediação.trim() !== '') {
          novasMsgsIa.push({
            id: (Date.now() + 1).toString(),
            autor: 'aurora',
            texto: data.aurora.notaMediação,
            acoesExecutora: data.executora?.acoesAgendadas || undefined,
            dataHora: new Date().toLocaleTimeString(),
          });
        }

        const historicoComIa = [...historicoAtualizado, ...novasMsgsIa];
        setMensagensJogo(historicoComIa);

        let clonePersonagem = personagemAtivo ? { ...personagemAtivo } : null;

        // Processar mutações da IA EXECUTORA
        if (data.executora?.acoesAgendadas && data.executora.acoesAgendadas.length > 0 && clonePersonagem?.id) {
          let teveAlteracao = false;

          for (const acao of data.executora.acoesAgendadas) {
            if (acao.tipoAcao === 'equipar_item' && acao.itemNome) {
              clonePersonagem = equiparItemSmart(clonePersonagem, acao.itemNome, true);
              teveAlteracao = true;
            } else if (acao.tipoAcao === 'desequipar_item' && acao.itemNome) {
              clonePersonagem = equiparItemSmart(clonePersonagem, acao.itemNome, false);
              teveAlteracao = true;
            } else if (acao.tipoAcao === 'modificar_defesa' && typeof acao.valorNumerico === 'number') {
              const defAtual = parseInt(clonePersonagem.defesaTotal || '10') || 10;
              clonePersonagem.defesaTotal = String(defAtual + acao.valorNumerico);
              clonePersonagem.defesa = clonePersonagem.defesaTotal;
              teveAlteracao = true;
            } else if (acao.tipoAcao === 'modificar_ouro' && typeof acao.valorNumerico === 'number') {
              const atual = parseInt(clonePersonagem.tibares || '0') || 0;
              clonePersonagem.tibares = Math.max(0, atual + acao.valorNumerico).toString();
              teveAlteracao = true;
            } else if ((acao.tipoAcao === 'modificar_hp' || acao.tipoAcao === 'modificar_pv') && typeof acao.valorNumerico === 'number') {
              const atual = parseInt(clonePersonagem.pvAtual || clonePersonagem.hpAtual || '10') || 10;
              const maxVal = parseInt(clonePersonagem.pvMax || clonePersonagem.hpMax || '10') || 10;
              const novoVal = Math.min(maxVal, Math.max(0, atual + acao.valorNumerico)).toString();
              clonePersonagem.pvAtual = novoVal;
              clonePersonagem.hpAtual = novoVal;
              teveAlteracao = true;
            } else if (acao.tipoAcao === 'modificar_pm' && typeof acao.valorNumerico === 'number') {
              const atual = parseInt(clonePersonagem.pmAtual || '5') || 5;
              const maxVal = parseInt(clonePersonagem.pmMax || '5') || 5;
              clonePersonagem.pmAtual = Math.min(maxVal, Math.max(0, atual + acao.valorNumerico)).toString();
              teveAlteracao = true;
            }
          }

          if (teveAlteracao) {
            setPersonagemAtivo(clonePersonagem);
          }
        }

        // Auto-save automático ao término da rodada
        await autoSalvarCampanhaEHistorico(historicoComIa, clonePersonagem, episodioAtual);
      } else {
        setMensagensJogo((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            autor: 'aurora',
            texto: `[Falha de Mediação]: ${data.error || 'Erro ao processar jogada.'}`,
            dataHora: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      setMensagensJogo((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          autor: 'aurora',
          texto: `[Erro de Conexão]: ${err.message || 'Erro ao comunicar com as IAs.'}`,
          dataHora: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setCarregandoResposta(false);
    }
  };

  // Preparar listas de inventário, habilidades e ataques para o painel
  const inventarioLista: any[] = Array.isArray(personagemAtivo?.inventario) ? personagemAtivo.inventario : [];
  const equipadosCombinados: any[] = getEquipadosListaCombined();
  const habilidadesLista: any[] = Array.isArray(personagemAtivo?.textosDinamicos) ? personagemAtivo.textosDinamicos : [];
  const ataquesLista: any[] = Array.isArray(personagemAtivo?.ataques) ? personagemAtivo.ataques : [];

  return (
    <section id="secao-tela-jogo" className="hidden flex flex-col h-[calc(100vh-4rem)] p-2 sm:p-4 max-w-[1600px] mx-auto w-full relative overflow-hidden">
      
      {/* 1. BARRA DE STATUS E CABEÇALHO DA GAMEPLAY (STATUS BAR MANTER VISÍVEL) */}
      <div className="bg-slate-900/95 border border-slate-800 p-2.5 sm:p-3 rounded-lg flex flex-col gap-2.5 mb-3 backdrop-blur-md shadow-lg z-10">
        
        {/* Linha Principal Sempre Visível: Ficha, Herói, Status Bar (PV/PM/T$/Def) e Toggles de Retração */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          {/* Esquerda: Ficha & Herói */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setDrawerFichaAberto(true)}
              className="px-3 py-1.5 bg-violet-900 hover:bg-violet-800 text-violet-100 font-bold rounded border border-violet-700 text-xs transition-all flex items-center gap-1.5 shadow"
            >
              📋 Ficha do Personagem
            </button>

            <div className="flex items-center gap-1.5 text-xs font-semibold bg-black/60 px-2.5 py-1.5 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">👤 Herói:</span>
              <span className="text-slate-200">{personagemAtivo?.nome || 'Herói'}</span>
              <span className="text-slate-500 text-[10px]">(Nível {personagemAtivo?.niveltotal || 1})</span>
            </div>
          </div>

          {/* Centro: BARRA DE STATUS DO PERSONAGEM (PV / PM / T$ / DEF) - MANTER VISÍVEL SEMPRE */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono bg-black/80 px-3 py-1.5 rounded border border-slate-700 shadow-inner flex-wrap">
            <span className="text-red-400 font-bold flex items-center gap-1">
              ❤️ PV: {getPvAtual()}/{getPvMax()}
            </span>
            <span className="text-blue-400 font-bold flex items-center gap-1">
              💧 PM: {getPmAtual()}/{getPmMax()}
            </span>
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              🪙 T$: {personagemAtivo?.tibares || 0}
            </span>
            <span className="text-slate-300 font-bold flex items-center gap-1">
              🛡️ Def: {formatDefesa()}
            </span>
          </div>

          {/* Direita: Botões para Retrair/Expandir Opções do Topo e Painel Lateral */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setControlesTopoAberto(!controlesTopoAberto)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 flex items-center gap-1 transition-colors"
              title="Expandir / Retrair controles avançados do topo (Episódio, Foco, Voz)"
            >
              ⚙️ Opções {controlesTopoAberto ? '▲' : '▼'}
            </button>

            <button
              onClick={() => setPainelDireitaAberto(!painelDireitaAberto)}
              className="px-3 py-1.5 bg-violet-950 hover:bg-violet-900 text-violet-200 text-xs font-bold rounded border border-violet-800 flex items-center gap-1 transition-colors shadow"
              title="Expandir / Retrair Painel de Controle Lateral"
            >
              🎒 Painel {painelDireitaAberto ? '◀' : '▶'}
            </button>
          </div>
        </div>

        {/* Linha Secundária Retrátil: Opções Expandidas (Episódio, Auto-save, Foco, Respostas Rápidas, Voz) */}
        {controlesTopoAberto && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs animate-fadeIn">
            {/* Campanha */}
            <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-violet-400 font-bold">📍 Campanha:</span>
              <span className="text-slate-200">{campanhaAtiva?.nome || 'Campanha Ativa'}</span>
              <span className="text-slate-500 text-[10px]">({campanhaAtiva?.sistema || 'Tormenta20'})</span>
            </div>

            {/* Seletor & Gestor de Episódios */}
            <div className="flex items-center gap-1.5 bg-violet-950/50 px-2.5 py-1 rounded border border-violet-800/80">
              <span className="text-violet-300 font-bold">🎬 Episódio {episodioAtual}</span>
              <button
                onClick={avançarEpisodio}
                className="ml-1 px-2 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-[10px] font-bold rounded border border-emerald-700 transition-colors shadow"
                title="Salva o episódio atual e avança para a próxima etapa da história"
              >
                + Novo Episódio
              </button>
            </div>

            {/* Badge de Auto-Save */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{autoSalvoStatus}</span>
            </div>

            {/* Selector de Foco Narrativo */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-cyan-400 font-bold">👁️ Foco:</span>
              <select
                value={focoNarrativo}
                onChange={(e) => setFocoNarrativo(e.target.value)}
                className="bg-black text-slate-200 text-xs font-bold rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer hover:border-cyan-500"
              >
                <option value="3ª Pessoa (Onisciente)">3ª Pessoa (Onisciente)</option>
                <option value="1ª Pessoa (Passado - Memórias)">1ª Pessoa (Passado)</option>
                <option value="1ª Pessoa (Presente - Tempo Real)">1ª Pessoa (Presente)</option>
              </select>
            </div>

            {/* Toggle de Respostas Rápidas */}
            <button
              onClick={() => setModoRapido(!modoRapido)}
              className={`px-2.5 py-1 font-bold rounded border transition-all flex items-center gap-1.5 shadow ${
                modoRapido
                  ? 'bg-amber-500 text-black border-amber-300 font-extrabold shadow-amber-500/30'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-amber-300'
              }`}
              title="Ativa o modo de respostas ultra-rápidas das IAs"
            >
              ⚡ Respostas Rápidas: {modoRapido ? 'ON' : 'OFF'}
            </button>

            {/* Seletor do Motor de Voz (ElevenLabs desabilitado por enquanto) */}
            <button
              onClick={() => {
                if (motorVoz === 'gemini') setMotorVoz('local');
                else setMotorVoz('gemini');
              }}
              className={`px-2.5 py-1 font-bold rounded border transition-all flex items-center gap-1.5 shadow ${
                motorVoz === 'gemini'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-violet-400 font-extrabold shadow-violet-600/30 hover:brightness-110'
                  : motorVoz === 'local'
                  ? 'bg-slate-900 text-slate-300 border-slate-700 hover:border-violet-500/50 hover:text-violet-300'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800 line-through'
              }`}
              title="Voz ElevenLabs desabilitada por enquanto. Alternando entre Gemini HD e Navegador Local."
            >
              {motorVoz === 'gemini'
                ? `🎙️ Voz Gemini HD (${vozIrisGemini}/${vozAuroraGemini})`
                : motorVoz === 'local'
                ? '🔊 Voz Navegador Local'
                : '✨ ElevenLabs (Desabilitado)'}
            </button>

            {/* Seletores de Vozes Gemini para Íris e Aurora */}
            {motorVoz === 'gemini' && (
              <>
                <div className="flex items-center gap-1.5 bg-violet-950/60 px-2.5 py-1 rounded border border-violet-800/80">
                  <span className="text-violet-300 font-bold">🎙️ Íris:</span>
                  <select
                    value={vozIrisGemini}
                    onChange={(e) => setVozIrisGemini(e.target.value)}
                    className="bg-black text-violet-200 text-xs font-bold rounded px-1.5 py-0.5 border border-violet-700 outline-none cursor-pointer hover:border-violet-400"
                  >
                    <option value="Lyra">Lyra (Gemini)</option>
                    <option value="Despina">Despina (Gemini)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/80">
                  <span className="text-emerald-300 font-bold">🎙️ Aurora:</span>
                  <select
                    value={vozAuroraGemini}
                    onChange={(e) => setVozAuroraGemini(e.target.value)}
                    className="bg-black text-emerald-200 text-xs font-bold rounded px-1.5 py-0.5 border border-emerald-700 outline-none cursor-pointer hover:border-emerald-400"
                  >
                    <option value="Ursa">Ursa (Gemini)</option>
                    <option value="Kore">Kore (Gemini)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. CORPO PRINCIPAL (CHAT + PAINEL DE CONTROLE) */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden relative">
        
        {/* ÁREA CENTRAL: JANELA DE CHAT E INTERAÇÃO DAS 3 IAs */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/80 border border-slate-800 rounded-lg p-3 sm:p-4 overflow-hidden shadow-inner">
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1 mb-3">
            {mensagensJogo.map((msg) => {
              const isIris = msg.autor === 'iris';
              const isAurora = msg.autor === 'aurora';
              const isExecutora = msg.autor === 'executora';
              const isJogador = msg.autor === 'jogador';
              const isSistema = msg.autor === 'sistema';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 p-3.5 rounded-lg border max-w-4xl shadow-md ${
                    isJogador
                      ? 'self-end bg-violet-950/60 border-violet-800/80 text-violet-100'
                      : isIris
                      ? 'self-start bg-violet-950/40 border-violet-800/80 text-violet-100'
                      : isAurora
                      ? 'self-start bg-emerald-950/40 border-emerald-800/80 text-emerald-100'
                      : isExecutora
                      ? 'self-start bg-slate-900/90 border-slate-700 text-slate-300'
                      : 'self-center bg-amber-950/40 border-amber-800/60 text-amber-200 text-xs font-mono'
                  }`}
                >
                  {/* Cabeçalho da Mensagem */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-0.5">
                    <div className="flex items-center gap-2">
                      {isIris && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-violet-500/80 shadow-md shadow-violet-900/50 flex-shrink-0 bg-violet-950">
                          <img src={AVATAR_IRIS} alt="Íris" className="w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      {isAurora && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-500/80 shadow-md shadow-emerald-900/50 flex-shrink-0 bg-emerald-950">
                          <img src={AVATAR_AURORA} alt="Aurora" className="w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
                        </div>
                      )}

                      {isJogador && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider border ${getPatenteColorClass(userProfile.patente)}`}>
                          {userProfile.patente}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isJogador
                            ? 'text-violet-300'
                            : isIris
                            ? 'text-violet-400'
                            : isAurora
                            ? 'text-emerald-400'
                            : isExecutora
                            ? 'text-slate-300'
                            : 'text-amber-400'
                        }`}
                      >
                        {isJogador
                          ? `👤 ${personagemAtivo?.nome || userProfile.nomeJogador || 'Jogador'}`
                          : isIris
                          ? '🔮 Íris (IA Narratora)'
                          : isAurora
                          ? '⚖️ Aurora (IA Mediadora)'
                          : isExecutora
                          ? '⚙️ Executora (Gerenciamento)'
                          : '🎲 Rolagem / Sistema'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão de Leitura em Voz Alta (TTS) para Íris e Aurora */}
                      {(isIris || isAurora) && (
                        <button
                          onClick={() => falarTexto(msg.id, msg.texto, msg.autor)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors flex items-center gap-1 opacity-80 ${
                            isIris
                              ? 'bg-violet-950/80 text-violet-300 border-violet-800'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          }`}
                          title="Vozes em IA desativadas temporariamente para manutenção dos modelos."
                        >
                          🔒 Voz (Manutenção)
                        </button>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{msg.dataHora}</span>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.texto}</p>

                  {/* Bloco de Mediação por Aurora (Verde Fosco) */}
                  {msg.notaMediador && (
                    <div className="mt-2 p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded text-xs text-emerald-200 flex flex-col gap-1 shadow">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 flex items-center gap-2">
                          <img src={AVATAR_AURORA} alt="Aurora" className="w-5 h-5 rounded-full border border-emerald-500/80 inline-block object-cover" referrerPolicy="no-referrer" />
                          ⚖️ Mediação &amp; Validação de Regras (Aurora):
                        </span>
                        <button
                          onClick={() => falarTexto(`${msg.id}-nota`, msg.notaMediador || '', 'aurora')}
                          disabled={carregandoAudioId === `${msg.id}-nota`}
                          className="px-1.5 py-0.5 bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-[9px] font-bold rounded flex items-center gap-1"
                          title="Ouvir nota da Aurora (Voz Kore - Gemini HD)"
                        >
                          {carregandoAudioId === `${msg.id}-nota`
                            ? '⏳ Gerando...'
                            : falandoMensagemId === `${msg.id}-nota`
                            ? '⏹️ Parar'
                            : '🎙️ Ouvir (Kore)'}
                        </button>
                      </div>
                      <span>{msg.notaMediador}</span>
                    </div>
                  )}

                  {/* Bloco de Execução por Executora (Cinza Claro) */}
                  {msg.acoesExecutora && msg.acoesExecutora.length > 0 && (
                    <div className="mt-2 p-2.5 bg-slate-900/95 border border-slate-700 rounded text-xs text-slate-300 flex flex-col gap-1 shadow">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        ⚙️ Alterações Efetuadas na Ficha (Executora):
                      </span>
                      {msg.acoesExecutora.map((act, i) => (
                        <div key={i} className="font-mono text-[11px] text-slate-300">
                          • {act.descricao} ({act.tipoAcao})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {carregandoResposta && (
              <div className="self-start p-3 bg-violet-950/30 border border-violet-800/60 rounded-lg text-xs text-violet-300 italic flex items-center gap-2 shadow">
                <span className="animate-spin">🔮</span> Íris narrando, Aurora validando regras e Executora aplicando fichas...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Console de Envio do Jogador */}
          <div className="flex flex-col gap-1.5">
            <form onSubmit={(e) => enviarAcaoJogador(e)} className="flex gap-2">
              <input
                type="text"
                value={inputAcao}
                onChange={(e) => setInputAcao(e.target.value)}
                placeholder="Descreva a ação ou pergunto à Aurora (Ex: '- Olá aventureiros', '// Aurora resumo da minha raça')..."
                className="flex-1 p-3 bg-black border border-slate-800 text-slate-200 text-sm rounded-lg focus:outline-none focus:border-violet-500 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setMostrarDicasFormatacao(!mostrarDicasFormatacao)}
                className={`px-3.5 py-3 rounded-lg border font-bold text-xs transition-all flex items-center justify-center shadow ${
                  mostrarDicasFormatacao
                    ? 'bg-violet-900 border-violet-500 text-violet-200 shadow-violet-900/40'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
                title="Dicas e Sintaxe de Formatação (- Fala, ~ Sussurro, () Pensamento, // Aurora)"
              >
                ❓
              </button>
              <button
                type="submit"
                disabled={carregandoResposta || !inputAcao.trim()}
                className="px-5 py-3 bg-violet-800 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg border border-violet-600 transition-colors uppercase tracking-wider text-xs shadow-lg flex items-center gap-1"
              >
                Enviar ➔
              </button>
            </form>

            {/* Legenda de Sinais de Input do Jogador (Retrátil via Botão ?) */}
            {mostrarDicasFormatacao && (
              <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono px-2 py-1.5 bg-black/80 rounded-lg border border-slate-800/80 animate-fadeIn shadow-inner">
                <span className="bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                  <strong className="text-violet-400">- / — / &quot;...&quot;</strong> = Fala ON
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                  <strong className="text-violet-400">~</strong> = Sussurro ON
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                  <strong className="text-violet-400">(...)</strong> = Pensamento
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                  <strong className="text-emerald-400">/ / // / || / Aurora...</strong> = Fala OFF / Pergunta p/ Aurora
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3. PAINEL DE CONTROLE DO LADO DIREITO (RETRÁTIL) */}
        {painelDireitaAberto && (
          <aside className="w-full lg:w-80 xl:w-96 min-w-[300px] bg-slate-900/95 border border-slate-800 rounded-lg p-3 flex flex-col gap-3 backdrop-blur-md shadow-xl overflow-hidden animate-fadeIn">
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

                {/* Inventário Completo (Distinguindo Consumíveis x Equipamentos) */}
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
                                onClick={() => setInputAcao(`Uso o item ${nomeInv} do meu inventário`)}
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
                      .filter((h) => !filtroHabilidades || (h.titulo || '').toLowerCase().includes(filtroHabilidades.toLowerCase()))
                      .map((hab, i) => (
                        <div key={i} className="p-2.5 bg-black border border-slate-800 rounded flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-violet-300">{hab.titulo || hab.nome || `Habilidade ${i+1}`}</span>
                            <button
                              onClick={() => setInputAcao(`Ativo a habilidade ${hab.titulo || hab.nome}`)}
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
                            onClick={() => setInputAcao(`Ataco com ${atk.nome} (Ataque ${atk.teste}, Dano ${atk.dano})`)}
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

      {/* 4. DRAWER / MENU OCULTO DA FICHA DO PERSONAGEM (DO LADO ESQUERDO) */}
      {drawerFichaAberto && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fundo escuro overlay */}
          <div
            onClick={() => setDrawerFichaAberto(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Conteúdo do Menu Deslizante na Esquerda */}
          <div className="relative z-10 w-full sm:w-[480px] bg-slate-900 border-r border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto shadow-2xl text-slate-200">
            
            {/* Header da Ficha */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-violet-400">{personagemAtivo?.nome || 'Ficha do Personagem'}</h2>
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

            {/* Mensagem de sucesso de salvamento */}
            {mensagemSucessoSalvar && (
              <div className="p-2 bg-emerald-950 border border-emerald-700 rounded text-xs text-emerald-300 font-bold text-center">
                {mensagemSucessoSalvar}
              </div>
            )}

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

            {/* Botão de Ação para Salvar Alterações na Ficha */}
            <button
              onClick={salvarFichaCompleta}
              disabled={salvandoFicha}
              className="mt-auto py-3 bg-violet-800 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded border border-violet-600 transition-colors uppercase tracking-wider text-xs shadow-xl flex items-center justify-center gap-2"
            >
              {salvandoFicha ? 'Salvando no Banco...' : '💾 Salvar Alterações da Ficha'}
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
