'use client';

export type PatenteType =
  | 'Owner'
  | 'ADM'
  | 'Staffer'
  | 'Life Dev'
  | 'Mission Dev'
  | 'RPG Dev'
  | 'Monster Dev'
  | 'Hefestus Dev'
  | 'World Dev'
  | 'Scouter'
  | 'Jogador';

export interface UserProfileData {
  nomeJogador: string;
  fotoPerfilUrl: string;
  patente: PatenteType;
  chatStorageType?: 'local' | 'cache';
  enterEnviaTexto?: boolean;
}

const OWNER_EMAIL = 'lukeperseu@gmail.com';

export function getStoredUserProfile(userEmail?: string | null, userName?: string | null, userPhoto?: string | null): UserProfileData {
  if (typeof window === 'undefined') {
    return {
      nomeJogador: userName || 'Aventureiro',
      fotoPerfilUrl: userPhoto || '',
      patente: userEmail?.toLowerCase() === OWNER_EMAIL ? 'Owner' : 'Jogador',
      chatStorageType: 'local',
    };
  }

  const savedProfile = localStorage.getItem('cosmic_user_profile');
  let profile: Partial<UserProfileData> = {};
  if (savedProfile) {
    try {
      profile = JSON.parse(savedProfile);
    } catch (e) {
      profile = {};
    }
  }

  // Se o e-mail for o do Owner (lukeperseu@gmail.com), garante a patente Owner incondicionalmente
  const isOwner = userEmail?.toLowerCase() === OWNER_EMAIL;
  const rawPatente = profile.patente as string | undefined;
  const patente: PatenteType = isOwner ? 'Owner' : (rawPatente === 'Zane' ? 'Owner' : ((rawPatente as PatenteType) || 'Jogador'));

  const nomeJogador = profile.nomeJogador || userName || (userEmail ? userEmail.split('@')[0] : 'Aventureiro');
  const fotoPerfilUrl = profile.fotoPerfilUrl || userPhoto || '';
  const chatStorageType = profile.chatStorageType || undefined;
  const enterEnviaTexto = profile.enterEnviaTexto !== undefined ? profile.enterEnviaTexto : true;

  return {
    nomeJogador,
    fotoPerfilUrl,
    patente,
    chatStorageType,
    enterEnviaTexto,
  };
}

export function saveUserProfile(data: Partial<UserProfileData>) {
  if (typeof window === 'undefined') return;
  const current = getStoredUserProfile();
  const updated = { ...current, ...data };
  localStorage.setItem('cosmic_user_profile', JSON.stringify(updated));

  // Dispara evento customizado para reatividade na UI
  window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updated }));
}

export function isOwnerUser(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return userEmail.toLowerCase() === OWNER_EMAIL;
}

export const isZaneUser = isOwnerUser;

export function getPatenteColorClass(patente: PatenteType | 'Zane'): string {
  switch (patente) {
    case 'Owner':
    case 'Zane':
      return 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white font-extrabold border-red-400 shadow-red-900/50';
    case 'ADM':
      return 'bg-red-800 text-red-100 font-bold border-red-500 shadow-red-950';
    case 'Staffer':
      return 'bg-red-900/90 text-red-200 font-semibold border-red-600';
    case 'Life Dev':
    case 'Mission Dev':
    case 'RPG Dev':
    case 'Monster Dev':
    case 'Hefestus Dev':
    case 'World Dev':
      return 'bg-red-950 text-red-300 font-medium border-red-700/80';
    case 'Scouter':
      return 'bg-red-950/80 text-rose-300 font-medium border-rose-800';
    default:
      return 'bg-slate-800 text-slate-300 font-normal border-slate-700';
  }
}
