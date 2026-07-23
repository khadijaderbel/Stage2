'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProductSplitButton({ onImportClick }: { onImportClick: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="nova-split-btn" ref={ref}>
      <div className="nova-split-main" onClick={() => router.push('/dashboard/produit/nouveau')}>
        <i className="fas fa-plus"></i>
        <span>Nouveau produit</span>
      </div>
      <div className="nova-split-arrow" onClick={() => setOpen((o) => !o)}>
        <i className="fas fa-chevron-down" style={{ transform: open ? 'rotate(180deg)' : 'none' }}></i>
      </div>
      <div className={`nova-split-menu ${open ? 'open' : ''}`}>
        <div className="nova-split-menu-item" onClick={() => router.push('/dashboard/produit/nouveau')}>
          <div className="nova-split-menu-icon" style={{ background: 'rgba(0,255,163,0.12)' }}>
            <i className="fas fa-pen" style={{ color: 'var(--emerald)' }}></i>
          </div>
          <div>
            <div className="nova-split-menu-label">Saisie manuelle</div>
            <div className="nova-split-menu-desc">Créer un produit via le formulaire</div>
          </div>
        </div>
        <div className="nova-split-menu-divider"></div>
        <div className="nova-split-menu-item" onClick={() => { setOpen(false); onImportClick(); }}>
          <div className="nova-split-menu-icon" style={{ background: 'rgba(100,180,255,0.12)' }}>
            <i className="fas fa-file-import" style={{ color: '#64b4ff' }}></i>
          </div>
          <div>
            <div className="nova-split-menu-label">Importer une liste</div>
            <div className="nova-split-menu-desc">CSV, Excel ou JSON</div>
          </div>
        </div>
      </div>
    </div>
  );
}