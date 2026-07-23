'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useEffect } from 'react';
import { apiFetch } from '@/src/lib/api';
import { getAiProvider } from '@/src/lib/aiProvider';
import type { Produit } from '@/src/types/produit';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
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
    icon: 'error',
    html: `<div style="text-align:left;padding:10px 0;">
      <p style="color:#6c757d;margin-bottom:12px;">Veuillez corriger les erreurs suivantes :</p>
      <div style="background:#f8f9fa;border-radius:8px;padding:12px 16px;border-left:4px solid #dc3545;">
        ${buildErrorListHtml(errors)}
      </div>
    </div>`,
    confirmButtonColor: '#dc3545',
    confirmButtonText: '🔧 Corriger',
    ...swalTheme(),
    customClass: { popup: 'rounded-4', confirmButton: 'btn btn-danger px-4 py-2 rounded-pill' },
  });
}

type FieldStyle = { borderColor: string; boxShadow: string };
const NEUTRAL: FieldStyle = { borderColor: 'var(--border-color)', boxShadow: 'none' };
const FOCUS: FieldStyle = { borderColor: 'var(--emerald)', boxShadow: '0 0 0 0.2rem rgba(0,255,163,0.15)' };
function liveState(value: string): FieldStyle {
  const v = value.trim();
  if (!v) return NEUTRAL;
  return v.length >= 2
    ? { borderColor: '#28a745', boxShadow: '0 0 0 0.2rem rgba(40,167,69,0.15)' }
    : { borderColor: '#dc3545', boxShadow: '0 0 0 0.2rem rgba(220,53,69,0.15)' };
}

function validateForm(sku: string, nom: string, categorieId: string): string[] {
  const errors: string[] = [];
  const skuVal = sku.trim();
  const nomVal = nom.trim();

  if (!skuVal) errors.push('Le SKU est obligatoire.');
  else if (!/^[A-Z0-9\-]+$/.test(skuVal)) errors.push('Le SKU ne doit contenir que des majuscules, chiffres et tirets.');

  if (!nomVal) errors.push('Le nom du produit est obligatoire.');
  else if (nomVal.length < 2) errors.push('Le nom doit contenir au moins 2 caractères.');

  if (!categorieId) errors.push('Veuillez sélectionner une catégorie.');

  return errors;
}

export default function ProduitForm({ produit }: { produit?: Produit }) {
  const router = useRouter();
  const isEdit = !!produit;
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<{ id: number; nom: string }[]>([]);
  const [sku, setSku] = useState(produit?.sku || '');
  const [nom, setNom] = useState(produit?.nom || '');
  const [categorieId, setCategorieId] = useState(produit?.categorie?.id?.toString() || '');
  const [statut, setStatut] = useState<Produit['statut']>(produit?.statut || 'inactif');
  const [caracteristiques, setCaracteristiques] = useState(produit?.caracteristiques || '');
  const [descriptionOriginale, setDescriptionOriginale] = useState(produit?.descriptionOriginale || '');
  const [descriptionGeneree, setDescriptionGeneree] = useState(produit?.descriptionGeneree || '');
  const [imageUrl, setImageUrl] = useState(produit?.imageUrl || '');
  const [regenererIA, setRegenererIA] = useState(false);
  const [loading, setLoading] = useState(false);

  const [skuStyle, setSkuStyle] = useState<FieldStyle>(sku ? liveState(sku) : NEUTRAL);
  const [nomStyle, setNomStyle] = useState<FieldStyle>(nom ? liveState(nom) : NEUTRAL);

  useEffect(() => {
    apiFetch('/categories').then((data) => setCategories(data.categories || [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateForm(sku, nom, categorieId);
    if (errors.length > 0) {
      await swalError('⚠️ Validation du formulaire', errors);
      skuInputRef.current?.focus();
      skuInputRef.current?.select();
      return;
    }

    setLoading(true);

    const payload = {
      sku, nom, statut, caracteristiques, descriptionOriginale, descriptionGeneree,
      imageUrl, categorieId: categorieId || null,
      aiProvider: getAiProvider(),
      regenererIA: isEdit ? regenererIA : true,
    };

    try {
      const data = isEdit
        ? await apiFetch(`/produits/${produit!.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiFetch('/produits', { method: 'POST', body: JSON.stringify(payload) });

      await Swal.fire({
        title: '✅ Succès',
        text: data.message + (data.warning ? ` (${data.warning})` : ''),
        icon: 'success', confirmButtonColor: '#28a745', timer: 2500, timerProgressBar: true,
        ...swalTheme(), customClass: { popup: 'rounded-4' },
      });
      router.push('/dashboard/produit');
      router.refresh();
    } catch (err: any) {
      await swalError('⚠️ Erreur de validation', err.errors || [err.message]);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { background: 'var(--bg-body)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: 10, padding: '0.6rem 1rem' };
  const labelStyle = { color: 'var(--text-secondary)' };

  return (
    <form onSubmit={handleSubmit} id="produitForm" className="card border-0 shadow-sm rounded-4 p-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
      <div className="row g-4">

        <div className="col-md-6">
          <label className="form-label small fw-semibold" style={labelStyle}>SKU</label>
          <input
            ref={skuInputRef}
            className="form-control"
            value={sku}
            onChange={(e) => { setSku(e.target.value); setSkuStyle(liveState(e.target.value)); }}
            onFocus={() => setSkuStyle(FOCUS)}
            onBlur={() => setSkuStyle(liveState(sku))}
            style={{ ...inputStyle, borderColor: skuStyle.borderColor, boxShadow: skuStyle.boxShadow }}
          />
          <small style={{ color: 'var(--text-secondary)' }}><i className="fas fa-info-circle me-1"></i>Format : NW-PROD-01 (majuscules, chiffres, tirets)</small>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-semibold" style={labelStyle}>Nom du produit</label>
          <input
            className="form-control"
            value={nom}
            onChange={(e) => { setNom(e.target.value); setNomStyle(liveState(e.target.value)); }}
            onFocus={() => setNomStyle(FOCUS)}
            onBlur={() => setNomStyle(liveState(nom))}
            style={{ ...inputStyle, borderColor: nomStyle.borderColor, boxShadow: nomStyle.boxShadow }}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-semibold" style={labelStyle}>Catégorie</label>
          <select className="form-select" value={categorieId} onChange={(e) => setCategorieId(e.target.value)} style={inputStyle}>
            <option value="">— Sélectionner une catégorie —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-semibold" style={labelStyle}>Statut</label>
          <select className="form-select" value={statut} onChange={(e) => setStatut(e.target.value as Produit['statut'])} style={inputStyle}>
            <option value="inactif">Inactif</option>
            <option value="actif">Actif</option>
            <option value="rupture">Rupture</option>
          </select>
        </div>

        <div className="col-12">
          <label className="form-label small fw-semibold" style={labelStyle}>URL de l&apos;image</label>
          <input className="form-control" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
        </div>

        <div className="col-12">
          <label className="form-label small fw-semibold" style={labelStyle}>Caractéristiques</label>
          <textarea className="form-control" rows={3} value={caracteristiques} onChange={(e) => setCaracteristiques(e.target.value)} style={inputStyle} />
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-semibold" style={labelStyle}>Description originale</label>
          <textarea className="form-control" rows={4} value={descriptionOriginale} onChange={(e) => setDescriptionOriginale(e.target.value)} style={inputStyle} />
        </div>

        <div className="col-md-6">
          <label className="form-label small fw-semibold" style={labelStyle}>Description générée</label>
          <textarea className="form-control" rows={4} value={descriptionGeneree} onChange={(e) => setDescriptionGeneree(e.target.value)} style={inputStyle} />
        </div>

        {isEdit && (
          <div className="col-12 mt-3">
            <IaToggleCard checked={regenererIA} onChange={setRegenererIA} />
          </div>
        )}
      </div>

      <div className="mt-4 d-flex gap-3">
        <button type="submit" disabled={loading} className="btn px-4 py-2 fw-semibold produit-btn-submit"
                style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 12 }}>
          <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'} me-2`}></i>
          {loading
            ? (isEdit ? 'Enregistrement...' : 'Génération IA de la description en cours...')
            : (isEdit ? 'Enregistrer les modifications' : 'Créer le produit')}
        </button>
        <Link href="/dashboard/produit" className="btn px-4 py-2 fw-semibold produit-btn-cancel"
              style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border-color)', borderRadius: 12 }}>
          <i className="fas fa-times me-2"></i>Annuler
        </Link>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  Toggle IA animé — visible uniquement en édition
// ══════════════════════════════════════════════════════════
function IaToggleCard({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const [pulse, setPulse] = useState(false);

  function handleToggle() {
    const next = !checked;
    onChange(next);
    if (next) {
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
    }
  }

  return (
    <div
      className="ia-toggle-card p-4 rounded-4"
      style={{
        background: pulse
          ? 'linear-gradient(135deg, rgba(0,255,163,0.12) 0%, rgba(0,255,163,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(0,255,163,0.08) 0%, rgba(0,255,163,0.02) 100%)',
        border: `2px solid ${checked ? 'var(--emerald)' : 'rgba(0,255,163,0.2)'}`,
        boxShadow: checked ? '0 0 30px rgba(0,255,163,0.15)' : 'none',
        position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease',
      }}
    >
      <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 80, opacity: 0.05, pointerEvents: 'none' }}>
        <i className="fas fa-robot"></i>
      </div>

      <div className="d-flex align-items-center gap-4 flex-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, background: 'linear-gradient(135deg, var(--emerald), #00d4a0)', borderRadius: '50%', flexShrink: 0 }}>
          <i className="fas fa-wand-magic-sparkles" style={{ color: '#0b1329', fontSize: 22 }}></i>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Génération IA de la description</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            <i className="fas fa-robot me-1"></i>Activez pour régénérer automatiquement la description (et l&apos;image si besoin) avec l&apos;IA
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            <i className="fas fa-edit me-1"></i>Manuel
          </span>

          <label style={{ position: 'relative', display: 'inline-block', width: 60, height: 32, cursor: 'pointer' }}>
            <input type="checkbox" checked={checked} onChange={handleToggle} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
            <span style={{
              position: 'absolute', inset: 0, backgroundColor: checked ? 'var(--emerald)' : '#cbd5e1',
              transition: 'all 0.3s ease', borderRadius: 34, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <span style={{
                position: 'absolute', height: 26, width: 26, left: 3, bottom: 3, backgroundColor: 'white',
                transition: 'all 0.3s ease', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: checked ? 'translateX(28px)' : 'translateX(0)',
              }} />
            </span>
          </label>

          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--emerald)' }}>
            <i className="fas fa-robot me-1"></i>IA
            <span style={{
              display: 'inline-block', background: 'var(--emerald)', color: '#0b1329', fontSize: '0.65rem',
              fontWeight: 700, padding: '2px 8px', borderRadius: 50, marginLeft: 4, textTransform: 'uppercase',
              letterSpacing: '0.5px', opacity: checked ? 1 : 0.5,
            }}>
              Actif
            </span>
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,255,163,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', background: 'rgba(0,255,163,0.12)', color: 'var(--emerald)', padding: '4px 12px', borderRadius: 50, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-check-circle" style={{ fontSize: 10 }}></i>Utilise les données actuelles
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-info-circle"></i>Laissez décoché pour conserver vos modifications manuelles
          </span>
        </div>
      </div>
    </div>
  );
}