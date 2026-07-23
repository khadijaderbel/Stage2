import ProduitForm from '@/src/components/ProduitForm';

export default function NewProduitPage() {
  return (
    <div className="container-fluid p-0">
      <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}><i className="fas fa-plus me-2" style={{ color: 'var(--emerald)' }}></i>Nouveau produit</h2>
      <ProduitForm />
    </div>
  );
}