'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getStoredUserProfile, getPatenteColorClass, UserProfileData } from '@/lib/patentes';
import { processarRolagensComandos } from '@/lib/diceUtils';

interface ChatBotMessage {
  id: string;
  autor: 'Usuario' | 'Íris' | 'Aurora';
  autorNome: string;
  autorFoto?: string;
  texto: string;
  dataHora: string;
  midiaUrl?: string;
  midiaTipo?: 'image' | 'audio' | 'video';
}

interface ModalChatBotIAProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalChatBotIA({ isOpen, onClose }: ModalChatBotIAProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData>(() => ({
    nomeJogador: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aventureiro'),
    fotoPerfilUrl: user?.photoURL || '',
    patente: 'Jogador',
    chatStorageType: 'local',
    enterEnviaTexto: true,
  }));

  const [mensagens, setMensagens] = useState<ChatBotMessage[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [preferenciasSalvas, setPreferenciasSalvas] = useState('');
  const [mostrarPreferencias, setMostrarPreferencias] = useState(false);
  const [editPrefTexto, setEditPrefTexto] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        const currentProfile = getStoredUserProfile(user?.email, user?.displayName, user?.photoURL);
        setProfile(currentProfile);

        // Carregar Histórico de Conversa com as IAs
        const msgsSalvas = localStorage.getItem('cosmic_chatbot_ia_msgs');
        if (msgsSalvas) {
          try {
            setMensagens(JSON.parse(msgsSalvas));
          } catch (e) {
            setMensagens([]);
          }
        } else {
          // Mensagens Iniciais das IAs
          const msgsIniciais: ChatBotMessage[] = [
            {
              id: 'init-iris',
              autor: 'Íris',
              autorNome: '🔮 Íris (IA Narratora)',
              autorFoto: 'https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg',
              texto: ' Saudações, nobre aventureiro(a)! Eu sou a Íris. Estou aqui para conversar, narrar ideias de campanhas e guardar seus gostos e universos favoritos nas estrelas!',
              dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            },
            {
              id: 'init-aurora',
              autor: 'Aurora',
              autorNome: '⚙️ Aurora (IA Mediadora)',
              autorFoto: 'https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg',
              texto: 'E aí... Eu sou a Aurora. Não liga para o exagero da Íris. Tô por aqui para calcular regras, ajustar mecânicas e garantir que suas ideias façam sentido no papel.',
              dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            },
          ];
          setMensagens(msgsIniciais);
          localStorage.setItem('cosmic_chatbot_ia_msgs', JSON.stringify(msgsIniciais));
        }

        // Carregar Preferências Salvas
        const prefs = localStorage.getItem('cosmic_ai_preferences') || 'Gosta de RPGs de mesa, fantasia e aventuras dinâmicas.';
        setPreferenciasSalvas(prefs);
        setEditPrefTexto(prefs);
      });
    }
  }, [isOpen, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregandoIA]);

  const salvarMensagens = (novas: ChatBotMessage[]) => {
    setMensagens(novas);
    localStorage.setItem('cosmic_chatbot_ia_msgs', JSON.stringify(novas.slice(-80)));
  };

  const handleSalvarPreferencias = () => {
    setPreferenciasSalvas(editPrefTexto);
    localStorage.setItem('cosmic_ai_preferences', editPrefTexto);
    setMostrarPreferencias(false);
  };

  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputTexto.trim() || carregandoIA) return;

    // Processa comandos #iniciativa, #furtividade, etc.
    const textoComComandos = processarRolagensComandos(inputTexto.trim());
    setInputTexto('');

    const userMsg: ChatBotMessage = {
      id: `usr-${Date.now()}`,
      autor: 'Usuario',
      autorNome: profile.nomeJogador || 'Aventureiro',
      autorFoto: profile.fotoPerfilUrl || user?.photoURL || '',
      texto: textoComComandos,
      dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const listaAtualizada = [...mensagens, userMsg];
    salvarMensagens(listaAtualizada);
    setCarregandoIA(true);

    try {
      const msgLower = textoComComandos.toLowerCase();
      const mencionaIris = msgLower.includes('iris') || msgLower.includes('íris') || (!msgLower.includes('aurora'));
      const mencionaAurora = msgLower.includes('aurora') || (!msgLower.includes('iris') && !msgLower.includes('íris'));

      const res = await fetch('/api/chatbot-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: textoComComandos,
          autorNome: profile.nomeJogador || 'Aventureiro',
          mencionaIris,
          mencionaAurora,
          ehOffGame: textoComComandos.startsWith('//') || textoComComandos.startsWith('/'),
          origem: 'chatbot_direto',
          userPreferences: preferenciasSalvas,
          historico: listaAtualizada.slice(-6).map((m) => ({
            autor: m.autorNome,
            texto: m.texto,
          })),
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const resps = data.respostas || [];
        const novasMsgsIAs: ChatBotMessage[] = resps.map((r: any, idx: number) => ({
          id: `ia-${Date.now()}-${idx}`,
          autor: r.autor === 'Íris' ? 'Íris' : 'Aurora',
          autorNome: r.autor === 'Íris' ? '🔮 Íris (IA Narratora)' : '⚙️ Aurora (IA Mediadora)',
          autorFoto: r.autor === 'Íris'
            ? 'https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg'
            : 'https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg',
          texto: r.texto,
          dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }));

        if (data.learnedPreferences) {
          setPreferenciasSalvas(data.learnedPreferences);
          localStorage.setItem('cosmic_ai_preferences', data.learnedPreferences);
        }

        salvarMensagens([...listaAtualizada, ...novasMsgsIAs]);
      }
    } catch (err) {
      console.error('Erro na resposta das IAs:', err);
    } finally {
      setCarregandoIA(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-950 border border-violet-500/60 rounded-2xl max-w-3xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-violet-500/30 animate-fadeIn">
        
        {/* Header do ChatBot IA */}
        <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 p-3.5 border-b border-violet-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg"
                alt="Íris"
                className="w-9 h-9 rounded-full object-cover border-2 border-violet-400 shadow-md ring-2 ring-violet-900"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg"
                alt="Aurora"
                className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 shadow-md ring-2 ring-emerald-900"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                🔮 Íris & ⚙️ Aurora
                <span className="text-[10px] bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-violet-800 font-mono">
                  ● Companheiras IA
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Conversa Livre • Guardam Preferências do Usuário
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarPreferencias(!mostrarPreferencias)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Memória e Preferências Aprendidas"
            >
              🧠 Memória
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 font-bold transition-colors flex items-center justify-center border border-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal de Edição de Memória / Preferências */}
        {mostrarPreferencias && (
          <div className="p-4 bg-slate-900/95 border-b border-amber-500/40 space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                🧠 Preferências Aprendidas pelas IAs
              </span>
              <button onClick={() => setMostrarPreferencias(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Íris e Aurora usam estas notas para personalizar respostas, referenciar seus estilos de jogo favoritos e lembrar suas conversas:
            </p>
            <textarea
              value={editPrefTexto}
              onChange={(e) => setEditPrefTexto(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-black border border-slate-800 focus:border-amber-500 rounded-xl text-slate-200 text-xs outline-none resize-none font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleSalvarPreferencias}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-xs"
              >
                💾 Salvar Memória
              </button>
            </div>
          </div>
        )}

        {/* Feed de Mensagens */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/90 text-slate-200">
          {mensagens.map((msg) => {
            const isUser = msg.autor === 'Usuario';
            const isIris = msg.autor === 'Íris';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Foto do Autor */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    msg.autorFoto ||
                    (isUser
                      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=User'
                      : isIris
                      ? 'https://i.pinimg.com/736x/2b/42/e0/2b42e03882798e29a997010f3c5b8b9d.jpg'
                      : 'https://i.pinimg.com/736x/8a/84/4e/8a844e1c26b9117387f3b4974f1bf538.jpg')
                  }
                  alt={msg.autorNome}
                  className={`w-8 h-8 rounded-full object-cover border shadow-sm ${
                    isUser
                      ? 'border-violet-400/80'
                      : isIris
                      ? 'border-violet-500'
                      : 'border-emerald-500'
                  }`}
                />

                <div className={`flex flex-col min-w-0 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`font-bold text-xs ${
                        isUser
                          ? 'text-violet-300'
                          : isIris
                          ? 'text-violet-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {msg.autorNome}
                    </span>
                    {isUser && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider border ${getPatenteColorClass(profile.patente)}`}>
                        {profile.patente}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 font-mono">{msg.dataHora}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed shadow ${
                      isUser
                        ? 'bg-violet-900/60 border border-violet-700/80 text-violet-100 rounded-tr-none'
                        : isIris
                        ? 'bg-slate-900/90 border border-violet-800/80 text-slate-200 rounded-tl-none ring-1 ring-violet-500/20'
                        : 'bg-slate-900/90 border border-emerald-800/80 text-slate-200 rounded-tl-none ring-1 ring-emerald-500/20'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.texto}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {carregandoIA && (
            <div className="flex gap-3 items-center text-xs text-slate-400 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-violet-950 border border-violet-500 flex items-center justify-center">
                ✨
              </div>
              <p className="font-mono text-[11px]">Íris & Aurora estão formulando resposta...</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Bar de Digitação */}
        <form onSubmit={handleEnviar} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center">
          <input
            type="text"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              profile.enterEnviaTexto !== false
                ? "Converse com Íris e Aurora (Enter envia, use #comando para rolagens)..."
                : "Converse com Íris e Aurora (Use #comando para rolagens)..."
            }
            className="flex-1 p-2.5 bg-black border border-slate-800 focus:border-violet-500 rounded-xl text-slate-200 text-xs outline-none"
          />

          <button
            type="submit"
            disabled={!inputTexto.trim() || carregandoIA}
            className="px-5 py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
          >
            Enviar ➔
          </button>
        </form>
      </div>
    </div>
  );
}
