'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ModalFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalFeedback({ isOpen, onClose }: ModalFeedbackProps) {
  const { user } = useAuth();
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) {
      setFeedbackStatus({ tipo: 'erro', texto: 'Por favor, digite a sua recomendação.' });
      return;
    }

    setEnviando(true);
    setFeedbackStatus(null);

    const recomendacaoData = {
      destinatario: "Zane",
      assunto: assunto.trim() || "Recomendação para o Zane",
      mensagem: mensagem.trim(),
      userEmail: user?.email || "Anônimo",
      userId: user?.uid || "public",
      data_envio: new Date().toISOString(),
      status: "pendente",
      anexoDesativado: true,
    };

    try {
      // Tenta salvar diretamente no Firestore via SDK cliente (mais rápido e confiável)
      await addDoc(collection(db, "RecomendacoesZane"), recomendacaoData);
      
      try {
        await addDoc(collection(db, "Feedbacks"), recomendacaoData);
      } catch (_) {
        // Ignora falha secundária se a principal já salvou
      }

      setFeedbackStatus({ tipo: 'sucesso', texto: '🔥 Recomendação enviada e salva com sucesso no Firebase para o Zane!' });
      setTimeout(() => {
        setAssunto('');
        setMensagem('');
        setFeedbackStatus(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error("Erro ao salvar recomendação diretamente no Firestore:", err);

      // Fallback via API Rota caso ocorra falha de rede ou regra no cliente
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assunto,
            mensagem,
            userEmail: user?.email || 'Anônimo',
            userId: user?.uid || 'public',
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setFeedbackStatus({ tipo: 'sucesso', texto: '🔥 Recomendação armazenada com sucesso no Firebase para o Zane!' });
          setTimeout(() => {
            setAssunto('');
            setMensagem('');
            setFeedbackStatus(null);
            onClose();
          }, 1800);
        } else {
          setFeedbackStatus({ tipo: 'erro', texto: data.error || 'Erro ao salvar recomendação.' });
        }
      } catch (apiErr: any) {
        setFeedbackStatus({ tipo: 'erro', texto: 'Falha ao salvar no Firebase: ' + (err?.message || 'Verifique sua conexão.') });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-violet-700/80 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-violet-950 border border-violet-500 flex items-center justify-center text-xl">
            📝
          </div>
          <div>
            <h2 className="text-xl font-bold text-violet-300">Enviar Recomendação pro Zane</h2>
            <p className="text-xs text-slate-400">Armazenado diretamente no Firebase Firestore para análise</p>
          </div>
        </div>

        {feedbackStatus && (
          <div
            className={`p-3 rounded text-xs font-semibold mb-4 border ${
              feedbackStatus.tipo === 'sucesso'
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-red-950/80 border-red-600 text-red-300'
            }`}
          >
            {feedbackStatus.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
              Assunto / Categoria
            </label>
            <input
              type="text"
              placeholder="Ex: Sugestão para Combate, Nova Mecânica, Bug na Ficha..."
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="w-full p-3 bg-black border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
              Sua Recomendação <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Escreva sua recomendação, ideia ou feedback..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full p-3 bg-black border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-violet-500 font-sans"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Anexar Mídia (Anexo)
            </label>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded text-xs text-slate-400 italic flex items-center gap-2">
              <span>📎</span>
              <span>Envio de anexos temporariamente desativado para esta modalidade.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-6 py-2 bg-violet-900 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-xs rounded transition-colors border border-violet-600 flex items-center gap-2 shadow-lg"
            >
              {enviando ? 'Salvando...' : '🔥 Enviar pro Zane (Salvar no Firebase)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

