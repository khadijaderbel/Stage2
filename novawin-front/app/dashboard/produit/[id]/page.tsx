'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/src/lib/api';
import type { Produit } from '@/src/types/produit';

export default function ShowProduitPage() {
  const { id } = useParams<{ id: string }>();
  const [produit, setProduit] = useState<Produit | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { apiFetch(`/produits/${id}`).then(setProduit).catch((err) => setError(err.message)); }, [id]);

  if (error) return <div className="alert alert-danger" style={{ borderRadius: 12, background: 'rgba(220,53,69,0.12)', color: '#dc3545', border: 'none' }}>{error}</div>;
  if (!produit) return <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>;

  return (
    <div className="container-fluid p-0">
      <div className="card border-0 shadow-sm rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            {produit.imageUrl
              ? <img src={produit.imageUrl} alt={produit.nom} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border-color)' }} />
              : <div style={{ width: 80, height: 80, borderRadius: 12, background: 'var(--bg-body)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-image" style={{ color: 'var(--text-secondary)' }}></i></div>}
            <div><h3 className="mb-1" style={{ color: 'var(--text-primary)' }}>{produit.nom}</h3><span style={{ color: 'var(--emerald)', fontFamily: 'monospace' }}>{produit.sku}</span></div>
          </div>

          <div className="row g-4">
            <div className="col-6 col-md-3"><label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Catégorie</label><p style={{ color: 'var(--text-primary)' }}>{produit.categorie?.nom || '—'}</p></div>
            <div className="col-6 col-md-3"><label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Statut</label><p style={{ color: 'var(--text-primary)' }}>{produit.statut}</p></div>
            <div className="col-6 col-md-3"><label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Créé par</label><p style={{ color: 'var(--text-primary)' }}>{produit.utilisateur ? `${produit.utilisateur.prenom} ${produit.utilisateur.nom}` : '—'}</p></div>
            <div className="col-6 col-md-3"><label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Date création</label><p style={{ color: 'var(--text-primary)' }}>{produit.dateCreation ? new Date(produit.dateCreation).toLocaleDateString('fr-FR') : '—'}</p></div>

            <div className="col-12">
              <label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Caractéristiques</label>
              {produit.caracteristiques
                ? <ul style={{ color: 'var(--text-primary)' }}>{produit.caracteristiques.split('\n').filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}</ul>
                : <p style={{ color: 'var(--text-secondary)' }}>Aucune</p>}
            </div>
            <div className="col-12 col-md-6"><label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Description originale</label><p style={{ color: 'var(--text-secondary)' }}>{produit.descriptionOriginale || 'Aucune'}</p></div>
            <div className="col-12 col-md-6"><label className="text-uppercase small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Description IA</label><p style={{ color: 'var(--text-secondary)' }}>{produit.descriptionGeneree || 'Aucune'}</p></div>
          </div>

          <div className="mt-4 d-flex gap-3">
            <Link href={`/dashboard/produit/${produit.id}/modifier`} className="btn px-4 py-2 fw-semibold" style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 12 }}><i className="fas fa-edit me-2"></i>Modifier</Link>
            <Link href="/dashboard/produit" className="btn px-4 py-2 fw-semibold" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', borderRadius: 12 }}><i className="fas fa-arrow-left me-2"></i>Retour</Link>
          </div>
        </div>
      </div>
    </div>
  );
}