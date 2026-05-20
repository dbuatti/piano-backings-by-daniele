"use client";

export interface ImpersonatedUser {
  id: string;
  email: string;
  name: string;
}

export const getImpersonatedUser = (): ImpersonatedUser | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('impersonated_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export const setImpersonatedUser = (user: ImpersonatedUser) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('impersonated_user', JSON.stringify(user));
  window.dispatchEvent(new Event('impersonation_change'));
};

export const clearImpersonatedUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('impersonated_user');
  window.dispatchEvent(new Event('impersonation_change'));
};