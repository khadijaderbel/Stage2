'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, downloadFile } from '@/src/lib/api';

interface PreviewProduit { sku: string; nom: string; categorie: string; statut: string; date_creation: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  categories: { id: number; nom: string }[];
  initialSearch?: string;
  initialCategorieNom?: string;
}

export default function ExportModal({ open, onClose, categories, initialSearch = '', initialCategorieNom = '' }: Props) {
  const [statut, setStatut] = useState('');
  const [categorieId, setCategorieId] = useState('');
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState<'csv' | 'excel' | 'json' | 'pdf'>('csv');
  const [loading, setLoading] = useState(false);
  const [produits, setProduits] = useState<PreviewProduit[]>([]);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch(initialSearch);
    setStatut('');
    setFormat('csv');
    if (initialCategorieNom) {
      const match = categories.find((c) => c.nom.toLowerCase() === initialCategorieNom);
      setCategorieId(match ? String(match.id) : '');
    } else {
      setCategorieId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function refreshPreview(overrides?: { statut?: string; categorieId?: string; search?: string }) {
    setLoading(true);
    const params = new URLSearchParams();
    const s = overrides?.statut ?? statut;
    const c = overrides?.categorieId ?? categorieId;
    const q = overrides?.search ?? search;
    if (s) params.append('statut', s);
    if (c) params.append('categorie', c);
    if (q) params.append('search', q);

    apiFetch(`/produits/export/preview?${params.toString()}`)
      .then((data) => { setProduits(data.produits || []); setTotal(data.total || 0); })
      .catch(() => { setProduits([]); setTotal(0); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open) refreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, statut, categorieId]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refreshPreview(), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (!open) return null;

  const activeFilters: { label: string; value: string }[] = [];
  if (statut) activeFilters.push({ label: 'Statut', value: statut });
  if (categorieId) {
    const cat = categories.find((c) => String(c.id) === categorieId);
    if (cat) activeFilters.push({ label: 'Catégorie', value: cat.nom });
  }
  if (search) activeFilters.push({ label: 'Recherche', value: search });

  function handleDownload() {
    const params = new URLSearchParams({ format });
    if (statut) params.append('statut', statut);
    if (categorieId) params.append('categorie', categorieId);
    if (search) params.append('search', search);
    const ext: Record<string, string> = { csv: 'csv', excel: 'xls', json: 'json', pdf: 'html' };
    downloadFile(`/produits/export?${params.toString()}`, `produits.${ext[format]}`);
    onClose();
  }

  const formatIcon: Record<string, string> = { csv: 'fa-file-csv', excel: 'fa-file-excel', json: 'fa-file-code', pdf: 'fa-file-pdf' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)', maxWidth: 900, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-file-export me-2" style={{ color: '#64b4ff' }}></i>Exporter les produits
            </h5>
            <button className="btn-close" onClick={onClose} style={{ filter: 'invert(0.5)' }}></button>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-toggle-on me-1"></i>Statut</label>
              <select className="form-select" value={statut} onChange={(e) => setStatut(e.target.value)} style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="rupture">Rupture</option>
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-tags me-1"></i>Catégorie</label>
              <select className="form-select" value={categorieId} onChange={(e) => setCategorieId(e.target.value)} style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-search me-1"></i>Recherche</label>
              <input type="text" className="form-control" placeholder="Filtrer par nom ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)}
                     style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
          </div>

          <div className="small mb-3" style={{ color: 'var(--text-secondary)' }}>
            <i className="fas fa-info-circle me-1"></i>Filtres actifs :{' '}
            {activeFilters.length > 0
              ? activeFilters.map((f, i) => (
                  <span key={i}>{i > 0 && ' • '}{f.label}: <strong style={{ color: 'var(--text-primary)' }}>{f.value}</strong></span>
                ))
              : <strong style={{ color: 'var(--text-primary)' }}>Tous les produits</strong>}
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small fw-semibold" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-list me-1"></i>Produits à exporter
              <span className="badge rounded-pill ms-2" style={{ background: 'var(--emerald)', color: '#0b1329' }}>{total}</span>
            </span>
          </div>

          <div className="table-responsive" style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="table table-sm table-hover" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-body)', zIndex: 10 }}>
                <tr><th style={{ width: '15%' }}>SKU</th><th style={{ width: '35%' }}>Nom</th><th style={{ width: '20%' }}>Catégorie</th><th style={{ width: '15%' }}>Statut</th><th style={{ width: '15%' }}>Date</th></tr>
              </thead>
              <tbody>
                {produits.slice(0, 20).map((p, i) => {
                  const color = p.statut === 'actif' ? '#28a745' : p.statut === 'rupture' ? '#dc3545' : '#6c757d';
                  return (
                    <tr key={i}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--emerald)' }}>{p.sku}</span></td>
                      <td>{p.nom}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.categorie || '-'}</td>
                      <td><span style={{ color, fontWeight: 600 }}>{p.statut}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.date_creation || '-'}</td>
                    </tr>
                  );
                })}
                {produits.length > 20 && (
                  <tr><td colSpan={5} style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>... et {produits.length - 20} autre{produits.length - 20 > 1 ? 's' : ''}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && <div className="text-center py-3" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement...</div>}
          {!loading && produits.length === 0 && (
            <div className="text-center py-3" style={{ color: 'var(--text-secondary)' }}>
              <i className="fas fa-search fa-2x d-block mb-2" style={{ opacity: 0.4 }}></i>
              <p className="mb-0">Aucun produit ne correspond à ces critères.</p>
            </div>
          )}

          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}><i className="fas fa-download me-1"></i>Format d&apos;export</label>
                <div className="d-flex gap-2 flex-wrap">
                  {(['csv', 'excel', 'json', 'pdf'] as const).map((f) => (
                    <button key={f} type="button" className={`btn btn-sm export-format-btn ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}
                            style={format === f ? undefined : { background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', borderRadius: 8, padding: '0.4rem 1rem' }}>
                      <i className={`fas ${formatIcon[f]}`}></i> {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-12 col-md-6 text-md-end">
                <button type="button" onClick={handleDownload} disabled={total === 0} className="btn px-4 py-2 fw-semibold"
                        style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 10, opacity: total === 0 ? 0.5 : 1 }}>
                  <i className="fas fa-download me-1"></i>Télécharger
                </button>
                <button type="button" onClick={onClose} className="btn px-4 py-2 ms-2" style={{ background: 'transparent', border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 10 }}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}