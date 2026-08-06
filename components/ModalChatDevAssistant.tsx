'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  autor: 'user' | 'assistant';
  texto: string;
  imagemUrl?: string;
  dataHora: string;
}

interface ModalChatDevAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'features' | 'chat';
}

export default function ModalChatDevAssistant({ isOpen, onClose, initialTab = 'features' }: ModalChatDevAssistantProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'chat'>(initialTab);
  const [anexoPreview, setAnexoPreview] = useState<string | null>(null);
  const [anexoMimeType, setAnexoMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      autor: 'assistant',
      texto: `👋 **Olá! Sou a IA de Engenharia do Google AI Studio.**

Fui encarregada de auxiliar no desenvolvimento do **The Cosmic Storyteller** e ajudar você a estruturar os melhores **prompts** para o app!

Como posso te ajudar hoje?
- 🖼️ **Envio de Anexos:** Você pode me enviar **prints de tela**, capturas de erro, tabelas de livros ou imagens de fichas usando o botão 📎 **Anexar Print/Imagem**!
- 💡 **Engenharia de Prompts para a Íris:** Dicas de como descrever suas ações em ON (\`-\`) para narrações mais épicas.
- ⚖️ **Formatação para a Aurora:** Como formular dúvidas em OFF (\`//\`) para a Aurora consultar as regras da sua ficha e do banco.
- 🧝 **Assimilando novas Raças & Classes:** Como incluir dados de raças customizadas de forma simples para a Aurora responder com exatidão.
- ⚙️ **Ideias de expansão:** Como solicitar novos recursos e aperfeiçoar o app no AI Studio.`,
      dataHora: new Date().toLocaleTimeString(),
    },
  ]);

  const [inputTexto, setInputTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, isOpen, activeTab]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem ou captura de tela (PNG, JPG, WEBP, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAnexoPreview(result);
      setAnexoMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const enviarMensagem = async (textoEnviar?: string) => {
    const promptFinal = (textoEnviar || inputTexto).trim() || (anexoPreview ? "Analise a imagem em anexo e me dê orientações." : "");
    if (!promptFinal || carregando) return;

    const imagemParaEnviar = anexoPreview;
    const mimeParaEnviar = anexoMimeType;

    const novaUserMsg: ChatMessage = {
      id: Date.now().toString(),
      autor: 'user',
      texto: promptFinal,
      imagemUrl: imagemParaEnviar || undefined,
      dataHora: new Date().toLocaleTimeString(),
    };

    const historicoAtualizado = [...mensagens, novaUserMsg];
    setMensagens(historicoAtualizado);
    setInputTexto('');
    setAnexoPreview(null);
    setAnexoMimeType(null);
    setCarregando(true);

    try {
      const res = await fetch('/api/studio-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptFinal,
          anexoBase64: imagemParaEnviar,
          anexoMimeType: mimeParaEnviar,
          historico: historicoAtualizado.map((m) => ({ autor: m.autor, texto: m.texto })),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMensagens((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            autor: 'assistant',
            texto: data.resposta,
            dataHora: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        setMensagens((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            autor: 'assistant',
            texto: `❌ **Erro:** ${data.error || 'Não foi possível obter resposta no momento.'}`,
            dataHora: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      setMensagens((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          autor: 'assistant',
          texto: `❌ **Falha na conexão:** ${err.message || 'Erro inesperado.'}`,
          dataHora: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  const sugestoesPrompt = [
    "💡 Dicas para a Íris narrar melhor",
    "⚖️ Como perguntar regras para a Aurora",
    "🧝 Como cadastrar raças personalizadas",
    "📝 Regras de sinais (-, ~, //, ())",
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-950 border border-violet-600/60 rounded-xl max-w-2xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-violet-500/30">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-cyan-950 p-4 border-b border-violet-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-600/30 border border-violet-400 flex items-center justify-center text-2xl shadow-lg shadow-violet-950">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300 uppercase tracking-wider">
                Features &amp; IA do Google AI Studio
              </h3>
              <p className="text-[11px] text-slate-400">
                Consultoria de Engenharia de Prompts e Recursos do App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-400 font-bold transition-colors flex items-center justify-center border border-slate-800"
            title="Fechar Pop-up"
          >
            ✕
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 gap-2">
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
              activeTab === 'features'
                ? 'bg-violet-900/80 text-violet-200 border border-violet-600/80 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            ✨ Recursos do App (Features)
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/80 shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            🤖 Chat Pop-Up • IA Google AI Studio
          </button>
        </div>

        {/* CONTEÚDO DA ABA: FEATURES */}
        {activeTab === 'features' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-slate-950/90 text-slate-200">
            {/* CTA em Destaque para abrir o Chat */}
            <div className="p-4 bg-gradient-to-r from-violet-950/90 via-purple-950/60 to-cyan-950/90 border border-violet-500/50 rounded-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-violet-300 flex items-center gap-2 justify-center sm:justify-start">
                  🤖 Chat com IA do Google AI Studio
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Converse diretamente com a IA responsável pelo projeto para receber dicas de estruturação de prompts e sugestões de melhoria!
                </p>
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                className="px-5 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2 flex-shrink-0"
              >
                💬 Abrir Chat Pop-Up ➔
              </button>
            </div>

            {/* Lista de Features Principais */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                🌟 Funcionalidades e Arquitetura do Sistema
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Feature 1 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
                  <span className="font-bold text-violet-400 flex items-center gap-1.5">
                    🔮 Íris (IA Narratora)
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Especialista em narrações épicas, imersivas e descrições de cenários e NPCs em tempo real.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    ⚖️ Aurora (IA Mediadora)
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Valida regras, consulta raças/classes assimiladas e responde dúvidas técnicas em OFF sem interromper a imersão.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    ⚙️ Executora (Ferramenta de Automação)
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Aplica alterações automáticas em PV, PM, Ouro e equipagem inteligente de armas de 2 mãos e armaduras.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5">
                  <span className="font-bold text-purple-400 flex items-center gap-1.5">
                    📚 Síntese de Regras &amp; Assimilação
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Importa PDFs de livros de RPG e cadastra Raças, Classes e Itens no banco de dados Firestore para a Aurora consultar.
                  </p>
                </div>
              </div>

              {/* Guia de Sinais do Jogador */}
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  📝 Notação Obrigatória do Jogador (Regras de Sinais)
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-violet-950 text-violet-300 rounded border border-violet-800 font-bold">- / — / &quot;...&quot;</span>
                    <span>Fala do personagem em ON (Jogo)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-violet-950 text-violet-300 rounded border border-violet-800 font-bold">~</span>
                    <span>Fala sussurrada ou em tom baixo em ON</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-violet-950 text-violet-300 rounded border border-violet-800 font-bold">(...)</span>
                    <span>Pensamento do personagem</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 font-bold">
                      {'// / / / || / Aurora...'}
                    </span>
                    <span>Mensagem em OFF (Dúvidas/Regras com Aurora)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA: CHAT POP-UP */}
        {activeTab === 'chat' && (
          <>
            {/* Histórico de Conversa */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/90 text-slate-200">
              {mensagens.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.autor === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {msg.autor === 'user' ? '👤 Você' : '🤖 IA do Google AI Studio'}
                    </span>
                    <span className="text-[9px] text-slate-600">{msg.dataHora}</span>
                  </div>
                  <div
                    className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[90%] shadow-md space-y-2 ${
                      msg.autor === 'user'
                        ? 'bg-violet-900/60 border border-violet-600/60 text-violet-100 rounded-tr-none'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.imagemUrl && (
                      <div className="rounded-lg overflow-hidden border border-violet-500/40 max-w-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={msg.imagemUrl} alt="Anexo" className="w-full h-auto object-cover max-h-48" />
                      </div>
                    )}
                    <div className="prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown>{msg.texto}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {carregando && (
                <div className="flex items-center gap-2 text-violet-400 text-xs italic bg-slate-900/60 p-3 rounded-lg border border-slate-800 w-fit">
                  <span className="animate-pulse">🤖 A IA do Google AI Studio está analisando e gerando orientações...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Sugestões Rápidas */}
            <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex flex-wrap gap-1.5 text-[11px]">
              {sugestoesPrompt.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => enviarMensagem(sug)}
                  disabled={carregando}
                  className="px-2.5 py-1 bg-slate-800/90 hover:bg-violet-900/60 text-slate-300 hover:text-violet-200 rounded border border-slate-700/80 hover:border-violet-500/80 transition-all duration-200 text-[11px] text-left"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Preview do Anexo se houver */}
            {anexoPreview && (
              <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={anexoPreview} alt="Preview" className="w-10 h-10 object-cover rounded border border-violet-500" />
                  <span className="text-xs text-slate-300 font-semibold">Anexo pronto para análise</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAnexoPreview(null); setAnexoMimeType(null); }}
                  className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-950/60 rounded border border-red-800"
                >
                  Remover ✕
                </button>
              </div>
            )}

            {/* Campo de Digitação e Upload de Anexos */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarMensagem();
              }}
              className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 rounded-lg border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0"
                title="Anexar captura de tela ou imagem"
              >
                📎 <span className="hidden sm:inline">Anexar Print</span>
              </button>

              <input
                type="text"
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
                placeholder="Pergunte sobre prompts ou envie um print de tela para análise..."
                className="flex-1 p-2.5 bg-black border border-slate-800 text-slate-200 text-xs rounded-lg focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={carregando || (!inputTexto.trim() && !anexoPreview)}
                className="px-4 py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5 flex-shrink-0"
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
