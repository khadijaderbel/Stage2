'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/src/lib/api';
import type { Categorie } from '@/src/types/categorie';

export default function ShowCategoriePage() {
  const { id } = useParams<{ id: string }>();
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/categories/${id}`)
      .then((data) => { if (!cancelled) setCategorie(data); })
      .catch((err: any) => { if (!cancelled) setError(err.message || 'Catégorie introuvable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}><i className="fas fa-spinner fa-spin me-2"></i>Chargement...</p>;
  }

  if (error || !categorie) {
    return (
      <div className="container-fluid p-0">
        <div className="alert alert-danger" style={{ borderRadius: 12, border: 'none', background: 'rgba(220,53,69,0.12)', color: '#dc3545' }}>
          <i className="fas fa-exclamation-circle me-2"></i>{error || 'Catégorie introuvable.'}
        </div>
        <Link href="/dashboard/categories" className="btn px-4 py-2"
              style={{ background: 'transparent', border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 12 }}>
          <i className="fas fa-arrow-left me-2"></i>Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>
        Consultez les informations de <strong style={{ color: 'var(--text-primary)' }}>{categorie.nom}</strong>
      </p>

      <div className="card border-0 shadow-sm rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-12">
              <div className="mb-3">
                <label className="text-muted small text-uppercase fw-semibold" style={{ color: 'var(--text-secondary)' }}>Nom</label>
                <p className="fs-4 fw-bold" style={{ color: 'var(--text-primary)' }}>{categorie.nom}</p>
              </div>

              <div className="mb-3">
                <label className="text-muted small text-uppercase fw-semibold" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <p style={{ color: 'var(--text-secondary)' }}>{categorie.description || 'Aucune description'}</p>
              </div>

              <div className="mb-3">
                <label className="text-muted small text-uppercase fw-semibold" style={{ color: 'var(--text-secondary)' }}>Créé par</label>
                <p style={{ color: 'var(--text-primary)' }}>
                  <i className="fas fa-user-circle me-2" style={{ color: 'var(--emerald)' }}></i>
                  {categorie.utilisateur ? `${categorie.utilisateur.prenom} ${categorie.utilisateur.nom}` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 d-flex gap-3">
            <Link href={`/dashboard/categories/${categorie.id}/modifier`} className="btn px-4 py-2 fw-semibold"
                  style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 12 }}>
              <i className="fas fa-edit me-2"></i> Modifier
            </Link>

            <Link href="/dashboard/categories" className="btn px-4 py-2 fw-semibold"
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', borderRadius: 12 }}>
              <i className="fas fa-arrow-left me-2"></i> Retour
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}