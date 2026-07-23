'use client';

import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { apiFetch, downloadFile } from '@/src/lib/api';
import { getAiProvider } from '@/src/lib/aiProvider';

function swalTheme() {
  return {
    background: getComputedStyle(document.documentElement).getPropertyValue('--card-bg-light').trim() || '#fff',
    color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1a2744',
  };
}

interface ImportFormProps {
  onImported: () => void;
  cancelSlot: React.ReactNode;       // bouton "Annuler" (modale) ou lien "Retour" (page)
  dropzoneSize?: 'sm' | 'lg';        // py-4 (modale) vs py-5 (page pleine, comme le Twig)
}

export default function ImportForm({ onImported, cancelSlot, dropzoneSize = 'sm' }: ImportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function resetFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validateAndSetFile(f: File) {
    const allowed = ['csv', 'xlsx', 'xls', 'json'];
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      Swal.fire({ title: 'Format non supporté', text: `Le fichier « ${f.name} » n'est pas accepté.`, icon: 'error', confirmButtonColor: '#dc3545', ...swalTheme() });
      return;
    }
    setFile(f);
  }

  async function runImport(formData: FormData) {
    setSubmitting(true);
    try {
      const data = await apiFetch('/produits/import', { method: 'POST', body: formData });
      await handleResult(data, formData);
    } catch (err: any) {
      await Swal.fire({ title: '❌ Erreur', text: err.message, icon: 'error', confirmButtonColor: '#dc3545', ...swalTheme() });
      setSubmitting(false);
    }
  }

  async function handleResult(data: any, formData: FormData) {
    if (data.action === 'format_incompatible') {
      const lignesListe = data.lignes.map((l: any) => `
        <li style="margin:4px 0;color:var(--text-secondary);font-size:0.85rem;">
          Ligne ${l.ligne} (SKU: ${l.sku}) :
          <code style="background:rgba(220,53,69,0.1);color:#dc3545;padding:1px 6px;border-radius:4px;">${l.valeur}</code>
        </li>`).join('');

      const result = await Swal.fire({
        title: '⚠️ Format des caractéristiques incompatible',
        html: `<div style="text-align:left;"><p style="color:var(--text-secondary);margin-bottom:12px;">La virgule et le point-virgule ne sont pas autorisés. Utilisez un retour à la ligne.</p>
          <ul style="list-style:none;padding:0;max-height:220px;overflow-y:auto;">${lignesListe}</ul></div>`,
        icon: 'warning', showCancelButton: true, showDenyButton: true,
        confirmButtonText: '<i class="fas fa-magic me-1"></i> Corriger automatiquement',
        denyButtonText: "Annuler l'import", cancelButtonText: 'Fermer',
        confirmButtonColor: '#00ffa3', denyButtonColor: '#dc3545',
        ...swalTheme(), customClass: { popup: 'rounded-4' },
      });
      if (result.isConfirmed) { formData.set('fixFormat', '1'); return runImport(formData); }
      setSubmitting(false);
      return;
    }

    if (data.action === 'categories_manquantes') {
      const categoriesList = data.categoriesInconnues.map((c: string) => `<li style="margin:4px 0;color:var(--text-secondary);">📁 ${c}</li>`).join('');

      const result = await Swal.fire({
        title: '🏷️ Catégories manquantes',
        html: `<div style="text-align:left;"><p style="color:var(--text-secondary);margin-bottom:12px;">Ces catégories n'existent pas :</p><ul style="list-style:none;padding:0;">${categoriesList}</ul></div>`,
        icon: 'question', showCancelButton: true, showDenyButton: true,
        confirmButtonText: '<i class="fas fa-plus me-1"></i> Créer les catégories',
        denyButtonText: 'Ignorer et importer', cancelButtonText: 'Annuler',
        confirmButtonColor: '#00ffa3', denyButtonColor: '#6c757d', cancelButtonColor: '#dc3545',
        ...swalTheme(), customClass: { popup: 'rounded-4' },
      });

      if (result.isConfirmed) {
        Swal.fire({ title: 'Création en cours...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), ...swalTheme() });
        await Promise.all(data.categoriesInconnues.map((cat: string) =>
          apiFetch('/produits/import/create-category', { method: 'POST', body: JSON.stringify({ nom: cat }) }).catch(() => null)
        ));
        formData.set('skipCategories', '1');
        return runImport(formData);
      } else if (result.isDenied) {
        formData.set('skipCategories', '1');
        return runImport(formData);
      }
      setSubmitting(false);
      return;
    }

    const conf: Record<string, { icon: any; color: string; title: string }> = {
      succes: { icon: 'success', color: '#00ffa3', title: '✅ Importation terminée' },
      succes_avec_warnings: { icon: 'success', color: '#d4a017', title: '✅ Importation réussie (avec avertissements)' },
      deja_existe: { icon: 'info', color: '#64b4ff', title: 'ℹ️ Aucune modification' },
      partiel: { icon: 'warning', color: '#f0a500', title: '⚠️ Importation partielle' },
      echec: { icon: 'error', color: '#dc3545', title: "❌ Échec de l'importation" },
    };
    const c = conf[data.action] || conf.succes;

    let detailsHtml = '';
    if (data.compteurs) {
      const items = [];
      if (data.compteurs.crees > 0) items.push(`<span style="color:#28a745;">${data.compteurs.crees} créé(s)</span>`);
      if (data.compteurs.mis_a_jour > 0) items.push(`<span style="color:#00cc82;">${data.compteurs.mis_a_jour} mis à jour</span>`);
      if (data.compteurs.deja_existe > 0) items.push(`<span style="color:#6c757d;">${data.compteurs.deja_existe} déjà existant(s)</span>`);
      if (data.compteurs.erreurs > 0) items.push(`<span style="color:#dc3545;">${data.compteurs.erreurs} erreur(s)</span>`);
      if (items.length) detailsHtml = `<div style="margin:12px 0;">${items.join(' · ')}</div>`;
    }

    let warningsHtml = '';
    if (data.avertissements?.length > 0) {
      const warnings = data.avertissements.slice(0, 5).map((w: any) => `<li style="color:#ffc107;font-size:0.85rem;">⚠️ Ligne ${w.ligne} (SKU: ${w.sku}) : ${w.avertissement}</li>`).join('');
      const more = data.avertissements.length > 5 ? `<li style="color:var(--text-secondary);font-size:0.85rem;">... et ${data.avertissements.length - 5} autre(s)</li>` : '';
      warningsHtml = `<div style="margin-top:8px;"><p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:4px;"><i class="fas fa-info-circle" style="color:#ffc107;"></i> Avertissements :</p><ul style="list-style:none;padding:0;margin:0;">${warnings}${more}</ul></div>`;
    }

    await Swal.fire({
      title: c.title,
      html: `<div style="text-align:left;"><p style="color:var(--text-secondary);">${data.message}</p>${detailsHtml}${warningsHtml}
        <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:8px;"><i class="fas fa-info-circle" style="color:#64b4ff;"></i> L'historique a été enregistré.</p></div>`,
      icon: c.icon, confirmButtonColor: c.color,
      ...swalTheme(), customClass: { popup: 'rounded-4' },
    });

    setSubmitting(false);
    resetFile();
    if (data.action !== 'echec') onImported();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('importFile', file);
    formData.append('aiProvider', getAiProvider());
    await runImport(formData);
  }

  const dzPadding = dropzoneSize === 'lg' ? 'py-5' : 'py-4';
  const dzIconSize = dropzoneSize === 'lg' ? 'fa-3x' : 'fa-2x';

  return (
    <div>
      <div className="template-download-box mb-3">
        <div className="template-download-label"><i className="fas fa-download" style={{ color: '#64b4ff' }}></i> Pas sûr du format ? Téléchargez un template :</div>
        <div className="d-flex gap-2 flex-wrap mt-2">
          <button type="button" className="template-download-btn csv" onClick={() => downloadFile('/produits/import/template?format=csv', 'template_import_produits.csv')}>
            <i className="fas fa-file-csv"></i> Template CSV
          </button>
          <button type="button" className="template-download-btn excel" onClick={() => downloadFile('/produits/import/template?format=excel', 'template_import_produits.xls')}>
            <i className="fas fa-file-excel"></i> Template Excel
          </button>
        </div>
      </div>

      <div className="import-rules-box mb-3">
        <button type="button" className={`import-rules-toggle ${rulesOpen ? 'open' : ''}`} onClick={() => setRulesOpen(!rulesOpen)}>
          <span><i className="fas fa-list-check me-2" style={{ color: '#64b4ff' }}></i>Voir le format de fichier attendu</span>
          <i className="fas fa-chevron-down"></i>
        </button>
        <div className={`import-rules-content ${rulesOpen ? 'open' : ''}`}>
          <table className="table table-sm import-rules-table mb-2">
            <thead><tr><th>Colonne</th><th>Obligatoire</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>sku</code></td><td><span className="badge-req">Oui</span></td><td>Détecte les doublons.</td></tr>
              <tr><td><code>nom</code></td><td><span className="badge-req">Oui</span></td><td>Nom du produit.</td></tr>
              <tr><td><code>categorie</code></td><td><span className="badge-req">Oui</span></td><td>Créée sur proposition si inconnue.</td></tr>
              <tr><td><code>statut</code></td><td><span className="badge-req">Oui</span></td><td>actif, inactif, rupture.</td></tr>
              <tr><td><code>caracteristiques</code></td><td><span className="badge-req">Oui</span></td><td>Une par ligne, jamais séparées par une virgule.</td></tr>
              <tr><td><code>image_url</code></td><td><span className="badge-opt">Non</span></td><td>Ignorée si invalide (non bloquant).</td></tr>
            </tbody>
          </table>
          <ul className="import-rules-notes small mb-0">
            <li>Un SKU existant est <strong>entièrement mis à jour</strong>.</li>
            <li>Image/description invalides → avertissement, jamais bloquant.</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div id="importDropZone" className={`text-center ${dzPadding} rounded-3`}
             style={{ border: `2px dashed ${dragOver ? 'var(--emerald)' : 'var(--border-color)'}`, cursor: 'pointer' }}
             onClick={() => fileInputRef.current?.click()}
             onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
             onDragLeave={() => setDragOver(false)}
             onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]); }}>
          <i className={`fas fa-cloud-upload-alt ${dzIconSize} mb-2`} style={{ color: 'var(--text-secondary)' }}></i>
          <p className="mb-1 fw-semibold" style={{ color: 'var(--text-primary)' }}>Glissez votre fichier ici</p>
          <p className="mb-0 small" style={{ color: 'var(--text-secondary)' }}>ou cliquez pour parcourir</p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.json" className="d-none"
                 onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])} />
        </div>
        {file && <div className="mt-2 small text-center" style={{ color: 'var(--emerald)' }}><i className="fas fa-file-check me-1"></i>{file.name} ({(file.size / 1024).toFixed(1)} Ko)</div>}

        <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
          <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(0,255,163,0.1)', color: 'var(--emerald)', fontSize: '0.75rem' }}><i className="fas fa-file-csv me-1"></i> CSV</span>
          <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(29,111,66,0.1)', color: '#1d6f42', fontSize: '0.75rem' }}><i className="fas fa-file-excel me-1"></i> Excel (.xlsx, .xls)</span>
          <span className="badge rounded-pill px-3 py-2" style={{ background: 'rgba(240,165,0,0.1)', color: '#f0a500', fontSize: '0.75rem' }}><i className="fas fa-file-code me-1"></i> JSON</span>
        </div>

        <div className="d-flex justify-content-center gap-2 mt-4">
          <button type="submit" disabled={!file || submitting} className="btn px-4 py-2 fw-semibold"
                  style={{ background: 'var(--emerald)', color: '#0b1329', border: 'none', borderRadius: 12, opacity: !file || submitting ? 0.5 : 1 }}>
            <i className="fas fa-upload me-2"></i>{submitting ? 'Importation en cours...' : 'Importer'}
          </button>
          {cancelSlot}
        </div>
      </form>
    </div>
  );
}