'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/src/lib/api';
import ImportForm from '@/src/components/ImportForm';
import type { HistoriqueListItem } from '@/src/types/historique';

function statutBadge(statut: string) {
  const map: Record<string, { bg: string; color: string; icon: string; label: string }> = {
    succes: { bg: 'rgba(40,167,69,0.15)', color: '#28a745', icon: 'fa-check-circle', label: 'Succès' },
    succes_avec_warnings: { bg: 'rgba(212,160,23,0.2)', color: '#d4a017', icon: 'fa-exclamation-triangle', label: 'Succès ⚠️' },
    partiel: { bg: 'rgba(255,193,7,0.15)', color: '#ffc107', icon: 'fa-exclamation-triangle', label: 'Partiel' },
    echec: { bg: 'rgba(220,53,69,0.15)', color: '#dc3545', icon: 'fa-times-circle', label: 'Échec' },
    en_cours: { bg: 'rgba(108,117,125,0.15)', color: '#6c757d', icon: 'fa-spinner fa-spin', label: 'En cours' },
  };
  const s = map[statut] || { bg: 'rgba(108,117,125,0.15)', color: '#6c757d', icon: 'fa-clock', label: statut };
  return <span className="badge rounded-pill px-2 py-1" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon} me-1`}></i>{s.label}</span>;
}

export default function NewImportPage() {
  const [historiques, setHistoriques] = useState<HistoriqueListItem[]>([]);

  function loadHistoriques() {
    apiFetch('/historique-importation')
      .then((data) => setHistoriques((data.historiques || []).slice(0, 3)))
      .catch(() => {});
  }

  useEffect(loadHistoriques, []);

  return (
    <div className="container-fluid p-0">
      <div className="row g-4">
        <div className="col-lg-8 mx-auto">

          <div className="card border-0 shadow-sm rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(0,255,163,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <i className="fas fa-file-import fa-3x" style={{ color: 'var(--emerald)' }}></i>
                </div>
                <h4 style={{ color: 'var(--text-primary)' }}>Importation de produits</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Téléchargez un fichier contenant vos produits pour les importer en masse.
                  Les formats acceptés sont : CSV, Excel (XLSX, XLS) et JSON.
                </p>
              </div>

              <ImportForm
                dropzoneSize="lg"
                onImported={loadHistoriques}
                cancelSlot={
                  <Link href="/dashboard/produit" className="btn px-4 py-2"
                        style={{ background: 'transparent', border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 12 }}>
                    <i className="fas fa-arrow-left me-1"></i> Retour
                  </Link>
                }
              />
            </div>
          </div>

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
                    {historiques.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-3" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-info-circle me-1"></i>Aucun historique d&apos;import trouvé.</td></tr>
                    ) : historiques.map((h) => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}><i className="fas fa-file me-2" style={{ color: 'var(--text-secondary)' }}></i>{h.nomFichier}</td>
                        <td>{h.dateImportation ? new Date(h.dateImportation).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
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
      </div>
    </div>
  );
}