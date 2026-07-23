'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { apiFetch } from '@/src/lib/api';
import type { HistoriqueDetail } from '@/src/types/historique';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

const FMT_ICON: Record<string, string> = { json: 'fa-file-code', csv: 'fa-file-csv', xlsx: 'fa-file-excel', xls: 'fa-file-excel' };
const FMT_COLOR: Record<string, string> = { json: '#f0a500', csv: '#00ffa3', xlsx: '#1d6f42', xls: '#1d6f42' };

export default function HistoriqueShowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [h, setH] = useState<HistoriqueDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/historique-importation/${id}`).then(setH).catch((err) => setError(err.message));
  }, [id]);

  async function confirmDelete() {
    const result = await Swal.fire({
      title: 'Supprimer cette entrée ?',
      html: `<p style="color:var(--text-secondary);">Cette entrée du journal sera supprimée définitivement. Les produits ne seront pas affectés.</p>`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-trash me-1"></i> Supprimer', cancelButtonText: 'Annuler',
      ...swalTheme(), customClass: { popup: 'rounded-4', confirmButton: 'btn btn-danger px-4 py-2 rounded-pill', cancelButton: 'btn btn-secondary px-4 py-2 rounded-pill' },
    });
    if (!result.isConfirmed) return;
    try {
      await apiFetch(`/historique-importation/${id}`, { method: 'DELETE' });
      router.push('/dashboard/import/historique');
    } catch (err: any) {
      Swal.fire({ title: 'Erreur', text: err.message, icon: 'error', confirmButtonColor: '#dc3545', ...swalTheme() });
    }
  }

  if (error) return <div className="alert alert-danger" style={{ borderRadius: 12, border: 'none', background: 'rgba(220,53,69,0.12)', color: '#dc3545' }}>{error}</div>;
  if (!h) return <p style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement...</p>;

  const taux = h.nombreLignes > 0 ? Math.round((h.nombreImportes / h.nombreLignes) * 100) : 0;
  const fmtColor = FMT_COLOR[h.formatFichier] || '#6c757d';

  const statutDisplay = (() => {
    switch (h.statut) {
      case 'succes':
      case 'succes_avec_warnings':
        return { color: '#28a745', icon: 'fa-check-circle', label: 'Réussi' };
      case 'partiel':
        return { color: '#f0a500', icon: 'fa-exclamation-circle', label: 'Partiel' };
      case 'echec':
        return { color: '#dc3545', icon: 'fa-times-circle', label: 'Échoué' };
      default:
        return { color: '#6c757d', icon: 'fa-clock', label: 'En cours' };
    }
  })();

  return (
    <div className="container-fluid p-0">

      <div className="d-flex align-items-center gap-2 mb-4" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        <Link href="/dashboard/import/historique" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <i className="fas fa-history me-1"></i>Historique d&apos;import
        </Link>
        <i className="fas fa-chevron-right" style={{ fontSize: '0.6rem', opacity: 0.5 }}></i>
        <span style={{ color: 'var(--text-primary)' }}>{h.nomFichier}</span>
      </div>

      <div className="card border-0 rounded-4 mb-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 52, height: 52, background: `${fmtColor}18`, flexShrink: 0 }}>
                <i className={`fas ${FMT_ICON[h.formatFichier] || 'fa-file'} fa-lg`} style={{ color: fmtColor }}></i>
              </div>
              <div>
                <h5 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>{h.nomFichier}</h5>
                <div className="d-flex align-items-center gap-3 flex-wrap" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span><i className="fas fa-calendar-alt me-1"></i>{h.dateImportation ? new Date(h.dateImportation).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span>
                  <span><i className="fas fa-user me-1"></i>{h.user ? `${h.user.prenom} ${h.user.nom}` : '—'}</span>
                  <span className="badge rounded-pill px-2 py-1" style={{ background: 'rgba(255,255,255,0.06)', color: fmtColor, fontSize: '0.65rem' }}>.{h.formatFichier.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="text-end">
              <div className="fw-bold" style={{ color: statutDisplay.color, fontSize: '1.1rem' }}>
                <i className={`fas ${statutDisplay.icon} me-1`}></i>{statutDisplay.label}
              </div>
              {h.messageResume && <div className="small mt-1" style={{ color: 'var(--text-secondary)' }}>{h.messageResume}</div>}
            </div>
          </div>

          <div className="row g-3 mt-2">
            <div className="col-6 col-md-3">
              <div className="rounded-3 p-3 text-center" style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                <div className="fw-bold fs-3" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>{h.nombreLignes}</div>
                <div className="small mt-1" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-list me-1"></i>Lignes lues</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="rounded-3 p-3 text-center" style={{ background: 'rgba(40,167,69,0.06)', border: '1px solid rgba(40,167,69,0.2)' }}>
                <div className="fw-bold fs-3" style={{ color: '#28a745', lineHeight: 1 }}>{h.nombreImportes}</div>
                <div className="small mt-1" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-check me-1"></i>Importés</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="rounded-3 p-3 text-center" style={{ background: 'rgba(220,53,69,0.06)', border: `1px solid rgba(220,53,69,${h.nombreErreurs > 0 ? '0.3' : '0.1'})` }}>
                <div className="fw-bold fs-3" style={{ color: h.nombreErreurs > 0 ? '#dc3545' : 'var(--text-secondary)', lineHeight: 1 }}>{h.nombreErreurs}</div>
                <div className="small mt-1" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-times me-1"></i>Erreurs</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="rounded-3 p-3 text-center" style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                <div className="fw-bold fs-3" style={{ color: 'var(--emerald)', lineHeight: 1 }}>{taux}<span style={{ fontSize: '0.8rem' }}>%</span></div>
                <div className="small mt-1" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-chart-pie me-1"></i>Taux réussite</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {h.erreurs.length > 0 ? (
        <div className="card border-0 rounded-4 mb-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
          <div className="card-body p-0">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h6 className="fw-bold mb-0" style={{ color: '#dc3545' }}>
                <i className="fas fa-exclamation-triangle me-2"></i>Lignes ignorées ({h.erreurs.length})
              </h6>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--bg-body)' }}>
                  <tr>
                    <th className="px-4 py-2" style={{ color: 'var(--text-secondary)', width: 80 }}>Ligne</th>
                    <th className="px-4 py-2" style={{ color: 'var(--text-secondary)', width: 160 }}>SKU</th>
                    <th className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>Message d&apos;erreur</th>
                  </tr>
                </thead>
                <tbody>
                  {h.erreurs.map((err, i) => (
                    <tr key={i} style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-2 text-center">
                        <span className="badge rounded-pill" style={{ background: 'rgba(220,53,69,0.12)', color: '#dc3545', fontSize: '0.7rem' }}>{err.ligne ?? '—'}</span>
                      </td>
                      <td className="px-4 py-2"><code style={{ color: 'var(--emerald)', fontSize: '0.8rem' }}>{err.sku ?? '—'}</code></td>
                      <td className="px-4 py-2" style={{ color: '#dc3545' }}>
                        <i className="fas fa-exclamation-circle me-1" style={{ fontSize: '0.75rem' }}></i>{err.erreur ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-0 rounded-4 mb-4" style={{ background: 'rgba(40,167,69,0.05)', border: '1.5px solid rgba(40,167,69,0.2)' }}>
          <div className="card-body p-3 d-flex align-items-center gap-3">
            <i className="fas fa-check-circle fa-lg" style={{ color: '#28a745' }}></i>
            <span style={{ color: '#28a745', fontWeight: 600 }}>Aucune erreur détectée — toutes les lignes ont été importées avec succès.</span>
          </div>
        </div>
      )}

      <div className="d-flex gap-2 flex-wrap">
        <Link href="/dashboard/import/historique" className="btn px-4" style={{ background: 'transparent', border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 10, fontSize: '0.88rem' }}>
          <i className="fas fa-arrow-left me-2"></i>Retour à l&apos;historique
        </Link>
        <Link href="/dashboard/produit" className="btn px-4 fw-semibold" style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 10, fontSize: '0.88rem' }}>
          <i className="fas fa-box me-2"></i>Voir les produits
        </Link>
        <button type="button" onClick={confirmDelete} className="btn px-4" style={{ background: 'transparent', border: '1.5px solid rgba(220,53,69,0.4)', color: '#dc3545', borderRadius: 10, fontSize: '0.88rem' }}>
          <i className="fas fa-trash me-2"></i>Supprimer cette entrée
        </button>
      </div>
    </div>
  );
}