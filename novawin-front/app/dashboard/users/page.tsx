'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import type { User } from '@/src/types/user';
import '@/app/globals.css';

interface UsersResponse {
  users: User[];
  total: number;
  activeCount: number;
  inactiveCount: number;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getToken = () => {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? match[1] : null;
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur lors du chargement des utilisateurs');
      }

      const data: UsersResponse = await res.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
      setTotalCount(data.total);
      setActiveCount(data.activeCount);
      setInactiveCount(data.inactiveCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId: number, userName: string) => {
    const result = await Swal.fire({
      title: 'Confirmer la suppression',
      html: `
        <div style="text-align: left; color: var(--text-secondary);">
          <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong style="color: var(--text-primary);">${userName}</strong> ?</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">
            <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
            Cette action est <strong style="color: #dc3545;">irréversible</strong> et supprimera définitivement toutes les données associées.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-trash me-2"></i>Oui, supprimer',
      cancelButtonText: '<i class="fas fa-times me-2"></i>Annuler',
      background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#ffffff',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
      buttonsStyling: true,
      reverseButtons: false,
      customClass: {
        popup: 'rounded-4',
        confirmButton: 'btn btn-danger px-4 py-2 rounded-pill',
        cancelButton: 'btn btn-secondary px-4 py-2 rounded-pill'
      }
    });

    if (result.isConfirmed) {
      try {
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Erreur lors de la suppression');
        }

        setSuccessMessage('Utilisateur supprimé avec succès.');
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchUsers();
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: err instanceof Error ? err.message : 'Une erreur est survenue',
        });
      }
    }
  };

  const handleToggleStatus = async (userId: number, userName: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const newStatusLabel = newStatus ? 'Actif' : 'Inactif';
    const action = newStatus ? 'activer' : 'désactiver';
    const color = newStatus ? '#28a745' : '#dc3545';
    const icon = newStatus ? 'fa-play' : 'fa-pause';

    const result = await Swal.fire({
      title: `Confirmer le changement de statut`,
      html: `
        <div style="text-align: left; color: var(--text-secondary);">
          <p>Êtes-vous sûr de vouloir <strong style="color: ${color};">${action}</strong> l'utilisateur <strong style="color: var(--text-primary);">${userName}</strong> ?</p>
          <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-color);">
            <span style="font-size: 0.85rem;">
              <i class="fas fa-circle" style="color: ${currentStatus ? '#28a745' : '#dc3545'}; font-size: 0.5rem;"></i>
              Statut actuel : <strong>${currentStatus ? 'Actif' : 'Inactif'}</strong>
              <i class="fas fa-arrow-right mx-2" style="color: var(--text-secondary);"></i>
              <i class="fas fa-circle" style="color: ${color}; font-size: 0.5rem;"></i>
              Nouveau statut : <strong style="color: ${color};">${newStatusLabel}</strong>
            </span>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: color,
      cancelButtonColor: '#6c757d',
      confirmButtonText: `<i class="fas ${icon} me-2"></i>Oui, ${action}`,
      cancelButtonText: '<i class="fas fa-times me-2"></i>Annuler',
      background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#ffffff',
      color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
      buttonsStyling: true,
      reverseButtons: false,
      customClass: {
        popup: 'rounded-4',
        confirmButton: `btn px-4 py-2 rounded-pill`,
        cancelButton: 'btn btn-secondary px-4 py-2 rounded-pill'
      }
    });

    if (result.isConfirmed) {
      try {
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/toggle-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Erreur lors du changement de statut');
        }

        setSuccessMessage(`L'utilisateur a été ${action} avec succès.`);
        setTimeout(() => setSuccessMessage(null), 5000);
        fetchUsers();
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: err instanceof Error ? err.message : 'Une erreur est survenue',
        });
      }
    }
  };

  const getRoleBadge = (role: User['role']) => {
    const roleConfig: Record<User['role'], { bg: string; color: string; icon: string; label: string }> = {
      'ROLE_SUPER_ADMIN': {
        bg: 'linear-gradient(135deg, rgba(220, 53, 69, 0.15), rgba(220, 53, 69, 0.05))',
        color: '#dc3545',
        icon: 'crown',
        label: 'Super Admin'
      },
      'ROLE_ADMIN': {
        bg: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 193, 7, 0.05))',
        color: '#f59e0b',
        icon: 'shield-halved',
        label: 'Admin'
      },
      'ROLE_USER': {
        bg: 'linear-gradient(135deg, rgba(23, 162, 184, 0.15), rgba(23, 162, 184, 0.05))',
        color: '#0ea5e9',
        icon: 'user',
        label: 'User'
      }
    };
    return roleConfig[role] || roleConfig['ROLE_USER'];
  };

  const canEditUser = (user: User): boolean => {
    if (user.isCurrentUser) return false;
    if (user.isSuperAdmin) return false;
    return true;
  };

  return (
    <div className="users-page-container">
      {/* Messages Flash */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i> {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-circle me-2"></i> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div>
            <h1 className="page-title">
              <i className="fas fa-users" style={{ color: 'var(--emerald)' }}></i>
              Gestion des Utilisateurs
            </h1>
            <p className="page-subtitle">
              <i className="fas fa-info-circle me-1"></i>
              Configurez les droits d'accès et surveillez l'activité de votre équipe administrative.
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-item total">
              <span className="stat-number">{totalCount}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item active">
              <span className="stat-number">{activeCount}</span>
              <span className="stat-label">Actifs</span>
            </div>
            <div className="stat-item inactive">
              <span className="stat-number">{inactiveCount}</span>
              <span className="stat-label">Inactifs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="search-filter-card">
        <div className="search-filter-content">
          <div className="search-wrapper">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher par nom, prénom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-wrapper">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">📊 Tous les statuts</option>
              <option value="active">🟢 Actifs</option>
              <option value="inactive">🔴 Inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th><i className="fas fa-user me-2" />Prénom</th>
                <th><i className="fas fa-user me-2" />Nom</th>
                <th><i className="fas fa-envelope me-2" />Email</th>
                <th><i className="fas fa-user-tag me-2" />Rôle</th>
                <th><i className="fas fa-circle me-2" />Statut</th>
                <th className="text-end"><i className="fas fa-tools me-2" />Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <div className="spinner-border text-emerald" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p className="mt-2 text-muted">Chargement en cours...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fas fa-users fa-3x d-block mb-3" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    <p className="mb-0">Aucun utilisateur enregistré pour le moment.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = getRoleBadge(user.role);
                  const canEdit = canEditUser(user);

                  return (
                    <tr key={user.id} className="user-row">
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, var(--emerald), var(--accent-color))' }}>
                            {user.initial}
                          </div>
                          <span className="user-name">{user.prenom}</span>
                        </div>
                      </td>
                      <td>
                        <span className="user-lastname">{user.nom}</span>
                      </td>
                      <td>
                        <span className="user-email">
                          <i className="fas fa-envelope me-2 opacity-50" />
                          {user.email}
                        </span>
                      </td>
                      <td>
                        <span className={`role-badge role-${user.role.toLowerCase()}`}>
                          <i className={`fas fa-${role.icon} me-1`} />
                          {role.label}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.actif ? 'status-active' : 'status-inactive'}`}>
                          <span className="status-dot"></span>
                          {user.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="action-buttons">
                          <button
                            className={`action-btn edit-btn ${!canEdit ? 'disabled' : ''}`}
                            onClick={() => canEdit && router.push(`/dashboard/users/${user.id}/edit`)}
                            disabled={!canEdit}
                            title="Modifier l'utilisateur"
                          >
                            <i className="fas fa-pen" />
                          </button>
                          <button
                            className={`action-btn status-btn ${!canEdit ? 'disabled' : ''}`}
                            onClick={() => canEdit && handleToggleStatus(
                              user.id,
                              `${user.prenom} ${user.nom}`,
                              user.actif
                            )}
                            disabled={!canEdit}
                            title={user.actif ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
                          >
                            <i className={`fas fa-${user.actif ? 'pause' : 'play'}`} />
                          </button>
                          <button
                            className={`action-btn delete-btn ${!canEdit ? 'disabled' : ''}`}
                            onClick={() => canEdit && handleDelete(user.id, `${user.prenom} ${user.nom}`)}
                            disabled={!canEdit}
                            title="Supprimer l'utilisateur"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .users-page-container {
          padding: 0;
        }

        /* ========== ALERTS ========== */
        .alert {
          border-radius: 12px;
          border: none;
          padding: 0.75rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .alert-success {
          background: rgba(40, 167, 69, 0.12);
          color: #28a745;
        }

        .alert-danger {
          background: rgba(220, 53, 69, 0.12);
          color: #dc3545;
        }

        .alert .btn-close {
          filter: var(--btn-close-filter);
        }

        /* ========== HEADER ========== */
        .page-header {
          margin-bottom: 2rem;
        }

        .page-header-content {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .page-title i {
          font-size: 1.5rem;
        }

        .page-subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin: 0.25rem 0 0 0;
        }

        .header-stats {
          display: flex;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 1.25rem;
          border-radius: 12px;
          min-width: 60px;
        }

        .stat-item.total {
          background: rgba(0, 255, 163, 0.08);
          border: 1px solid rgba(0, 255, 163, 0.15);
        }

        .stat-item.active {
          background: rgba(40, 167, 69, 0.08);
          border: 1px solid rgba(40, 167, 69, 0.15);
        }

        .stat-item.inactive {
          background: rgba(220, 53, 69, 0.08);
          border: 1px solid rgba(220, 53, 69, 0.15);
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .stat-item.total .stat-number { color: var(--emerald); }
        .stat-item.active .stat-number { color: #28a745; }
        .stat-item.inactive .stat-number { color: #dc3545; }

        .stat-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        /* ========== SEARCH & FILTER ========== */
        .search-filter-card {
          background: var(--card-bg-light);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px var(--shadow-light);
          transition: all 0.3s ease;
        }

        .search-filter-content {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
        }

        .search-wrapper {
          flex: 1;
          position: relative;
          min-width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          opacity: 0.5;
          font-size: 0.9rem;
        }

        .search-input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.8rem;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          background: var(--bg-body);
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 0.3s ease;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--emerald);
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .filter-wrapper {
          min-width: 180px;
        }

        .filter-select {
          width: 100%;
          padding: 0.6rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          background: var(--bg-body);
          color: var(--text-primary);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          outline: none;
        }

        .filter-select:focus {
          border-color: var(--emerald);
          box-shadow: 0 0 0 3px rgba(0, 255, 163, 0.1);
        }

        /* ========== TABLE ========== */
        .table-card {
          background: var(--card-bg-light);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px var(--shadow-light);
        }

        .table-responsive {
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .users-table thead {
          background: var(--bg-body);
          border-bottom: 2px solid var(--border-color);
        }

        .users-table thead th {
          padding: 1rem 1.5rem;
          text-align: left;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .users-table thead th i {
          margin-right: 0.5rem;
          opacity: 0.7;
        }

        .users-table tbody tr {
          border-bottom: 1px solid var(--border-color);
          transition: background 0.2s ease;
        }

        .users-table tbody tr:hover {
          background: var(--bg-body);
        }

        .users-table tbody tr:last-child {
          border-bottom: none;
        }

        .users-table tbody td {
          padding: 0.9rem 1.5rem;
          vertical-align: middle;
          color: var(--text-primary);
        }

        /* ========== USER CELL ========== */
        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: #fff;
          flex-shrink: 0;
        }

        .user-name {
          font-weight: 500;
          color: var(--text-primary);
        }

        .user-lastname {
          color: var(--text-primary);
        }

        .user-email {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        /* ========== ROLE BADGE ========== */
        .role-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.9rem;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          border: 1px solid transparent;
        }

        .role-role_super_admin {
          background: rgba(220, 53, 69, 0.12);
          color: #dc3545;
          border-color: rgba(220, 53, 69, 0.2);
        }

        .role-role_admin {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.2);
        }

        .role-role_user {
          background: rgba(14, 165, 233, 0.12);
          color: #0ea5e9;
          border-color: rgba(14, 165, 233, 0.2);
        }

        /* ========== STATUS BADGE ========== */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.9rem;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .status-active {
          background: rgba(40, 167, 69, 0.12);
          color: #28a745;
        }

        .status-inactive {
          background: rgba(220, 53, 69, 0.12);
          color: #dc3545;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-active .status-dot {
          background: #28a745;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        .status-inactive .status-dot {
          background: #dc3545;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        /* ========== ACTION BUTTONS ========== */
        .action-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .action-btn {
          width: 34px;
          height: 34px;
          border: 1.5px solid var(--border-color);
          border-radius: 50%;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          padding: 0;
        }

        .action-btn:not(.disabled):hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .action-btn:not(.disabled):active {
          transform: scale(0.95);
        }

        .edit-btn:not(.disabled):hover {
          border-color: var(--emerald);
          color: var(--emerald);
          background: rgba(0, 255, 163, 0.08);
        }

        .status-btn:not(.disabled):hover {
          border-color: var(--emerald);
          color: var(--emerald);
          background: rgba(0, 255, 163, 0.08);
        }

        .status-btn:not(.disabled):hover i {
          animation: rotate-icon 0.5s ease;
        }

        @keyframes rotate-icon {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
        }

        .delete-btn:not(.disabled):hover {
          border-color: #dc3545;
          color: #dc3545;
          background: rgba(220, 53, 69, 0.08);
        }

        .delete-btn:not(.disabled):hover i {
          animation: shake-icon 0.5s ease;
        }

        @keyframes shake-icon {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(15deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
        }

        .action-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }

        .action-btn i {
          font-size: 0.75rem;
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
          .page-header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-stats {
            width: 100%;
            justify-content: space-around;
          }

          .stat-item {
            padding: 0.5rem 0.75rem;
            min-width: 50px;
          }

          .stat-number {
            font-size: 1rem;
          }

          .search-filter-content {
            flex-direction: column;
          }

          .search-wrapper,
          .filter-wrapper {
            width: 100%;
          }

          .users-table thead th,
          .users-table tbody td {
            padding: 0.75rem 1rem;
          }

          .users-table {
            font-size: 0.8rem;
          }

          .action-buttons {
            gap: 0.3rem;
          }

          .action-btn {
            width: 30px;
            height: 30px;
            font-size: 0.7rem;
          }

          .action-btn i {
            font-size: 0.65rem;
          }
        }

        @media (max-width: 576px) {
          .header-stats {
            flex-wrap: wrap;
          }

          .user-email {
            font-size: 0.75rem;
          }

          .role-badge {
            font-size: 0.6rem;
            padding: 0.25rem 0.6rem;
          }

          .status-badge {
            font-size: 0.6rem;
            padding: 0.25rem 0.6rem;
          }
        }
      `}</style>
    </div>
  );
}