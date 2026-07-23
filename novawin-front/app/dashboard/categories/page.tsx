'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { apiFetch } from '@/src/lib/api';
import type { Categorie } from '@/src/types/categorie';

type SortOption = 'nom-asc' | 'nom-desc' | 'user-asc' | 'user-desc';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

export default function CategoriePage() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortOption>('nom-asc');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/categories')
      .then((data) => {
        if (!cancelled) setCategories(Array.isArray(data?.categories) ? data.categories : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Impossible de charger les catégories.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const totalRows = categories.length;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const f = filter.toLowerCase();

    const rows = categories.filter((c) => {
      const nom = c.nom.toLowerCase();
      const user = c.utilisateur ? `${c.utilisateur.prenom} ${c.utilisateur.nom}`.toLowerCase() : '';
      return (!s || nom.includes(s) || user.includes(s)) && (!f || nom === f);
    });

    return [...rows].sort((a, b) => {
      const nomA = a.nom.toLowerCase(), nomB = b.nom.toLowerCase();
      const userA = a.utilisateur ? `${a.utilisateur.prenom} ${a.utilisateur.nom}`.toLowerCase() : '';
      const userB = b.utilisateur ? `${b.utilisateur.prenom} ${b.utilisateur.nom}`.toLowerCase() : '';
      switch (sort) {
        case 'nom-asc': return nomA.localeCompare(nomB, 'fr');
        case 'nom-desc': return nomB.localeCompare(nomA, 'fr');
        case 'user-asc': return userA.localeCompare(userB, 'fr');
        case 'user-desc': return userB.localeCompare(userA, 'fr');
        default: return 0;
      }
    });
  }, [categories, search, filter, sort]);

  async function handleDelete(categorie: Categorie) {
    const result = await Swal.fire({
      title: 'Confirmer la suppression',
      html: `<div style="text-align:left;color:var(--text-secondary);">
        <p>Êtes-vous sûr de vouloir supprimer la catégorie
           <strong style="color:var(--text-primary);">${categorie.nom}</strong> ?</p>
        <p style="font-size:0.9rem;margin-top:0.5rem;">
            <i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i>
            Cette action est <strong style="color:#dc3545;">irréversible</strong>.
        </p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-trash me-2"></i>Oui, supprimer',
      cancelButtonText: '<i class="fas fa-times me-2"></i>Annuler',
      ...swalTheme(),
      customClass: { popup: 'rounded-4', confirmButton: 'btn btn-danger px-4 py-2 rounded-pill', cancelButton: 'btn btn-secondary px-4 py-2 rounded-pill' },
    });
    if (!result.isConfirmed) return;

    try {
      const data = await apiFetch(`/categories/${categorie.id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== categorie.id));
      Swal.fire({ title: 'Supprimée', text: data.message, icon: 'success', timer: 1800, showConfirmButton: false, ...swalTheme() });
    } catch (err: any) {
      Swal.fire({ title: 'Erreur', text: err.message, icon: 'error', confirmButtonColor: '#dc3545', ...swalTheme() });
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement des catégories...</p>;
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ borderRadius: 12, border: 'none', background: 'rgba(220,53,69,0.12)', color: '#dc3545' }}>
        <i className="fas fa-exclamation-circle me-2"></i>{error}
      </div>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1" style={{ color: 'var(--text-primary)' }}>
            <i className="fas fa-tags me-2" style={{ color: 'var(--emerald)' }}></i>Liste des Catégories
            <span className="badge rounded-pill ms-2" style={{ background: 'var(--emerald)', color: '#0b1329', fontSize: '0.75rem' }}>
              {filtered.length}
            </span>
          </h2>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
            <i className="fas fa-info-circle me-1"></i> Gérez vos catégories de produits
          </p>
        </div>
        <Link href="/dashboard/categories/nouvelle" className="btn px-4 py-2 fw-semibold"
              style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 12 }}>
          <i className="fas fa-plus me-2"></i> Nouvelle catégorie
        </Link>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text" style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-search"></i>
                </span>
                <input type="text" className="form-control" placeholder="Rechercher par nom ou utilisateur..."
                       value={search} onChange={(e) => { setSearch(e.target.value); setFilter(''); }}
                       style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '0 10px 10px 0' }} />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text" style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-filter"></i>
                </span>
                <select className="form-select" value={filter} onChange={(e) => { setFilter(e.target.value); setSearch(''); }}
                        style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '0 10px 10px 0' }}>
                  <option value="">— Toutes les catégories —</option>
                  {categories.map((c) => <option key={c.id} value={c.nom.toLowerCase()}>{c.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="input-group">
                <span className="input-group-text" style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-sort"></i>
                </span>
                <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
                        style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '0 10px 10px 0' }}>
                  <option value="nom-asc">Nom A → Z</option>
                  <option value="nom-desc">Nom Z → A</option>
                  <option value="user-asc">Utilisateur A → Z</option>
                  <option value="user-desc">Utilisateur Z → A</option>
                </select>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between mt-2">
            <small style={{ color: 'var(--text-secondary)' }}>
              {filtered.length === 0 ? 'Aucun résultat'
                : filtered.length === totalRows ? `${filtered.length} catégorie${filtered.length > 1 ? 's' : ''} au total`
                : `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} sur ${totalRows}`}
            </small>
            {(search || filter) && (
              <button onClick={() => { setSearch(''); setFilter(''); setSort('nom-asc'); }} className="btn btn-sm"
                      style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.78rem' }}>
                <i className="fas fa-times me-1"></i> Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-primary)' }}>
              <thead style={{ background: 'var(--bg-body)' }}>
                <tr>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}><i className="fas fa-tag me-2"></i>NOM</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}><i className="fas fa-align-left me-2"></i>DESCRIPTION</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}><i className="fas fa-user me-2"></i>CRÉÉ PAR</th>
                  <th className="px-4 py-3 text-uppercase small fw-bold text-end" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)' }}><i className="fas fa-tools me-2"></i>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
                    <i className="fas fa-tags fa-3x d-block mb-3" style={{ opacity: 0.5 }}></i>
                    <p className="mb-0">Aucune catégorie enregistrée pour le moment.</p>
                    <small>Cliquez sur &quot;Nouvelle catégorie&quot; pour commencer.</small>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
                    <i className="fas fa-search fa-3x d-block mb-3" style={{ opacity: 0.4 }}></i>
                    <p className="mb-0">Aucune catégorie ne correspond à votre recherche.</p>
                  </td></tr>
                ) : filtered.map((categorie) => (
                  <tr key={categorie.id} className="border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3" style={{ fontWeight: 500 }}>{categorie.nom}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {categorie.description ? (categorie.description.length > 50 ? `${categorie.description.slice(0, 50)}...` : categorie.description) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge rounded-pill px-3 py-2" style={{ background: 'var(--bg-body)', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-user-circle me-1"></i>
                        {categorie.utilisateur ? `${categorie.utilisateur.prenom} ${categorie.utilisateur.nom}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Link href={`/dashboard/categories/${categorie.id}`} className="btn btn-sm rounded-circle icon-btn"
                              style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }} title="Voir">
                          <i className="fas fa-eye" style={{ fontSize: '0.8rem' }}></i>
                        </Link>
                        <Link href={`/dashboard/categories/${categorie.id}/modifier`} className="btn btn-sm rounded-circle icon-btn"
                              style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }} title="Modifier">
                          <i className="fas fa-pen" style={{ fontSize: '0.8rem' }}></i>
                        </Link>
                        <button onClick={() => handleDelete(categorie)} className="btn btn-sm rounded-circle icon-btn danger"
                                style={{ width: 34, height: 34, border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', background: 'transparent' }} title="Supprimer">
                          <i className="fas fa-trash" style={{ fontSize: '0.8rem' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}