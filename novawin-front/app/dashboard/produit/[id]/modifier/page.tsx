'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/src/lib/api';
import ProduitForm from '@/src/components/ProduitForm';
import type { Produit } from '@/src/types/produit';

export default function EditProduitPage() {
  const { id } = useParams<{ id: string }>();
  const [produit, setProduit] = useState<Produit | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { apiFetch(`/produits/${id}`).then(setProduit).catch((err) => setError(err.message)); }, [id]);

  if (error) return <div className="alert alert-danger" style={{ borderRadius: 12, background: 'rgba(220,53,69,0.12)', color: '#dc3545', border: 'none' }}>{error}</div>;
  if (!produit) return <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>;

  return (
    <div className="container-fluid p-0">
      <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}><i className="fas fa-pen me-2" style={{ color: 'var(--emerald)' }}></i>Modifier {produit.nom}</h2>
      <ProduitForm produit={produit} />
    </div>
  );
}