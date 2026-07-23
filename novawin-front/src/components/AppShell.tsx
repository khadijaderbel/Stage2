'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import type { User } from '@/src/types/user';

interface AppShellProps {
  user: User;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    setCollapsed(savedCollapsed);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };

  const toggleMobileSidebar = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="mobile-toggle" onClick={toggleMobileSidebar}>
        <i className="fas fa-bars"></i>
      </button>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${mobileOpen ? 'show' : ''}`} onClick={toggleMobileSidebar}></div>

      <Sidebar user={user} collapsed={collapsed} mobileOpen={mobileOpen} />

      <div className={`main-content ${collapsed ? 'collapsed' : ''}`} id="mainContent">
        <Navbar user={user} onToggleSidebar={toggleSidebar} />
        <div className="content-body">{children}</div>
      </div>
    </>
  );
}