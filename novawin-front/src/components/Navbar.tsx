'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Swal from 'sweetalert2';
import type { User } from '@/src/types/user';
import { getAiProvider, setAiProvider } from '@/src/lib/aiProvider';
import { getPageTitle } from '@/src/lib/pageTitles';

interface NavbarProps {
  user: User;
  onToggleSidebar: () => void;
}

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

export default function Navbar({ user, onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);
  const [aiProvider, setAiProviderState] = useState('gemini');

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const aiDropdownRef = useRef<HTMLDivElement>(null);

  const canChooseAiModel = user.role === 'ROLE_ADMIN' || user.role === 'ROLE_SUPER_ADMIN';
  const { title, subtitle } = getPageTitle(pathname);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    setAiProviderState(getAiProvider());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) setIsUserDropdownOpen(false);
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(event.target as Node)) setIsAiDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleTheme() {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  function handleLogout() {
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  }

  function selectAiProvider(provider: string) {
    setAiProvider(provider);          // persiste dans le cookie partagé (src/lib/aiProvider.ts)
    setAiProviderState(provider);
    setIsAiDropdownOpen(false);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Modèle IA : ${provider === 'groq' ? 'Groq' : 'Gemini'}`,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      ...swalTheme(),
    });
  }

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button className="sidebar-toggle-btn" onClick={onToggleSidebar} title="Réduire/Agrandir la barre latérale">
          <i className="fas fa-bars"></i>
        </button>
        <div className="page-title">
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="top-header-right">
        <button className="header-btn" onClick={toggleTheme} title="Changer le thème">
          <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
        </button>

        {canChooseAiModel && (
          <div className="dropdown ai-model-dropdown" ref={aiDropdownRef}>
            <button
              className="header-btn ai-model-toggle"
              type="button"
              onClick={() => setIsAiDropdownOpen((v) => !v)}
              aria-expanded={isAiDropdownOpen}
              title="Choisir le modèle IA"
            >
              <i className="fas fa-robot"></i>
            </button>

            {isAiDropdownOpen && (
              <ul className="dropdown-menu dropdown-menu-end ai-model-menu show">
                <li className="ai-model-header">Modèle IA pour la génération</li>
                <li>
                  <button type="button" className={`dropdown-item ai-model-item ${aiProvider === 'gemini' ? 'active' : ''}`} onClick={() => selectAiProvider('gemini')}>
                    <i className="fas fa-gem"></i>
                    <span>Gemini</span>
                    <i className="fas fa-check ai-model-check"></i>
                  </button>
                </li>
                <li>
                  <button type="button" className={`dropdown-item ai-model-item ${aiProvider === 'groq' ? 'active' : ''}`} onClick={() => selectAiProvider('groq')}>
                    <i className="fas fa-bolt"></i>
                    <span>Groq</span>
                    <i className="fas fa-check ai-model-check"></i>
                  </button>
                </li>
                <li><hr className="dropdown-divider ai-model-divider" /></li>
                <li className="ai-model-footer">
                  <i className="fas fa-info-circle"></i>
                  Bascule automatique si l&apos;un des deux est indisponible.
                </li>
              </ul>
            )}
          </div>
        )}

        <button className="header-btn" onClick={() => {}} title="Notifications">
          <i className="fas fa-bell"></i>
          <span className="notification-dot"></span>
        </button>

        <div className="dropdown header-user-dropdown" ref={userDropdownRef}>
          <button className="header-user-toggle" type="button" onClick={() => setIsUserDropdownOpen((v) => !v)} aria-expanded={isUserDropdownOpen}>
            <div className="user-avatar">{user.initial}</div>
            <span className="user-name-text">{user.prenom}</span>
            <i className="fas fa-chevron-down user-caret"></i>
          </button>

          {isUserDropdownOpen && (
            <ul className="dropdown-menu dropdown-menu-end user-dropdown-menu show">
              <li className="user-dropdown-header">
                <div className="fw-semibold" style={{ color: 'var(--text-primary)' }}>{user.prenom} {user.nom}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
              </li>
              <li><hr className="dropdown-divider user-dropdown-divider" /></li>
              <li>
                <Link href="/dashboard/profile" className="dropdown-item user-dropdown-item" onClick={() => setIsUserDropdownOpen(false)}>
                  <i className="fas fa-user"></i> Mon profil
                </Link>
              </li>
              <li>
                <button className="dropdown-item user-dropdown-item danger" onClick={handleLogout}>
                  <i className="fas fa-power-off"></i> Déconnexion
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}