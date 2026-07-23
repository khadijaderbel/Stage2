'use client';

import ImportForm from './ImportForm';

export default function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)', maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-file-import me-2" style={{ color: '#64b4ff' }}></i>Importer une liste de produits
            </h5>
            <button className="btn-close" onClick={onClose} style={{ filter: 'invert(0.5)' }}></button>
          </div>
          <ImportForm
            onImported={() => { onImported(); onClose(); }}
            cancelSlot={
              <button type="button" className="btn px-4 py-2" onClick={onClose}
                      style={{ background: 'transparent', border: '1.5px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 12 }}>
                Annuler
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}