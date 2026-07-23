'use client';

import { useEffect, useState } from 'react';
import { apiFetch, downloadFile } from '@/src/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  id: number | null;
  filename: string;
}

export default function HistoriquePreviewModal({ open, onClose, id, filename }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!open || id == null) return;
    setLoading(true);
    setError(false);
    setData(null);
    apiFetch(`/historique-importation/${id}/preview`)
      .then((res) => { if (res.success) setData(res); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, id]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)', maxWidth: 960, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>
              <i className="fas fa-file-import me-2" style={{ color: '#64b4ff' }}></i>
              Prévisualisation du fichier : <span style={{ color: 'var(--emerald)' }}>{filename}</span>
            </h5>
            <button className="btn-close" onClick={onClose} style={{ filter: 'invert(0.5)' }}></button>
          </div>

          {loading && (
            <div className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
              <i className="fas fa-spinner fa-spin fa-3x mb-3"></i>
              <p>Chargement du fichier...</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-5">
              <i className="fas fa-exclamation-triangle fa-3x mb-3" style={{ color: '#dc3545' }}></i>
              <p style={{ color: 'var(--text-secondary)' }}>Impossible de charger le fichier.</p>
            </div>
          )}

          {!loading && !error && data && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge" style={{ background: 'rgba(0,255,163,0.1)', color: 'var(--emerald)' }}>{data.format?.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => id != null && downloadFile(`/historique-importation/${id}/download`, filename)}
                  className="btn btn-sm"
                  style={{ background: 'rgba(100,180,255,0.1)', color: '#64b4ff', border: '1px solid rgba(100,180,255,0.3)', borderRadius: 8 }}
                >
                  <i className="fas fa-download me-1"></i>Télécharger
                </button>
              </div>

              <div style={{ maxHeight: 500, overflow: 'auto', background: 'var(--bg-body)', borderRadius: 12, padding: 16, border: '1px solid var(--border-color)' }}>
                {data.isCsv && data.previewData?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover" style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      <thead>
                        <tr>{Object.keys(data.previewData[0]).map((hd: string) => <th key={hd} style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{hd}</th>)}</tr>
                      </thead>
                      <tbody>
                        {data.previewData.map((row: any, i: number) => (
                          <tr key={i}>{Object.keys(data.previewData[0]).map((hd: string) => <td key={hd}>{row[hd] || ''}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{data.content}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}