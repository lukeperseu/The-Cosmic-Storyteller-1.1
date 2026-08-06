'use client';

import React, { useEffect, useState } from 'react';
import HeaderSidebar from '@/components/HeaderSidebar';
import SidebarLogs from '@/components/SidebarLogs';
import SecaoInicio from '@/components/SecaoInicio';
import SecaoNovaCampanha from '@/components/SecaoNovaCampanha';
import SecaoCarregarCampanha from '@/components/SecaoCarregarCampanha';
import SecaoMonstroSemana from '@/components/SecaoMonstroSemana';
import SecaoMeusPersonagens from '@/components/SecaoMeusPersonagens';
import SecaoArquivosCarregados from '@/components/SecaoArquivosCarregados';
import SecaoNpcs from '@/components/SecaoNpcs';
import SecaoSinteseRegras from '@/components/SecaoSinteseRegras';
import SecaoSistemasAssimilados from '@/components/SecaoSistemasAssimilados';
import SecaoCampanhasGlobais from '@/components/SecaoCampanhasGlobais';
import SecaoTelaJogo from '@/components/SecaoTelaJogo';
import ModalExplorar from '@/components/ModalExplorar';
import ModalConfirmarExclusao from '@/components/ModalConfirmarExclusao';
import ModalVincularCampanha from '@/components/ModalVincularCampanha';
import ModalEditarCampanha from '@/components/ModalEditarCampanha';
import ModalChatDevAssistant from '@/components/ModalChatDevAssistant';
import { AuthProvider } from '@/components/AuthContext';
import { initCosmicEngine } from '@/lib/cosmicScript';

export default function Home() {
  const [modalAssistantOpen, setModalAssistantOpen] = useState(false);
  const [assistantTab, setAssistantTab] = useState<'features' | 'chat'>('features');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted) return;

    initCosmicEngine();

    const handleOpenFeatures = () => {
      setAssistantTab('features');
      setModalAssistantOpen(true);
    };

    const handleOpenChat = () => {
      setAssistantTab('chat');
      setModalAssistantOpen(true);
    };

    const btnNavFeatures = document.getElementById('nav-features');
    const btnHeaderAi = document.getElementById('btn-header-ai-studio');
    const btnSidebarAi = document.getElementById('btn-sidebar-ai-studio');

    btnNavFeatures?.addEventListener('click', handleOpenFeatures);
    btnHeaderAi?.addEventListener('click', handleOpenChat);
    btnSidebarAi?.addEventListener('click', handleOpenChat);

    return () => {
      btnNavFeatures?.removeEventListener('click', handleOpenFeatures);
      btnHeaderAi?.removeEventListener('click', handleOpenChat);
      btnSidebarAi?.removeEventListener('click', handleOpenChat);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-slate-400 text-sm font-mono z-50">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Iniciando The Cosmic Storyteller...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      {/* Background radial gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black z-[-1] pointer-events-none"></div>

      {/* Header e Sidebar Principal */}
      <HeaderSidebar />

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-hidden">
        {/* Console de Logs Lateral */}
        <SidebarLogs />

        {/* Áreas de Seção com Scroll */}
        <div className="flex-1 overflow-y-auto pt-16">
          <SecaoInicio />
          <SecaoCampanhasGlobais />
          <SecaoNovaCampanha />
          <SecaoCarregarCampanha />
          <SecaoMonstroSemana />
          <SecaoMeusPersonagens />
          <SecaoArquivosCarregados />
          <SecaoNpcs />
          <SecaoTelaJogo />
          <SecaoSinteseRegras />
          <SecaoSistemasAssimilados />
        </div>
      </main>

      {/* Modal para Explorar Arquivos Locais */}
      <ModalExplorar />

      {/* Modal para Confirmar Exclusão */}
      <ModalConfirmarExclusao />

      {/* Modal para Vincular Personagem a Campanha */}
      <ModalVincularCampanha />

      {/* Modal para Editar Materiais e Dados da Campanha */}
      <ModalEditarCampanha />

      {/* Modal / Chat Pop-Up da IA do Google AI Studio */}
      <ModalChatDevAssistant
        isOpen={modalAssistantOpen}
        onClose={() => setModalAssistantOpen(false)}
        initialTab={assistantTab}
      />
    </AuthProvider>
  );
}
