'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { apiFetch } from '@/src/lib/api';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

function validateNom(value: string): string[] {
  const errors: string[] = [];
  const v = value.trim();
  if (v === '') {
    errors.push('Le nom est obligatoire.');
  } else {
    if (v.length < 2) errors.push('Le nom doit contenir au moins 2 caractères.');
    if (!/^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÆŒ]/u.test(v)) errors.push('Le nom doit commencer par une majuscule.');
    if (/^[0-9]/.test(v)) errors.push('Le nom ne peut pas commencer par un chiffre.');
    if (!/^[A-Za-zÀ-ÿ0-9\s\-]+$/u.test(v)) errors.push('Le nom ne doit contenir que des lettres, chiffres, espaces et tirets.');
  }
  return errors;
}

function buildErrorListHtml(errors: string[]) {
  return errors.map((e) => `
    <div style="padding:4px 0;display:flex;align-items:center;gap:8px;">
      <i class="fas fa-times-circle" style="color:#dc3545;font-size:14px;"></i>
      <span>${e}</span>
    </div>`).join('');
}

function swalError(title: string, errors: string[]) {
  return Swal.fire({
    title,
    html: `<div style="text-align:left;padding:10px 0;">
      <p style="color:#6c757d;margin-bottom:12px;">
        <i class="fas fa-exclamation-triangle" style="color:#ffc107;"></i>
        Veuillez corriger les erreurs suivantes :
      </p>
      <div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;border-left:4px solid #dc3545;">
        ${buildErrorListHtml(errors)}
      </div>
    </div>`,
    icon: 'error',
    confirmButtonColor: '#dc3545',
    confirmButtonText: '🔧 Corriger',
    ...swalTheme(),
    customClass: { popup: 'rounded-4', confirmButton: 'btn btn-danger px-4 py-2 rounded-pill' },
  });
}

export default function NewCategoriePage() {
  const router = useRouter();
  const nomInputRef = useRef<HTMLInputElement>(null);

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [nomStyle, setNomStyle] = useState({ borderColor: 'var(--border-color)', boxShadow: 'none' });

  function applyStyle(errors: string[], empty: boolean) {
    if (empty) setNomStyle({ borderColor: 'var(--border-color)', boxShadow: 'none' });
    else if (errors.length > 0) setNomStyle({ borderColor: '#dc3545', boxShadow: '0 0 0 0.2rem rgba(220,53,69,0.15)' });
    else setNomStyle({ borderColor: '#28a745', boxShadow: '0 0 0 0.2rem rgba(40,167,69,0.15)' });
  }

  function handleNomChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNom(e.target.value);
    applyStyle(validateNom(e.target.value), e.target.value.trim() === '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const clientErrors = validateNom(nom);
    if (clientErrors.length > 0) {
      await swalError('⚠️ Validation du formulaire', clientErrors);
      nomInputRef.current?.focus();
      nomInputRef.current?.select();
      return;
    }

    setLoading(true);
    try {
      // ⚠️ endpoint API — jamais préfixé par la route de la page
      await apiFetch('/categories', { method: 'POST', body: JSON.stringify({ nom, description }) });

      await Swal.fire({
        title: '✅ Succès',
        text: 'La catégorie a été créée avec succès.',
        icon: 'success',
        confirmButtonColor: '#28a745',
        confirmButtonText: 'OK',
        timer: 3000,
        timerProgressBar: true,
        ...swalTheme(),
        customClass: { popup: 'rounded-4', confirmButton: 'btn btn-success px-4 py-2 rounded-pill' },
      });

      router.push('/dashboard/categories');
      router.refresh();
    } catch (err: any) {
      await swalError('⚠️ Erreur de validation', err.errors || [err.message]);
      nomInputRef.current?.focus();
      nomInputRef.current?.select();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fluid p-0">
      <div className="card border-0 shadow-sm rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} id="categorieForm">
            <div className="row g-4">
              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="nomInput" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Nom</label>
                  <input
                    id="nomInput"
                    ref={nomInputRef}
                    className="form-control"
                    placeholder="Ex: Audio, Accessoires..."
                    value={nom}
                    onChange={handleNomChange}
                    onFocus={() => setNomStyle({ borderColor: 'var(--emerald)', boxShadow: '0 0 0 0.2rem rgba(0,255,163,0.15)' })}
                    onBlur={() => (nom.trim() === '' ? applyStyle([], true) : applyStyle(validateNom(nom), false))}
                    style={{ background: 'var(--bg-body)', borderColor: nomStyle.borderColor, boxShadow: nomStyle.boxShadow, color: 'var(--text-primary)', borderRadius: 10, padding: '0.6rem 1rem' }}
                  />
                  <small style={{ color: 'var(--text-secondary)' }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Doit commencer par une majuscule et ne pas commencer par un chiffre.
                  </small>
                </div>
              </div>

              <div className="col-12">
                <div className="form-group">
                  <label htmlFor="descriptionInput" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea
                    id="descriptionInput"
                    className="form-control"
                    rows={3}
                    placeholder="Description de la catégorie (optionnelle)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: 10, padding: '0.6rem 1rem' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 d-flex gap-3">
              <button type="submit" className="btn px-4 py-2 fw-semibold" disabled={loading}
                      style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 12 }}>
                <i className="fas fa-save me-2"></i> {loading ? 'Création...' : 'Créer la catégorie'}
              </button>
              <Link href="/dashboard/categories" className="btn px-4 py-2 fw-semibold"
                    style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', borderRadius: 12 }}>
                <i className="fas fa-times me-2"></i> Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}