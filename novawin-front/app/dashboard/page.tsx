'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/src/lib/api';
import DashboardCharts from '@/src/components/DashboardCharts';
import type { DashboardStats } from '@/src/types/dashboard';

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statutBadge(statut: string) {
  const map: Record<string, { bg: string; color: string; icon: string; label: string }> = {
    succes: { bg: 'rgba(40,167,69,0.15)', color: '#28a745', icon: 'fa-check-circle', label: 'Succès' },
    succes_avec_warnings: { bg: 'rgba(40,167,69,0.15)', color: '#28a745', icon: 'fa-check-circle', label: 'Succès' },
    partiel: { bg: 'rgba(255,193,7,0.15)', color: '#ffc107', icon: 'fa-exclamation-triangle', label: 'Partiel' },
    echec: { bg: 'rgba(220,53,69,0.15)', color: '#dc3545', icon: 'fa-times-circle', label: 'Échec' },
    en_cours: { bg: 'rgba(108,117,125,0.15)', color: '#6c757d', icon: 'fa-spinner fa-spin', label: 'En cours' },
  };
  const s = map[statut] || { bg: 'rgba(108,117,125,0.15)', color: '#6c757d', icon: 'fa-clock', label: statut };
  return <span className="badge rounded-pill px-2 py-1" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon} me-1`}></i>{s.label}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prenom, setPrenom] = useState('Administrateur');
  const [error, setError] = useState('');
  const [now, setNow] = useState('');

  useEffect(() => {
    setNow(new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    apiFetch('/users/me').then((u) => setPrenom(u.prenom || 'Administrateur')).catch(() => {});
    apiFetch('/dashboard').then(setStats).catch((err: any) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-danger" style={{ borderRadius: 12, border: 'none', background: 'rgba(220,53,69,0.12)', color: '#dc3545' }}>{error}</div>;
  if (!stats) return <p style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement...</p>;

  return (
    <div className="container-fluid p-0">

      <div className="welcome-section mb-4 p-4 rounded-4" style={{ background: 'linear-gradient(135deg, rgba(0,255,163,0.08), rgba(0,255,163,0.02))', border: '1px solid rgba(0,255,163,0.15)' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap">
          <div>
            <h4 style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-hand-peace me-2" style={{ color: 'var(--emerald)' }}></i>Bonjour, <strong>{prenom}</strong>
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Voici l&apos;état de l&apos;infrastructure et de votre catalogue de produits NOVAWIN.
            </p>
          </div>
          <div>
            <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(0,255,163,0.12)', color: 'var(--emerald)', fontSize: '0.75rem' }}>
              <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>Système opérationnel
            </span>
            <span className="badge rounded-pill px-3 py-2 ms-2" style={{ background: 'rgba(100,180,255,0.12)', color: '#64b4ff', fontSize: '0.75rem' }}>
              <i className="fas fa-clock me-1"></i>{now}
            </span>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-lg-6 col-md-6">
          <div className="stat-card" style={{ borderLeftColor: 'var(--emerald)' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="stat-icon" style={{ background: 'rgba(0,255,163,0.1)', color: 'var(--emerald)' }}><i className="fas fa-box"></i></div>
                <div className="stat-number">{stats.totalProduits}</div>
                <div className="stat-label">Produits</div>
              </div>
              <div className="text-end">
                <span className="stat-status success"><i className="fas fa-check-circle"></i> {stats.produitsActifs} actifs</span>
                {stats.produitsRupture > 0 && <span className="stat-status warning d-block mt-1"><i className="fas fa-exclamation-triangle"></i> {stats.produitsRupture} rupture</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6 col-md-6">
          <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><i className="fas fa-tags"></i></div>
                <div className="stat-number">{stats.totalCategories}</div>
                <div className="stat-label">Catégories</div>
              </div>
              <div className="text-end"><span className="stat-status info"><i className="fas fa-check-circle"></i> Indexées</span></div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6 col-md-6">
          <div className="stat-card" style={{ borderLeftColor: '#a855f7' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}><i className="fas fa-users"></i></div>
                <div className="stat-number">{stats.totalUsers}</div>
                <div className="stat-label">Équipe d&apos;administration</div>
              </div>
              <div className="text-end"><span className="stat-status info"><i className="fas fa-user-check"></i> Collaborateurs</span></div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6 col-md-6">
          <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><i className="fas fa-upload"></i></div>
                <div className="stat-number">
                  {stats.dernierImport
                    ? <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '1.5rem' }}></i>
                    : <i className="fas fa-minus-circle" style={{ color: '#6c757d', fontSize: '1.5rem' }}></i>}
                </div>
                <div className="stat-label">Dernier import</div>
              </div>
              <div className="text-end">
                {stats.dernierImport ? (
                  <>
                    <span className="stat-status success"><i className="fas fa-check-circle"></i> {stats.dernierImport.statut.charAt(0).toUpperCase() + stats.dernierImport.statut.slice(1)}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{formatDateTime(stats.dernierImport.dateImportation)}</span>
                  </>
                ) : (
                  <span className="stat-status warning"><i className="fas fa-clock"></i> Aucun import</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DashboardCharts
        months={stats.importsMensuels.months}
        importCounts={stats.importsMensuels.counts}
        categories={stats.repartitionCategories.categories}
        categoryCounts={stats.repartitionCategories.counts}
      />

      <div className="card border-0 shadow-sm rounded-4 mt-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}><i className="fas fa-clock-rotate-left me-2" style={{ color: 'var(--emerald)' }}></i>Derniers imports</h6>
            <Link href="/dashboard/import/historique" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
              Voir tout <i className="fas fa-arrow-right ms-1"></i>
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table table-sm" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fichier</th>
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</th>
                  <th style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {stats.derniersImports.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-3" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-info-circle me-1"></i>Aucun historique d&apos;import trouvé.</td></tr>
                ) : stats.derniersImports.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}><i className="fas fa-file me-2" style={{ color: 'var(--text-secondary)' }}></i>{h.nomFichier}</td>
                    <td>{formatDateTime(h.dateImportation)}</td>
                    <td>{statutBadge(h.statut)}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {h.nombreImportes > 0 && <span style={{ color: '#28a745' }}>{h.nombreImportes} importé(s)</span>}{' '}
                      {h.nombreErreurs > 0 && <span style={{ color: '#dc3545' }}>{h.nombreErreurs} erreur(s)</span>}
                      {h.nombreImportes === 0 && h.nombreErreurs === 0 && <span style={{ color: 'var(--text-secondary)' }}>Aucune donnée</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}