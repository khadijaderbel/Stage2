'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { apiFetch } from '@/src/lib/api';
import type { Produit, Pagination } from '@/src/types/produit';
import ImportModal from '@/src/components/ImportModal';
import ExportModal from '@/src/components/ExportModal';
import NewProductSplitButton from '@/src/components/NewProductSplitButton';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

type SortOption = 'nom-asc' | 'nom-desc' | 'sku-asc' | 'sku-desc' | 'date-desc' | 'date-asc';

export default function ProduitPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<{ id: number; nom: string }[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [sort, setSort] = useState<SortOption>('nom-asc');

  function load() {
    setLoading(true);
    apiFetch(`/produits?page=${page}`)
      .then((data) => { setProduits(data.produits || []); setCategories(data.categories || []); setPagination(data.pagination || null); })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const f = filterCategorie.toLowerCase();
    const rows = produits.filter((p) => (!s || p.nom.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)) && (!f || p.categorie?.nom.toLowerCase() === f));
    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'nom-asc': return a.nom.localeCompare(b.nom, 'fr');
        case 'nom-desc': return b.nom.localeCompare(a.nom, 'fr');
        case 'sku-asc': return a.sku.localeCompare(b.sku, 'fr');
        case 'sku-desc': return b.sku.localeCompare(a.sku, 'fr');
        case 'date-asc': return (a.dateCreation || '').localeCompare(b.dateCreation || '');
        case 'date-desc': return (b.dateCreation || '').localeCompare(a.dateCreation || '');
        default: return 0;
      }
    });
  }, [produits, search, filterCategorie, sort]);

  async function handleDelete(produit: Produit) {
    const result = await Swal.fire({
      title: 'Confirmer la suppression',
      html: `<p>Supprimer <strong style="color:var(--text-primary);">${produit.nom}</strong> ?</p>`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Supprimer', ...swalTheme(), customClass: { popup: 'rounded-4' },
    });
    if (!result.isConfirmed) return;
    try {
      await apiFetch(`/produits/${produit.id}`, { method: 'DELETE' });
      load();
      Swal.fire({ title: 'Supprimé', icon: 'success', timer: 1500, showConfirmButton: false, ...swalTheme() });
    } catch (err: any) {
      Swal.fire({ title: 'Erreur', text: err.message, icon: 'error', confirmButtonColor: '#dc3545', ...swalTheme() });
    }
  }

  if (loading && produits.length === 0) return <p style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement...</p>;

  return (
    <div className="container-fluid p-0">
      {error && <div className="alert alert-danger" style={{ borderRadius: 12, border: 'none', background: 'rgba(220,53,69,0.12)', color: '#dc3545' }}>{error}</div>}

      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-box me-2" style={{ color: 'var(--emerald)' }}></i>Liste des Produits
            <span className="badge rounded-pill ms-2" style={{ background: 'var(--emerald)', color: '#0b1329', fontSize: '0.75rem' }}>{pagination?.totalItems ?? 0}</span>
          </h2>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-info-circle me-1"></i>Gérez votre catalogue de produits</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button onClick={() => setExportOpen(true)} className="btn px-4 py-2 fw-semibold" style={{ background: 'rgba(100,180,255,0.12)', color: '#64b4ff', border: '1.5px solid rgba(100,180,255,0.3)', borderRadius: 12 }}>
            <i className="fas fa-file-export me-2"></i>Exporter
          </button>
          <NewProductSplitButton onImportClick={() => setImportOpen(true)} />
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-4">
              <input type="text" className="form-control" placeholder="Rechercher par nom ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)}
                     style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="col-12 col-md-3">
              <select className="form-select" value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)} style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c.id} value={c.nom.toLowerCase()}>{c.nom}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="nom-asc">Nom A → Z</option>
                <option value="nom-desc">Nom Z → A</option>
                <option value="sku-asc">SKU A → Z</option>
                <option value="sku-desc">SKU Z → A</option>
                <option value="date-desc">Plus récent</option>
                <option value="date-asc">Plus ancien</option>
              </select>
            </div>
            <div className="col-12 col-md-2 text-end">
              {(search || filterCategorie) && (
                <button onClick={() => { setSearch(''); setFilterCategorie(''); }} className="btn btn-sm" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <i className="fas fa-times me-1"></i>Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
              <thead style={{ background: 'var(--bg-body)' }}>
                <tr>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>SKU</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>NOM</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>CATÉGORIE</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>STATUT</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>DATE</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold text-end" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
                    <i className="fas fa-box-open fa-3x d-block mb-3" style={{ opacity: 0.5 }}></i>Aucun produit.
                  </td></tr>
                ) : filtered.map((produit) => (
                  <tr key={produit.id} className="border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3"><span style={{ color: 'var(--emerald)', fontFamily: 'monospace' }}>{produit.sku}</span></td>
                    <td className="px-4 py-3" style={{ fontWeight: 500 }}>
                      <div className="d-flex align-items-center gap-3">
                        {produit.imageUrl
                          ? <img src={produit.imageUrl} alt={produit.nom} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-body)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-image" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}></i></div>}
                        {produit.nom}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{produit.categorie?.nom || '—'}</td>
                    <td className="px-4 py-3">
                      {produit.statut === 'actif' && <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(40,167,69,0.15)', color: '#28a745' }}>Actif</span>}
                      {produit.statut === 'rupture' && <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(220,53,69,0.15)', color: '#dc3545' }}>Rupture</span>}
                      {produit.statut === 'inactif' && <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(108,117,125,0.15)', color: '#6c757d' }}>Inactif</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{produit.dateCreation ? new Date(produit.dateCreation).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Link href={`/dashboard/produit/${produit.id}`} className="btn btn-sm rounded-circle icon-btn" style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}><i className="fas fa-eye" style={{ fontSize: '0.8rem' }}></i></Link>
                        <Link href={`/dashboard/produit/${produit.id}/modifier`} className="btn btn-sm rounded-circle icon-btn" style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}><i className="fas fa-pen" style={{ fontSize: '0.8rem' }}></i></Link>
                        <button onClick={() => handleDelete(produit)} className="btn btn-sm rounded-circle icon-btn danger" style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }}><i className="fas fa-trash" style={{ fontSize: '0.8rem' }}></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pagination && pagination.pageCount > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav><ul className="pagination" style={{ gap: 6 }}>
            {page > 1 && <li><button onClick={() => setPage(page - 1)} className="page-link" style={{ borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'var(--card-bg-light)', color: 'var(--text-secondary)' }}><i className="fas fa-chevron-left" style={{ fontSize: '0.75rem' }}></i></button></li>}
            {Array.from({ length: pagination.pageCount }, (_, i) => i + 1).map((i) => (
              <li key={i}><button onClick={() => setPage(i)} className="page-link" style={{ borderRadius: 10, padding: '0.5rem 0.9rem', background: i === page ? 'var(--emerald)' : 'var(--card-bg-light)', color: i === page ? '#0b1329' : 'var(--text-secondary)', border: `1.5px solid ${i === page ? 'var(--emerald)' : 'var(--border-color)'}`, fontWeight: i === page ? 700 : 400 }}>{i}</button></li>
            ))}
            {page < pagination.pageCount && <li><button onClick={() => setPage(page + 1)} className="page-link" style={{ borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'var(--card-bg-light)', color: 'var(--text-secondary)' }}><i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i></button></li>}
          </ul></nav>
        </div>
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} categories={categories} initialSearch={search} initialCategorieNom={filterCategorie} />
    </div>
  );
}