'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import ModalAuth from './ModalAuth';
import ModalFeedback from './ModalFeedback';
import ModalOpcoes from './ModalOpcoes';
import ModalChatGlobal from './ModalChatGlobal';
import ModalChatBotIA from './ModalChatBotIA';
import { getStoredUserProfile, getPatenteColorClass, isZaneUser, UserProfileData } from '@/lib/patentes';

export default function HeaderSidebar() {
  const { user } = useAuth();
  const [modalAuthOpen, setModalAuthOpen] = useState(false);
  const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
  const [modalOpcoesOpen, setModalOpcoesOpen] = useState(false);
  const [modalChatGlobalOpen, setModalChatGlobalOpen] = useState(false);
  const [modalChatBotOpen, setModalChatBotOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfileData>(() => ({
    nomeJogador: user?.displayName || (user?.email ? user.email.split('@')[0] : 'Aventureiro'),
    fotoPerfilUrl: user?.photoURL || '',
    patente: isZaneUser(user?.email) ? 'Owner' : 'Jogador',
    chatStorageType: 'local',
    enterEnviaTexto: true,
  }));

  useEffect(() => {
    queueMicrotask(() => {
      setProfile(getStoredUserProfile(user?.email, user?.displayName, user?.photoURL));
    });

    const handleProfileUpdate = (e: any) => {
      setProfile(e.detail || getStoredUserProfile(user?.email, user?.displayName, user?.photoURL));
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdate);
  }, [user]);

  const isOwner = isZaneUser(user?.email) || profile.patente === 'Owner' || (profile.patente as string) === 'Zane';

  const toggleSidebar = () => {
    const sidebarEl = document.getElementById('sidebar');
    const overlayEl = document.getElementById('sidebar-overlay');
    if (sidebarEl) {
      const isHidden = sidebarEl.classList.contains('-translate-x-full');
      if (isHidden) {
        sidebarEl.classList.remove('-translate-x-full');
        overlayEl?.classList.remove('hidden');
      } else {
        sidebarEl.classList.add('-translate-x-full');
        overlayEl?.classList.add('hidden');
      }
    }
  };

  const closeSidebar = () => {
    const sidebarEl = document.getElementById('sidebar');
    const overlayEl = document.getElementById('sidebar-overlay');
    sidebarEl?.classList.add('-translate-x-full');
    overlayEl?.classList.add('hidden');
  };

  // Listener global para o botão nav-opcoes em SecaoInicio
  useEffect(() => {
    const btnNavOpcoes = document.getElementById('nav-opcoes');
    const handleOpenOpcoes = () => setModalOpcoesOpen(true);

    btnNavOpcoes?.addEventListener('click', handleOpenOpcoes);
    return () => {
      btnNavOpcoes?.removeEventListener('click', handleOpenOpcoes);
    };
  }, []);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        id="sidebar-overlay"
        onClick={closeSidebar}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 hidden transition-opacity duration-300"
      />

      {/* Top Header Bar */}
      <header className="bg-slate-950/90 backdrop-blur-md p-2.5 sm:p-3.5 flex items-center justify-between border-b border-slate-800/80 fixed top-0 left-0 w-full z-30 shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            id="btn-menu"
            onClick={toggleSidebar}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg border border-slate-800/80 hover:border-slate-700 transition-all text-lg flex items-center justify-center active:scale-95 shadow-sm"
            title="Abrir Menu Lateral"
          >
            ☰
          </button>

          {/* User Account & Patente Tag Badge */}
          <button
            onClick={() => setModalAuthOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 hover:bg-violet-950/70 border border-slate-800 hover:border-violet-600/80 text-slate-200 rounded-xl text-xs font-medium transition-all shadow-md group"
            style={{ display: 'inline-flex', alignItems: 'center', flexDirection: 'row', gap: '8px' }}
            title="Perfil do Jogador / Autenticação"
          >
            <div className="relative flex-shrink-0" style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}>
              {profile.fotoPerfilUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.fotoPerfilUrl}
                  alt={profile.nomeJogador}
                  className="w-8 h-8 rounded-full object-cover border-2 border-violet-400/90 shadow-md"
                  style={{ width: '32px', height: '32px', borderRadius: '9999px', objectFit: 'cover' }}
                />
              ) : user?.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover border-2 border-violet-400/90 shadow-md"
                  style={{ width: '32px', height: '32px', borderRadius: '9999px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-700 to-purple-900 border-2 border-violet-400/90 flex items-center justify-center text-xs font-bold text-white shadow-md"
                  style={{ width: '32px', height: '32px', borderRadius: '9999px' }}
                >
                  {(profile.nomeJogador || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" title="Online" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 group-hover:text-violet-200 text-xs sm:text-sm max-w-[100px] sm:max-w-[160px] truncate" style={{ whiteSpace: 'nowrap' }}>
                {profile.nomeJogador || user?.displayName || user?.email?.split('@')[0] || 'Aventureiro'}
              </span>

              {/* Red Patente Tag */}
              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border shadow-sm flex-shrink-0 ${getPatenteColorClass(profile.patente)}`}>
                {profile.patente}
              </span>
            </div>
          </button>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Chat Global Button */}
          <button
            onClick={() => setModalChatGlobalOpen(true)}
            className="text-violet-200 hover:text-white text-xs bg-violet-950/90 hover:bg-violet-900 px-3 py-1.5 rounded-lg border border-violet-700/80 hover:border-violet-500 transition-all flex items-center gap-1.5 font-bold shadow-sm active:scale-95"
            title="Abrir Chat Global da Comunidade"
          >
            🌐 Chat Global
          </button>

          {/* ChatBot IA Button (Íris & Aurora) */}
          <button
            onClick={() => setModalChatBotOpen(true)}
            className="text-amber-200 hover:text-white text-xs bg-amber-950/90 hover:bg-amber-900 px-3 py-1.5 rounded-lg border border-amber-700/80 hover:border-amber-500 transition-all flex items-center gap-1.5 font-bold shadow-sm active:scale-95"
            title="Bater Papo com Íris & Aurora (Companheiras IA)"
          >
            🔮 ChatBot
          </button>

          {/* Chat IA Studio - EXCLUSIVO PARA O OWNER */}
          {isOwner && (
            <button
              id="btn-header-ai-studio"
              className="text-cyan-200 hover:text-white text-xs bg-cyan-950/90 hover:bg-cyan-900 px-3 py-1.5 rounded-lg border border-cyan-600/80 hover:border-cyan-400 transition-all items-center gap-1.5 font-bold shadow-md hidden sm:flex active:scale-95"
              title="Exclusivo Patente Owner"
            >
              🤖 Chat IA Studio
            </button>
          )}

          <button
            onClick={() => setModalOpcoesOpen(true)}
            className="text-slate-300 hover:text-white text-xs bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-all font-semibold shadow-sm active:scale-95"
            title="Opções do Perfil"
          >
            ⚙️ Opções
          </button>

          <button
            id="btn-logs-toggle"
            className="text-slate-300 hover:text-white text-xs bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-all font-semibold hidden md:flex items-center gap-1 shadow-sm active:scale-95"
          >
            <span>Logs</span> 🖥️
          </button>
        </div>
      </header>

      {/* Professional Lateral Sidebar */}
      <aside
        id="sidebar"
        className="fixed top-0 left-0 w-72 sm:w-80 h-full bg-slate-950 text-slate-200 -translate-x-full transition-transform duration-300 ease-in-out z-50 border-r border-slate-800/90 shadow-2xl flex flex-col justify-between overflow-y-auto"
      >
        <div>
          {/* Header section in Sidebar */}
          <div className="p-4 border-b border-slate-800/90 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-700/80 flex items-center justify-center text-lg shadow-inner">
                🌌
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                  Cosmic Storyteller
                </h2>
                <p className="text-[10px] text-slate-400 font-mono">Painel do Sistema</p>
              </div>
            </div>
            <button
              onClick={closeSidebar}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors text-sm"
              title="Fechar Menu"
            >
              ✕
            </button>
          </div>

          {/* User Profile Card inside Sidebar */}
          <div className="p-3.5 mx-3 my-3 bg-slate-900/80 border border-slate-800 rounded-xl shadow-sm">
            <div
              onClick={() => {
                setModalOpcoesOpen(true);
                closeSidebar();
              }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {profile.fotoPerfilUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.fotoPerfilUrl}
                  alt={profile.nomeJogador}
                  className="w-10 h-10 rounded-full border-2 border-violet-500/80 object-cover shadow-md"
                />
              ) : user?.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-10 h-10 rounded-full border-2 border-violet-500/80 object-cover shadow-md"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-violet-900/80 border-2 border-violet-500/80 flex items-center justify-center font-bold text-violet-100 text-sm shadow-md">
                  {(profile.nomeJogador || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {profile.nomeJogador || user?.displayName || 'Aventureiro'}
                  </span>
                  {/* Red Patente Tag */}
                  <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider border ${getPatenteColorClass(profile.patente)}`}>
                    {profile.patente}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono truncate">
                  {user?.email || 'Navegador Local'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items Organized by Category */}
          <nav className="px-3 space-y-4 py-2">
            <div>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Navegação
              </div>
              <div className="space-y-1">
                <button
                  id="btn-inicio"
                  onClick={closeSidebar}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 border border-transparent font-medium text-xs transition-all flex items-center gap-3 active:scale-98"
                >
                  <span className="text-base">🏠</span>
                  <span>Início</span>
                </button>
                <button
                  id="btn-tela-jogo"
                  onClick={closeSidebar}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-800/60 border border-transparent font-medium text-xs transition-all flex items-center gap-3 active:scale-98"
                >
                  <span className="text-base">🎮</span>
                  <span>Campanha Ativa</span>
                </button>
                <button
                  id="btn-npcs"
                  onClick={closeSidebar}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-blue-300 hover:bg-blue-950/40 hover:border-blue-800/60 border border-transparent font-medium text-xs transition-all flex items-center gap-3 active:scale-98"
                >
                  <span className="text-base">👥</span>
                  <span>Painel de NPCs</span>
                </button>
              </div>
            </div>

            <div>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Comunidade &amp; Interação
              </div>
              <div className="space-y-1">
                <button
                  id="btn-campanhas-globais"
                  onClick={closeSidebar}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-emerald-300 hover:text-emerald-100 hover:bg-emerald-950/60 border border-emerald-800/60 hover:border-emerald-600/80 font-bold text-xs transition-all flex items-center gap-3 active:scale-98 shadow-sm"
                >
                  <span className="text-base">🌐</span>
                  <span>Campanhas Globais</span>
                </button>

                <button
                  onClick={() => {
                    setModalChatBotOpen(true);
                    closeSidebar();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-amber-300 hover:text-amber-100 hover:bg-amber-950/60 border border-amber-900/60 hover:border-amber-700/80 font-bold text-xs transition-all flex items-center gap-3 active:scale-98 shadow-sm"
                >
                  <span className="text-base">🔮</span>
                  <span>ChatBot Íris &amp; Aurora</span>
                </button>

                <button
                  onClick={() => {
                    setModalChatGlobalOpen(true);
                    closeSidebar();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-violet-300 hover:text-violet-100 hover:bg-violet-950/60 border border-violet-900/60 hover:border-violet-700/80 font-bold text-xs transition-all flex items-center gap-3 active:scale-98 shadow-sm"
                >
                  <span className="text-base">💬</span>
                  <span>Chat Global da Comunidade</span>
                </button>

                <button
                  onClick={() => {
                    setModalFeedbackOpen(true);
                    closeSidebar();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 border border-transparent font-medium text-xs transition-all flex items-center gap-3 active:scale-98"
                >
                  <span className="text-base">📝</span>
                  <span>Enviar pro Zane (Feedback)</span>
                </button>

                <button
                  onClick={() => {
                    setModalOpcoesOpen(true);
                    closeSidebar();
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700 border border-transparent font-medium text-xs transition-all flex items-center gap-3 active:scale-98"
                >
                  <span className="text-base">⚙️</span>
                  <span>Opções do Perfil</span>
                </button>
              </div>
            </div>

            {/* Chat IA Studio - APENAS PARA OWNER NO SIDEBAR */}
            {isOwner && (
              <div>
                <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Administração (Owner)
                </div>
                <div className="space-y-1">
                  <button
                    id="btn-sidebar-ai-studio"
                    onClick={closeSidebar}
                    className="w-full text-left px-3.5 py-2.5 rounded-lg text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/60 border border-cyan-900/60 hover:border-cyan-700/80 font-medium text-xs transition-all flex items-center gap-3 active:scale-98 shadow-sm"
                  >
                    <span className="text-base">🤖</span>
                    <span>Chat IA Studio (Exclusivo Owner)</span>
                  </button>
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Footer info inside sidebar */}
        <div className="p-3.5 border-t border-slate-800/90 bg-slate-900/40 flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span>Ordos Mundos Engine v1.0</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">
            Multi-User RPG System
          </span>
        </div>
      </aside>

      <ModalAuth isOpen={modalAuthOpen} onClose={() => setModalAuthOpen(false)} />
      <ModalFeedback isOpen={modalFeedbackOpen} onClose={() => setModalFeedbackOpen(false)} />
      <ModalOpcoes isOpen={modalOpcoesOpen} onClose={() => setModalOpcoesOpen(false)} />
      <ModalChatGlobal isOpen={modalChatGlobalOpen} onClose={() => setModalChatGlobalOpen(false)} />
      <ModalChatBotIA isOpen={modalChatBotOpen} onClose={() => setModalChatBotOpen(false)} />
    </>
  );
}
