'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { apiFetch, downloadFile } from '@/src/lib/api';
import type { HistoriqueListItem, HistoriqueStats } from '@/src/types/historique';
import HistoriquePreviewModal from '@/src/components/HistoriquePreviewModal';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

const FMT_ICON: Record<string, string> = { json: 'fa-file-code', csv: 'fa-file-csv', xlsx: 'fa-file-excel', xls: 'fa-file-excel' };
const FMT_COLOR: Record<string, string> = { json: '#f0a500', csv: '#00ffa3', xlsx: '#1d6f42', xls: '#1d6f42' };

function statutLabel(statut: string) {
  const map: Record<string, { color: string; icon: string; label: string }> = {
    succes: { color: '#28a745', icon: 'fa-circle', label: 'Réussi' },
    succes_avec_warnings: { color: '#d4a017', icon: 'fa-exclamation-triangle', label: 'Réussi ⚠️' },
    partiel: { color: '#f0a500', icon: 'fa-circle', label: 'Partiel' },
    echec: { color: '#dc3545', icon: 'fa-circle', label: 'Échoué' },
  };
  const s = map[statut] || { color: '#6c757d', icon: 'fa-circle fa-spin', label: 'En cours' };
  return <span className="d-flex align-items-center gap-1 fw-semibold" style={{ color: s.color, fontSize: '0.88rem' }}><i className={`fas ${s.icon}`} style={{ fontSize: '0.5rem' }}></i>{s.label}</span>;
}

export default function HistoriqueIndexPage() {
  const [historiques, setHistoriques] = useState<HistoriqueListItem[]>([]);
  const [stats, setStats] = useState<HistoriqueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');

  function load() {
    setLoading(true);
    apiFetch('/historique-importation')
      .then((data) => { setHistoriques(data.historiques || []); setStats(data.stats || null); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openPreview(h: HistoriqueListItem) {
    setPreviewId(h.id);
    setPreviewFilename(h.nomFichier);
    setPreviewOpen(true);
  }

  async function confirmClear() {
    const result = await Swal.fire({
      title: "Vider l'historique ?",
      html: `<div style="text-align:left;">
        <p style="color:var(--text-secondary);">Toutes les entrées d'historique seront <strong style="color:#dc3545;">définitivement supprimées</strong>.</p>
        <p style="font-size:0.9rem;color:var(--text-secondary);"><i class="fas fa-info-circle" style="color:#64b4ff;"></i> Les produits importés ne seront <strong>pas</strong> supprimés.</p>
      </div>`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-trash me-1"></i> Vider', cancelButtonText: '<i class="fas fa-times me-1"></i> Annuler',
      ...swalTheme(), customClass: { popup: 'rounded-4', confirmButton: 'btn btn-danger px-4 py-2 rounded-pill', cancelButton: 'btn btn-secondary px-4 py-2 rounded-pill' },
    });
    if (!result.isConfirmed) return;
    try {
      await apiFetch('/historique-importation', { method: 'DELETE' });
      load();
      Swal.fire({ title: 'Historique vidé', icon: 'success', timer: 1500, showConfirmButton: false, ...swalTheme() });
    } catch (err: any) {
      Swal.fire({ title: 'Erreur', text: err.message, icon: 'error', confirmButtonColor: '#dc3545', ...swalTheme() });
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement...</p>;
  if (error) return <div className="alert alert-danger" style={{ borderRadius: 12, border: 'none', background: 'rgba(220,53,69,0.12)', color: '#dc3545' }}>{error}</div>;

  return (
    <div className="container-fluid p-0">

      <div className="mb-4">
        <h2 className="mb-1 fw-bold" style={{ color: 'var(--text-primary)' }}>Gestion des Importations</h2>
        <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
          Historique d&apos;exécution. Les catalogues peuvent être importés à tout moment via l&apos;outil d&apos;import de l&apos;onglet{' '}
          <Link href="/dashboard/produit" style={{ color: 'var(--emerald)', textDecoration: 'none' }}>Produits</Link>.
        </p>
      </div>

      <div className="row g-3 mb-4">
        {[
          { icon: 'fa-file-import', color: 'var(--emerald)', bg: 'rgba(0,255,163,0.1)', value: stats?.total ?? 0, label: 'Total imports', textColor: 'var(--text-primary)' },
          { icon: 'fa-check-circle', color: '#28a745', bg: 'rgba(40,167,69,0.12)', value: stats?.succes ?? 0, label: 'Réussis', textColor: '#28a745' },
          { icon: 'fa-exclamation-triangle', color: '#d4a017', bg: 'rgba(212,160,23,0.15)', value: stats?.succes_warnings ?? 0, label: 'Avec avertissements', textColor: '#d4a017' },
          { icon: 'fa-times-circle', color: '#dc3545', bg: 'rgba(220,53,69,0.12)', value: (stats?.echec ?? 0) + (stats?.partiel ?? 0), label: 'Avec erreurs', textColor: '#dc3545' },
        ].map((s, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card border-0 rounded-4 h-100" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42, background: s.bg }}>
                    <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '1rem' }}></i>
                  </div>
                  <div>
                    <div className="fw-bold fs-4" style={{ color: s.textColor, lineHeight: 1 }}>{s.value}</div>
                    <div className="small" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-0">
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h6 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>Journal de traitement des imports</h6>
            {historiques.length > 0 && (
              <button type="button" onClick={confirmClear} className="btn btn-sm" style={{ background: 'transparent', border: 'none', color: '#dc3545', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}>
                Vider l&apos;historique
              </button>
            )}
          </div>

          {historiques.length === 0 ? (
            <div className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
              <i className="fas fa-history fa-3x d-block mb-3" style={{ opacity: 0.3 }}></i>
              <p className="mb-1 fw-semibold" style={{ color: 'var(--text-primary)' }}>Aucun import effectué</p>
              <p className="mb-3 small">Les imports apparaîtront ici dès que vous utiliserez l&apos;outil d&apos;import dans la gestion des produits.</p>
              <Link href="/dashboard/produit" className="btn btn-sm px-4 fw-semibold" style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 10 }}>
                <i className="fas fa-arrow-left me-2"></i>Aller aux produits
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
                <thead style={{ background: 'var(--bg-body)' }}>
                  <tr>
                    <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)', width: 160 }}>DATE / HEURE</th>
                    <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>NOM DU FICHIER</th>
                    <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>RÉSULTATS</th>
                    <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>STATUT</th>
                    <th className="px-4 py-3 text-uppercase small fw-bold text-end" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {historiques.map((h) => (
                    <tr key={h.id} className="border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {h.dateImportation ? new Date(h.dateImportation).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`fas ${FMT_ICON[h.formatFichier] || 'fa-file'}`} style={{ color: FMT_COLOR[h.formatFichier] || '#6c757d', fontSize: '0.95rem' }}></i>
                          <button onClick={() => openPreview(h)} className="btn btn-link p-0 m-0 text-start" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                            <span style={{ borderBottom: '1px dashed var(--border-color)' }}>{h.nomFichier}</span>
                            <i className="fas fa-eye ms-1" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}></i>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{h.nombreLignes} ligne{h.nombreLignes > 1 ? 's' : ''}</span>
                        {h.nombreErreurs > 0 && <span className="ms-2" style={{ color: '#dc3545', fontSize: '0.75rem' }}>({h.nombreErreurs} erreur{h.nombreErreurs > 1 ? 's' : ''})</span>}
                        {h.statut === 'echec' && h.nombreLignes === 0 && <span style={{ color: '#dc3545' }}> (Format invalide)</span>}
                      </td>
                      <td className="px-4 py-3">{statutLabel(h.statut)}</td>
                      <td className="px-4 py-3 text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            onClick={() => downloadFile(`/historique-importation/${h.id}/download`, h.nomFichier)}
                            className="btn btn-sm rounded-circle"
                            title="Télécharger le fichier original"
                            style={{ width: 34, height: 34, border: '1.5px solid rgba(100,180,255,0.3)', color: '#64b4ff', background: 'rgba(100,180,255,0.06)' }}
                          >
                            <i className="fas fa-download" style={{ fontSize: '0.8rem' }}></i>
                          </button>
                          <Link href={`/dashboard/import/historique/${h.id}`} className="btn btn-sm rounded-circle icon-btn" title="Voir le journal"
                                style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}>
                            <i className="fas fa-file-lines" style={{ fontSize: '0.8rem' }}></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <HistoriquePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} id={previewId} filename={previewFilename} />
    </div>
  );
}