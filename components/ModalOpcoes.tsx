'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getStoredUserProfile, saveUserProfile, PatenteType, getPatenteColorClass, isZaneUser } from '@/lib/patentes';

interface ModalOpcoesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalOpcoes({ isOpen, onClose }: ModalOpcoesProps) {
  const { user } = useAuth();
  const [nomeJogador, setNomeJogador] = useState('');
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState('');
  const [chatStorageType, setChatStorageType] = useState<'local' | 'cache'>('local');
  const [enterEnviaTexto, setEnterEnviaTexto] = useState(true);
  const [patente, setPatente] = useState<PatenteType>('Jogador');
  const [salvoFeedback, setSalvoFeedback] = useState(false);

  // Estados para gerenciamento de patentes por Zane/ADM
  const [buscaEmail, setBuscaEmail] = useState('');
  const [patenteAtribuir, setPatenteAtribuir] = useState<PatenteType>('ADM');
  const [feedbackPatente, setFeedbackPatente] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const profile = getStoredUserProfile(user?.email, user?.displayName, user?.photoURL);
        setNomeJogador(profile.nomeJogador);
        setFotoPerfilUrl(profile.fotoPerfilUrl);
        setChatStorageType(profile.chatStorageType || 'local');
        setEnterEnviaTexto(profile.enterEnviaTexto !== false);
        setPatente(profile.patente);
        setSalvoFeedback(false);
        setFeedbackPatente('');
      }, 0);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserProfile({
      nomeJogador: nomeJogador.trim(),
      fotoPerfilUrl: fotoPerfilUrl.trim(),
      chatStorageType,
      enterEnviaTexto,
    });
    setSalvoFeedback(true);
    setTimeout(() => {
      setSalvoFeedback(false);
      onClose();
    }, 1200);
  };

  const isOwner = isZaneUser(user?.email) || patente === 'Owner' || (patente as string) === 'Zane';
  const isADM = isOwner || patente === 'ADM';

  const handleAtribuirPatenteOutro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buscaEmail.trim()) return;

    // Salvar atribuição de patente simulada localmente / no banco
    const targetEmail = buscaEmail.trim().toLowerCase();
    
    // Se tentar alterar a patente do Owner
    if (targetEmail === 'lukeperseu@gmail.com' && patenteAtribuir !== 'Owner') {
      setFeedbackPatente('❌ Não é possível alterar a patente soberana do Owner.');
      return;
    }

    // Salvar na memória de patentes globais local
    let patentesMap: Record<string, string> = {};
    try {
      const rawMap = localStorage.getItem('cosmic_patentes_map');
      if (rawMap) patentesMap = JSON.parse(rawMap);
    } catch (e) {
      patentesMap = {};
    }
    patentesMap[targetEmail] = patenteAtribuir;
    localStorage.setItem('cosmic_patentes_map', JSON.stringify(patentesMap));

    setFeedbackPatente(`✅ Patente "${patenteAtribuir}" atribuída com sucesso para ${targetEmail}!`);
    setBuscaEmail('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-950 border border-violet-600/70 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-violet-500/30">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-slate-950 p-4 border-b border-violet-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-900/60 border border-violet-500 flex items-center justify-center text-lg shadow-inner">
              ⚙️
            </div>
            <div>
              <h3 className="text-sm font-bold text-violet-200 uppercase tracking-wider">
                Opções do Sistema &amp; Perfil
              </h3>
              <p className="text-[10px] text-slate-400">
                Personalize seu nome, foto e preferências de armazenamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 font-bold transition-colors flex items-center justify-center border border-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Form de Opções */}
        <form onSubmit={handleSalvar} className="p-5 overflow-y-auto space-y-6 text-xs text-slate-200">
          
          {/* Card de Preview do Perfil */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="relative">
              {fotoPerfilUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fotoPerfilUrl}
                  alt="Perfil"
                  className="w-14 h-14 rounded-full object-cover border-2 border-violet-500 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-violet-950 border-2 border-violet-500 flex items-center justify-center font-bold text-lg text-violet-200 shadow-md">
                  {(nomeJogador || 'A').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-100 truncate">
                  {nomeJogador || 'Aventureiro Sem Nome'}
                </span>
                {/* Red Patente Tag */}
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border shadow-sm ${getPatenteColorClass(patente)}`}>
                  {patente}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono truncate">
                {user?.email || 'Navegador Local'}
              </span>
            </div>
          </div>

          {/* Nome do Jogador */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider">
              👤 Nome de Jogador / Perfil
            </label>
            <p className="text-[11px] text-slate-400">
              Este nome será exibido nas campanhas, chats e preencherá automaticamente o campo de criador na ficha de novos personagens.
            </p>
            <input
              type="text"
              value={nomeJogador}
              onChange={(e) => setNomeJogador(e.target.value)}
              placeholder="Ex: Luke Perseus, Mestre Zane..."
              className="w-full p-3 bg-black border border-slate-800 focus:border-violet-500 rounded-lg text-slate-200 outline-none transition-colors"
            />
          </div>

          {/* URL da Foto de Perfil */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider">
              🖼️ Link da Foto de Perfil (URL)
            </label>
            <p className="text-[11px] text-slate-400">
              Insira a URL direta de uma imagem para o seu avatar (Ex: Imgur, Discord, Web).
            </p>
            <input
              type="url"
              value={fotoPerfilUrl}
              onChange={(e) => setFotoPerfilUrl(e.target.value)}
              placeholder="https://exemplo.com/minha-foto.png"
              className="w-full p-3 bg-black border border-slate-800 focus:border-violet-500 rounded-lg text-slate-200 outline-none transition-colors"
            />
          </div>

          {/* Configuração de Envio com Enter */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider">
              ⌨️ Comportamento da Tecla Enter nos Chats
            </label>
            <p className="text-[11px] text-slate-400">
              Escolha se a tecla Enter envia a mensagem diretamente ou se pula linha.
            </p>
            <label className="flex items-center gap-3 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={enterEnviaTexto}
                onChange={(e) => setEnterEnviaTexto(e.target.checked)}
                className="w-4 h-4 accent-violet-500 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-200">
                Pressionar <span className="font-mono text-violet-300">Enter</span> envia o texto diretamente (Use <span className="font-mono text-slate-400">Shift + Enter</span> para nova linha)
              </span>
            </label>
          </div>

          {/* Configuração do Chat Global */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-cyan-300 uppercase tracking-wider">
              💾 Armazenamento de Mensagens do Chat Global
            </label>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Decida onde as conversas e mídias enviadas no Chat Global ficarão armazenadas no seu dispositivo.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                  chatStorageType === 'local'
                    ? 'bg-violet-950/80 border-violet-500 text-violet-200 shadow'
                    : 'bg-black/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="chatStorage"
                    checked={chatStorageType === 'local'}
                    onChange={() => setChatStorageType('local')}
                    className="accent-violet-500"
                  />
                  <span className="font-bold text-xs">Memória Local</span>
                </div>
                <span className="text-[10px] text-slate-400 pl-5">
                  Salva no localStorage do navegador. As mensagens persistem entre sessões.
                </span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                  chatStorageType === 'cache'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow'
                    : 'bg-black/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="chatStorage"
                    checked={chatStorageType === 'cache'}
                    onChange={() => setChatStorageType('cache')}
                    className="accent-cyan-500"
                  />
                  <span className="font-bold text-xs">Memória Cache</span>
                </div>
                <span className="text-[10px] text-slate-400 pl-5">
                  Salva no cache/sessionStorage. Apagado ao limpar o histórico do navegador.
                </span>
              </label>
            </div>
          </div>

          {/* Gerenciamento de Patentes (Apenas Owner ou ADM) */}
          {isADM && (
            <div className="p-4 bg-red-950/30 border border-red-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-red-900/60 pb-2">
                <span className="font-bold text-xs text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  👑 Atribuir Patentes do Sistema
                </span>
                <span className="text-[10px] bg-red-900 text-red-200 px-2 py-0.5 rounded font-bold">
                  {isOwner ? 'Acesso Total Owner' : 'Acesso ADM'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Atribua patentes especiais (ADM, Staffer, Devs, Scouter) indicando o e-mail do usuário.
              </p>

              <div className="space-y-2">
                <input
                  type="email"
                  value={buscaEmail}
                  onChange={(e) => setBuscaEmail(e.target.value)}
                  placeholder="E-mail do usuário (Ex: jogador@gmail.com)"
                  className="w-full p-2.5 bg-black border border-slate-800 focus:border-red-500 rounded-lg text-slate-200 outline-none text-xs"
                />

                <div className="flex gap-2">
                  <select
                    value={patenteAtribuir}
                    onChange={(e) => setPatenteAtribuir(e.target.value as PatenteType)}
                    className="flex-1 p-2.5 bg-black border border-slate-800 focus:border-red-500 rounded-lg text-slate-200 outline-none text-xs font-semibold"
                  >
                    <option value="ADM">ADM</option>
                    <option value="Staffer">Staffer</option>
                    <option value="Life Dev">Dev: Life Dev</option>
                    <option value="Mission Dev">Dev: Mission Dev</option>
                    <option value="RPG Dev">Dev: RPG Dev</option>
                    <option value="Monster Dev">Dev: Monster Dev</option>
                    <option value="Hefestus Dev">Dev: Hefestus Dev</option>
                    <option value="World Dev">Dev: World Dev</option>
                    <option value="Scouter">Scouter</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAtribuirPatenteOutro}
                    className="px-4 py-2.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors shadow"
                  >
                    Atribuir Tag
                  </button>
                </div>

                {feedbackPatente && (
                  <p className="text-[11px] font-semibold text-amber-300 pt-1">
                    {feedbackPatente}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botão de Salvar */}
          <div className="flex items-center justify-between pt-2">
            {salvoFeedback ? (
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                ✅ Opções salvas com sucesso!
              </span>
            ) : (
              <span className="text-slate-500 text-[11px]">
                As alterações do perfil entram em vigor imediatamente.
              </span>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-violet-900/50"
            >
              Salvar Alterações
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
