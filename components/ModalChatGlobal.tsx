'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getStoredUserProfile, getPatenteColorClass, PatenteType, saveUserProfile, UserProfileData } from '@/lib/patentes';
import { processarRolagensComandos } from '@/lib/diceUtils';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

interface StickerItem {
  id: string;
  url: string;
  nome: string;
  animada: boolean;
}

interface GlobalChatMessage {
  id: string;
  autorNome: string;
  autorEmail: string;
  autorFoto: string;
  patente: PatenteType;
  texto?: string;
  midiaUrl?: string;
  midiaTipo?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  midiaNome?: string;
  dataHora: string;
}

function generateChatId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ModalChatGlobalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalChatGlobal({ isOpen, onClose }: ModalChatGlobalProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData>(() => ({
    nomeJogador: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aventureiro'),
    fotoPerfilUrl: user?.photoURL || '',
    patente: user?.email === 'lukeperseu@gmail.com' ? 'Owner' : 'Jogador',
    chatStorageType: 'local',
    enterEnviaTexto: true,
  }));

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(getStoredUserProfile(user?.email, user?.displayName, user?.photoURL));
    });
  }, [user, isOpen]);

  const [perguntarArmazenamento, setPerguntarArmazenamento] = useState(false);

  const [mensagens, setMensagens] = useState<GlobalChatMessage[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  
  // Carteira de Figurinhas & Gerenciamento
  const [abaFigurinhasOpen, setAbaFigurinhasOpen] = useState(false);
  const [gerenciandoFigurinhas, setGerenciandoFigurinhas] = useState(false);
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [editStickerNome, setEditStickerNome] = useState('');
  const [editStickerUrl, setEditStickerUrl] = useState('');
  const [figurinhas, setFigurinhas] = useState<StickerItem[]>([]);
  const [novaFigurinhaUrl, setNovaFigurinhaUrl] = useState('');
  const [novaFigurinhaNome, setNovaFigurinhaNome] = useState('');
  const [feedbackFigurinha, setFeedbackFigurinha] = useState('');
  const stickerFileInputRef = useRef<HTMLInputElement>(null);

  const excluirFigurinha = (id: string) => {
    const atualizadas = figurinhas.filter((s) => s.id !== id);
    setFigurinhas(atualizadas);
    localStorage.setItem('cosmic_sticker_wallet', JSON.stringify(atualizadas));
    setFeedbackFigurinha('🗑️ Figurinha removida.');
    setTimeout(() => setFeedbackFigurinha(''), 2000);
  };

  const reordenarFigurinha = (index: number, direcao: 'left' | 'right') => {
    const novoIdx = direcao === 'left' ? index - 1 : index + 1;
    if (novoIdx < 0 || novoIdx >= figurinhas.length) return;
    const copia = [...figurinhas];
    const item = copia[index];
    copia[index] = copia[novoIdx];
    copia[novoIdx] = item;
    setFigurinhas(copia);
    localStorage.setItem('cosmic_sticker_wallet', JSON.stringify(copia));
  };

  const salvarEdicaoFigurinha = (id: string) => {
    const atualizadas = figurinhas.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          nome: editStickerNome.trim() || s.nome,
          url: editStickerUrl.trim() || s.url,
        };
      }
      return s;
    });
    setFigurinhas(atualizadas);
    localStorage.setItem('cosmic_sticker_wallet', JSON.stringify(atualizadas));
    setEditingStickerId(null);
    setFeedbackFigurinha('✅ Figurinha atualizada!');
    setTimeout(() => setFeedbackFigurinha(''), 2000);
  };

  // Gravação de Áudio
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Envio de Mídia
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Iniciar listener do Firestore para ChatGlobal em tempo real
  useEffect(() => {
    if (!isOpen) return;

    // Carregar Carteira de Figurinhas
    queueMicrotask(() => {
      const figSalvas = localStorage.getItem('cosmic_sticker_wallet');
      if (figSalvas) {
        try {
          setFigurinhas(JSON.parse(figSalvas));
        } catch (e) {
          setFigurinhas([]);
        }
      } else {
        const padrao: StickerItem[] = [
          { id: 'stk-1', url: 'https://cdn-icons-png.flaticon.com/512/3408/3408545.png', nome: 'D20 Crítico', animada: false },
          { id: 'stk-2', url: 'https://cdn-icons-png.flaticon.com/512/1046/1046857.png', nome: 'Dragão Épico', animada: false },
          { id: 'stk-3', url: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png', nome: 'Mago Cósmico', animada: false },
        ];
        setFigurinhas(padrao);
        localStorage.setItem('cosmic_sticker_wallet', JSON.stringify(padrao));
      }
    });

    const q = query(
      collection(db, "ChatGlobal"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgsFirestore: GlobalChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgsFirestore.push({
          id: docSnap.id,
          autorNome: data.autorNome || 'Aventureiro',
          autorEmail: data.autorEmail || '',
          autorFoto: data.autorFoto || '',
          patente: data.patente || 'Jogador',
          texto: data.texto,
          midiaUrl: data.midiaUrl,
          midiaTipo: data.midiaTipo,
          midiaNome: data.midiaNome,
          dataHora: data.dataHora || '--:--',
        });
      });

      if (msgsFirestore.length > 0) {
        setMensagens(msgsFirestore);
      } else {
        const msgInicial: GlobalChatMessage = {
          id: 'welcome-1',
          autorNome: 'Mestre Zane',
          autorEmail: 'lukeperseu@gmail.com',
          autorFoto: 'https://i.pinimg.com/736x/58/74/38/587438345194886387.jpg',
          patente: 'Owner',
          texto: '🌌 **Bem-vindos ao Chat Global do Cosmic Storyteller!** Compartilhem experiências, mídias, figurinhas e áudios em tempo real com a comunidade.',
          dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMensagens([msgInicial]);
      }
    }, (err) => {
      console.error("Erro no listener realtime do Chat Global Firestore:", err);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Salvar mensagem no Firestore
  const salvarEMandarMensagem = async (novaMsg: GlobalChatMessage) => {
    setMensagens((prev) => [...prev, novaMsg]);
    try {
      await addDoc(collection(db, "ChatGlobal"), {
        ...novaMsg,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Erro ao enviar mensagem para o Firestore:", e);
    }
  };

  const confirmarEscolhaStorage = (escolha: 'local' | 'cache') => {
    saveUserProfile({ chatStorageType: escolha });
    setPerguntarArmazenamento(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // Enviar Texto Simples
  const handleEnviarTexto = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim()) return;

    const textoComComandos = processarRolagensComandos(inputTexto.trim());
    setInputTexto('');

    const idMsg = generateChatId('msg');
    const novaMsg: GlobalChatMessage = {
      id: idMsg,
      autorNome: profile.nomeJogador || user?.displayName || 'Aventureiro',
      autorEmail: user?.email || 'anonimo@cosmos.local',
      autorFoto: profile.fotoPerfilUrl || user?.photoURL || '',
      patente: profile.patente,
      texto: textoComComandos,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    await salvarEMandarMensagem(novaMsg);

    // Checar se menciona iris ou aurora (com ou sem @)
    const msgLower = textoComComandos.toLowerCase();
    const ehOffGame = textoComComandos.startsWith('//') || textoComComandos.startsWith('/');
    const mencionaIris = msgLower.includes('iris') || msgLower.includes('íris');
    const mencionaAurora = msgLower.includes('aurora');

    const deveResponder = mencionaIris || mencionaAurora;

    if (deveResponder) {
      try {
        const res = await fetch('/api/chatbot-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensagem: textoComComandos,
            autorNome: profile.nomeJogador || 'Aventureiro',
            mencionaIris,
            mencionaAurora,
            ehOffGame,
            origem: 'chat_global',
            historico: mensagens.slice(-6).map((m) => ({
              autor: m.autorNome,
              texto: m.texto || '',
            })),
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          const resps = data.respostas || [];
          for (let idx = 0; idx < resps.length; idx++) {
            const r = resps[idx];
            const msgIA: GlobalChatMessage = {
              id: generateChatId('ia-' + idx),
              autorNome: r.autor === 'Íris' ? '🔮 Íris (IA)' : '⚙️ Aurora (IA)',
              autorEmail: r.autor === 'Íris' ? 'iris@cosmos.local' : 'aurora@cosmos.local',
              autorFoto: r.autor === 'Íris'
                ? 'https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg'
                : 'https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg',
              patente: 'ADM',
              texto: r.texto,
              dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };
            await salvarEMandarMensagem(msgIA);
          }
        }
      } catch (err) {
        console.error('Erro na resposta da IA no Chat Global:', err);
      }
    }
  };

  // Enviar Figurinha
  const enviarFigurinha = async (stk: StickerItem) => {
    const idStk = generateChatId('stk');
    const novaMsg: GlobalChatMessage = {
      id: idStk,
      autorNome: profile.nomeJogador || user?.displayName || 'Aventureiro',
      autorEmail: user?.email || 'anonimo@cosmos.local',
      autorFoto: profile.fotoPerfilUrl || user?.photoURL || '',
      patente: profile.patente,
      midiaUrl: stk.url,
      midiaTipo: 'sticker',
      midiaNome: stk.nome,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    await salvarEMandarMensagem(novaMsg);
    setAbaFigurinhasOpen(false);
  };

  // Adicionar Figurinha por Link ou Arquivo
  const handleAdicionarFigurinhaLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaFigurinhaUrl.trim()) return;

    const isAnimada = novaFigurinhaUrl.endsWith('.gif') || novaFigurinhaUrl.endsWith('.webp');
    const nova: StickerItem = {
      id: generateChatId('stk'),
      url: novaFigurinhaUrl.trim(),
      nome: novaFigurinhaNome.trim() || 'Minha Figurinha',
      animada: isAnimada,
    };

    const atualizadas = [...figurinhas, nova];
    setFigurinhas(atualizadas);
    localStorage.setItem('cosmic_sticker_wallet', JSON.stringify(atualizadas));
    setNovaFigurinhaUrl('');
    setNovaFigurinhaNome('');
    setFeedbackFigurinha('✅ Figurinha adicionada à sua carteira!');
    setTimeout(() => setFeedbackFigurinha(''), 3000);
  };

  // Carregar Arquivo de Figurinha do Dispositivo
  const handleFileUploadFigurinha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAnimada = file.type.includes('gif') || file.name.endsWith('.webp');
    const maxKB = isAnimada ? 500 : 100;
    const maxBytes = maxKB * 1024;

    if (file.size > maxBytes) {
      alert(`⚠️ O arquivo excede o limite de ${maxKB} KB para figurinhas ${isAnimada ? 'animadas' : 'estáticas'}.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const nova: StickerItem = {
        id: generateChatId('stk'),
        url: result,
        nome: file.name.split('.')[0] || 'Figurinha',
        animada: isAnimada,
      };

      const atualizadas = [...figurinhas, nova];
      setFigurinhas(atualizadas);
      localStorage.setItem('cosmic_sticker_wallet', JSON.stringify(atualizadas));
      setFeedbackFigurinha('✅ Figurinha local gravada na sua carteira!');
      setTimeout(() => setFeedbackFigurinha(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Iniciar/Parar Gravação de Áudio
  const toggleGravacaoAudio = async () => {
    if (gravandoAudio) {
      // Parar gravação
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setGravandoAudio(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    } else {
      // Iniciar gravação
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          // Checar limite de 5MB
          if (audioBlob.size > 5 * 1024 * 1024) {
            alert('⚠️ O áudio excede o limite máximo de 5 MB.');
            return;
          }

          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Audio = e.target?.result as string;
            const novaMsg: GlobalChatMessage = {
              id: generateChatId('audio'),
              autorNome: profile.nomeJogador || user?.displayName || 'Aventureiro',
              autorEmail: user?.email || 'anonimo@cosmos.local',
              autorFoto: profile.fotoPerfilUrl || user?.photoURL || '',
              patente: profile.patente,
              midiaUrl: base64Audio,
              midiaTipo: 'audio',
              midiaNome: 'Mensagem de Áudio Gravada',
              dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };
            await salvarEMandarMensagem(novaMsg);
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setGravandoAudio(true);
        setTempoGravacao(0);

        timerIntervalRef.current = setInterval(() => {
          setTempoGravacao((prev) => {
            if (prev >= 29) {
              // Limite de 30 segundos
              toggleGravacaoAudio();
              return 30;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (err) {
        alert('⚠️ Não foi possível acessar o microfone para gravar áudio.');
      }
    }
  };

  // Enviar Arquivo de Mídia (Imagens, Vídeos, Áudios, Documentos)
  const handleMediaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let tipo: 'image' | 'video' | 'audio' | 'document' = 'document';
    let maxMB = 100;

    if (file.type.startsWith('image/')) {
      tipo = 'image';
      maxMB = 5;
    } else if (file.type.startsWith('video/')) {
      tipo = 'video';
      maxMB = 100;
    } else if (file.type.startsWith('audio/')) {
      tipo = 'audio';
      maxMB = 25;
    }

    if (file.size > maxMB * 1024 * 1024) {
      alert(`⚠️ O arquivo excede o limite de ${maxMB} MB para ${tipo}.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const novaMsg: GlobalChatMessage = {
        id: generateChatId('media'),
        autorNome: profile.nomeJogador || user?.displayName || 'Aventureiro',
        autorEmail: user?.email || 'anonimo@cosmos.local',
        autorFoto: profile.fotoPerfilUrl || user?.photoURL || '',
        patente: profile.patente,
        midiaUrl: result,
        midiaTipo: tipo,
        midiaNome: file.name,
        dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      await salvarEMandarMensagem(novaMsg);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-950 border border-violet-600/70 rounded-2xl max-w-3xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-violet-500/30">
        
        {/* Modal de Escolha de Armazenamento no Primeiro Acesso */}
        {perguntarArmazenamento ? (
          <div className="p-6 bg-slate-950 flex flex-col items-center justify-center text-center space-y-5 my-auto max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-violet-900/60 border border-violet-500 flex items-center justify-center text-3xl shadow-xl animate-bounce">
              💬
            </div>
            <div>
              <h3 className="text-lg font-bold text-violet-200">
                Onde deseja armazenar as mensagens do Chat Global?
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                As conversas e figurinhas não lotam nossos servidores. Escolha o local no seu próprio navegador:
              </p>
            </div>

            <div className="space-y-3 w-full text-left pt-2">
              <button
                onClick={() => confirmarEscolhaStorage('local')}
                className="w-full p-4 bg-slate-900 hover:bg-violet-950/80 border border-slate-800 hover:border-violet-500 rounded-xl transition-all flex flex-col gap-1 group shadow"
              >
                <span className="font-bold text-xs text-violet-300 group-hover:text-violet-200 flex items-center gap-2">
                  💾 Memória Local (localStorage)
                </span>
                <span className="text-[11px] text-slate-400">
                  As mensagens ficam salvas no seu dispositivo mesmo ao fechar a aba.
                </span>
              </button>

              <button
                onClick={() => confirmarEscolhaStorage('cache')}
                className="w-full p-4 bg-slate-900 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-500 rounded-xl transition-all flex flex-col gap-1 group shadow"
              >
                <span className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center gap-2">
                  ⚡ Memória Cache (sessionStorage)
                </span>
                <span className="text-[11px] text-slate-400">
                  As mensagens somem ao fechar a aba ou limpar o cache do navegador.
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header do Chat Global */}
            <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-cyan-950 p-3.5 border-b border-violet-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-900/80 border border-violet-500 flex items-center justify-center text-xl shadow-md">
                  🌐
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    Chat Global
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                      ● Ao Vivo
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Conexão entre Jogadores • Storage: {profile.chatStorageType === 'cache' ? 'Cache do Navegador' : 'Memória Local'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAbaFigurinhasOpen(!abaFigurinhasOpen)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    abaFigurinhasOpen
                      ? 'bg-violet-800 border-violet-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-700 text-violet-300 hover:bg-slate-800'
                  }`}
                  title="Carteira de Figurinhas"
                >
                  🎭 Figurinhas
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 font-bold transition-colors flex items-center justify-center border border-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Painel de Carteira de Figurinhas */}
            {abaFigurinhasOpen && (
              <div className="p-4 bg-slate-900/95 border-b border-violet-800/60 space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    🎴 Carteira de Figurinhas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGerenciandoFigurinhas(!gerenciandoFigurinhas)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                        gerenciandoFigurinhas
                          ? 'bg-amber-600 text-black border-amber-400'
                          : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      ⚙️ {gerenciandoFigurinhas ? 'Concluir' : 'Gerenciar'}
                    </button>
                    <button
                      onClick={() => setAbaFigurinhasOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Grid de Figurinhas */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {figurinhas.map((stk, idx) => (
                    <div
                      key={stk.id}
                      className="p-2 bg-black border border-slate-800 hover:border-violet-500 rounded-xl flex flex-col items-center gap-1 flex-shrink-0 group relative"
                    >
                      <button
                        onClick={() => !gerenciandoFigurinhas && enviarFigurinha(stk)}
                        className="flex flex-col items-center gap-1 cursor-pointer"
                        title={gerenciandoFigurinhas ? stk.nome : `Enviar: ${stk.nome}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={stk.url} alt={stk.nome} className="w-14 h-14 object-contain" />
                        <span className="text-[9px] text-slate-400 group-hover:text-violet-300 truncate max-w-[70px]">
                          {stk.nome}
                        </span>
                      </button>

                      {/* Controles de Gerenciamento */}
                      {gerenciandoFigurinhas && (
                        <div className="flex items-center gap-1 pt-1 border-t border-slate-800 w-full justify-center">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => reordenarFigurinha(idx, 'left')}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-30 text-[10px]"
                            title="Mover para esquerda"
                          >
                            ⬅️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStickerId(stk.id);
                              setEditStickerNome(stk.nome);
                              setEditStickerUrl(stk.url);
                            }}
                            className="p-1 hover:bg-slate-800 text-amber-300 rounded text-[10px]"
                            title="Editar nome/link"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirFigurinha(stk.id)}
                            className="p-1 hover:bg-slate-800 text-red-400 rounded text-[10px]"
                            title="Excluir figurinha"
                          >
                            🗑️
                          </button>
                          <button
                            type="button"
                            disabled={idx === figurinhas.length - 1}
                            onClick={() => reordenarFigurinha(idx, 'right')}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-30 text-[10px]"
                            title="Mover para direita"
                          >
                            ➡️
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Form de Edição Inline de Figurinha */}
                {editingStickerId && (
                  <div className="p-3 bg-slate-950 border border-amber-500/50 rounded-xl space-y-2">
                    <span className="font-bold text-amber-300 text-[11px] block">
                      ✏️ Editar Figurinha:
                    </span>
                    <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                      <input
                        type="text"
                        value={editStickerNome}
                        onChange={(e) => setEditStickerNome(e.target.value)}
                        placeholder="Nome..."
                        className="w-32 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                      />
                      <input
                        type="url"
                        value={editStickerUrl}
                        onChange={(e) => setEditStickerUrl(e.target.value)}
                        placeholder="URL..."
                        className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => salvarEdicaoFigurinha(editingStickerId)}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded text-xs"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStickerId(null)}
                        className="px-3 py-2 bg-slate-800 text-slate-300 rounded text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Adicionar Nova Figurinha */}
                <div className="p-3 bg-black/60 border border-slate-800 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-300 text-[11px] block">
                    ➕ Adicionar Figurinha por Link ou Arquivo Local:
                  </span>
                  <form onSubmit={handleAdicionarFigurinhaLink} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      placeholder="Nome da figurinha..."
                      value={novaFigurinhaNome}
                      onChange={(e) => setNovaFigurinhaNome(e.target.value)}
                      className="w-32 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                    />
                    <input
                      type="url"
                      placeholder="URL da imagem (PNG, GIF, WEBP)..."
                      value={novaFigurinhaUrl}
                      onChange={(e) => setNovaFigurinhaUrl(e.target.value)}
                      className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-violet-800 hover:bg-violet-700 text-white font-bold rounded text-xs"
                    >
                      Adicionar Link
                    </button>

                    <input
                      type="file"
                      ref={stickerFileInputRef}
                      onChange={handleFileUploadFigurinha}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => stickerFileInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-violet-300 font-bold rounded text-xs border border-slate-700"
                    >
                      📁 Do Dispositivo
                    </button>
                  </form>
                  {feedbackFigurinha && (
                    <p className="text-[10px] text-emerald-400 font-bold">{feedbackFigurinha}</p>
                  )}
                </div>
              </div>
            )}

            {/* Feed de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/90 text-slate-200">
              {mensagens.map((msg) => (
                <div key={msg.id} className="flex gap-3 items-start group">
                  {/* Avatar */}
                  {msg.autorFoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={msg.autorFoto}
                      alt={msg.autorNome}
                      className="w-9 h-9 rounded-full object-cover border border-violet-500/80 flex-shrink-0 shadow"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-violet-900 border border-violet-500 flex items-center justify-center font-bold text-xs text-violet-200 flex-shrink-0 shadow">
                      {msg.autorNome.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Cabeçalho da Mensagem: Nome + Red Patente Tag + Hora */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* Red Patente Tag */}
                      <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider border ${getPatenteColorClass(msg.patente)}`}>
                        {msg.patente}
                      </span>
                      <span className="font-bold text-xs text-slate-200">
                        {msg.autorNome}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {msg.dataHora}
                      </span>
                    </div>

                    {/* Conteúdo da Mensagem */}
                    <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-2xl rounded-tl-none text-xs text-slate-200 w-fit max-w-[90%] shadow space-y-2">
                      {msg.texto && <p className="leading-relaxed whitespace-pre-wrap">{msg.texto}</p>}

                      {/* Exibição de Figurinha */}
                      {msg.midiaTipo === 'sticker' && msg.midiaUrl && (
                        <div className="pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.midiaUrl} alt="Figurinha" className="w-32 h-32 object-contain" />
                        </div>
                      )}

                      {/* Exibição de Imagem */}
                      {msg.midiaTipo === 'image' && msg.midiaUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-800 max-w-sm pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.midiaUrl} alt={msg.midiaNome || 'Mídia'} className="w-full h-auto object-cover max-h-60" />
                        </div>
                      )}

                      {/* Exibição de Vídeo */}
                      {msg.midiaTipo === 'video' && msg.midiaUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-800 max-w-md pt-1">
                          <video src={msg.midiaUrl} controls className="w-full max-h-60 rounded" />
                        </div>
                      )}

                      {/* Exibição de Áudio */}
                      {msg.midiaTipo === 'audio' && msg.midiaUrl && (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] text-violet-300 font-semibold block">🔳 {msg.midiaNome || 'Áudio'}</span>
                          <audio src={msg.midiaUrl} controls className="h-8 max-w-xs" />
                        </div>
                      )}

                      {/* Exibição de Documento */}
                      {msg.midiaTipo === 'document' && msg.midiaUrl && (
                        <a
                          href={msg.midiaUrl}
                          download={msg.midiaNome || 'documento'}
                          className="flex items-center gap-2 p-2 bg-black/60 rounded border border-slate-800 text-cyan-300 hover:text-cyan-200"
                        >
                          📄 <span className="underline truncate max-w-xs">{msg.midiaNome || 'Download do Arquivo'}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Bar de Digitação e Botões de Mídia/Áudio */}
            <form onSubmit={handleEnviarTexto} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
              {/* Botão Gravar Áudio */}
              <button
                type="button"
                onClick={toggleGravacaoAudio}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center ${
                  gravandoAudio
                    ? 'bg-red-800 border-red-500 text-white animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-700'
                }`}
                title={gravandoAudio ? 'Parar Gravação' : 'Gravar Áudio (Até 30s / 5MB)'}
              >
                🔳 {gravandoAudio && <span className="ml-1 text-[10px]">{tempoGravacao}s</span>}
              </button>

              {/* Botão Enviar Mídia */}
              <input
                type="file"
                ref={mediaFileInputRef}
                onChange={handleMediaFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => mediaFileInputRef.current?.click()}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700 text-xs font-bold transition-all"
                title="Enviar Mídia (Fotos 5MB, Vídeos 100MB, Áudios 25MB, Docs 100MB)"
              >
                🎦
              </button>

              {/* Input de Texto */}
              <input
                type="text"
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (profile.enterEnviaTexto !== false) {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleEnviarTexto();
                      }
                    }
                  }
                }}
                placeholder="Digite sua mensagem (mencione Íris ou Aurora para interagir)..."
                className="flex-1 p-2.5 bg-black border border-slate-800 focus:border-violet-500 rounded-xl text-slate-200 text-xs outline-none"
              />

              <button
                type="submit"
                disabled={!inputTexto.trim()}
                className="px-5 py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md"
              >
                Enviar ➔
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
