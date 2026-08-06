'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthContext';

interface ModalAuthProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalAuth({ isOpen, onClose }: ModalAuthProps) {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail, loginAsGuest, logout } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoadingAction(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('O login com o Google foi cancelado.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up bloqueado pelo navegador. Autorize os pop-ups ou entre como Convidado.');
      } else if (
        err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid')
      ) {
        setErrorMsg('Firebase em modo de demonstração/sem chave ativa. Clique abaixo para entrar como Convidado!');
      } else {
        setErrorMsg('Erro no login com o Google: ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGuestSignIn = () => {
    loginAsGuest(name.trim() || 'Aventureiro Convidado');
    onClose();
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoadingAction(true);
    try {
      if (tab === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!name) {
          setErrorMsg('Por favor, informe seu nome.');
          setLoadingAction(false);
          return;
        }
        await registerWithEmail(email, password, name);
      }
      onClose();
    } catch (err: any) {
      let message = 'Falha na autenticação.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está registrado.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'O cadastro por E-mail/Senha não está ativado no Firebase Console. Utilize o "Entrar com a Conta Google" ou o "Modo Convidado".';
      } else if (
        err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid')
      ) {
        message = 'O Firebase está em modo de demonstração. Você pode usar o app normalmente em Modo Convidado!';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header do Modal */}
        <div className="p-6 pb-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-violet-950/40 via-slate-900 to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-900/60 border border-violet-500/50 flex items-center justify-center text-xl shadow-inner">
              🧙‍♂️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-wide">
                {user ? 'Sua Conta Ordos' : 'Acessar o Cosmos'}
              </h3>
              <p className="text-xs text-slate-400">
                {user ? 'Personagens, campanhas e materiais vinculados' : 'Sincronize seus dados e campanhas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6">
          {user ? (
            /* USUARIO CONECTADO */
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-20 h-20 rounded-full border-2 border-violet-500 shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-violet-900/80 border-2 border-violet-500 flex items-center justify-center text-3xl font-bold text-violet-200 shadow-lg">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Conectado"></span>
              </div>

              <div>
                <h4 className="text-xl font-bold text-violet-200">
                  {user.displayName || 'Aventureiro Sem Nome'}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold">
                  ✓ Seus dados estão salvos e isolados na sua conta
                </div>
              </div>

              <div className="w-full pt-4 border-t border-slate-800 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-800/80 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                >
                  🚪 Sair da Conta
                </button>
              </div>
            </div>
          ) : (
            /* USUARIO NÃO CONECTADO (LOGIN / CADASTRO) */
            <div className="flex flex-col gap-5">
              {/* Botão Oficial do Google Login */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loadingAction}
                className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg border border-slate-300 transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Entrar com a Conta Google</span>
              </button>

              {/* Botão de Entrada como Convidado / Modo Local */}
              <button
                type="button"
                onClick={handleGuestSignIn}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <span>🎭 Entrar como Convidado (Modo Local)</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full"></div>
                <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-widest font-mono">
                  ou e-mail
                </span>
                <div className="border-t border-slate-800 w-full"></div>
              </div>

              {/* Tabs Email/Senha */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                    tab === 'login'
                      ? 'bg-violet-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                    tab === 'register'
                      ? 'bg-violet-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmitEmail} className="flex flex-col gap-3">
                {tab === 'register' && (
                  <div>
                    <label className="block text-xs text-slate-400 font-semibold mb-1">
                      Nome / Alcunha
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Mestre Arcano"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 text-slate-200 text-sm rounded-lg p-2.5 outline-none transition-colors"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 text-slate-200 text-sm rounded-lg p-2.5 outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 text-slate-200 text-sm rounded-lg p-2.5 outline-none transition-colors"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-lg text-red-200 text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingAction}
                  className="w-full mt-2 py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-violet-500 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loadingAction
                    ? 'Processando...'
                    : tab === 'login'
                    ? 'Entrar no Sistema'
                    : 'Registrar e Entrar'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
