'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '@/app/globals.css';
import '@/app/auth.css';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    password_confirm: '',
    accept_terms: false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors || [data.message]);
        return;
      }
      router.push('/login?registered=true');
    } catch {
      setErrors(['Erreur réseau.']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="bg-particles">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>

      <div className="auth-container">
        <div className="flip-card flipped">
          <div className="flip-card-inner">
            <div className="flip-card-back">
              <div className="auth-logo">
                <div className="logo-wrapper">
                  <div className="logo-glow"></div>
                  <i className="fas fa-cube" style={{ fontSize: '2rem', color: '#00ffa3' }}></i>
                </div>
                <h1>NOVA<span>WIN</span></h1>
                <p>Rejoindre l&apos;équipe</p>
              </div>

              {errors.length > 0 && (
                <div className="alert-custom alert-danger">
                  <i className="fas fa-exclamation-circle"></i>
                  <ul>
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              <div className="section-title">
                <h5><i className="fas fa-user-plus"></i>Créer un compte</h5>
                <p>Enregistrez un nouveau compte modérateur.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="row-custom">
                  <div className="form-group">
                    <label htmlFor="signup_prenom"><i className="fas fa-user me-1"></i> Prénom</label>
                    <div className="input-group-custom">
                      <span className="input-group-text"><i className="fas fa-user-circle"></i></span>
                      <input
                        type="text"
                        className="form-control-custom"
                        id="signup_prenom"
                        placeholder="Alexandre"
                        value={form.prenom}
                        onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="signup_nom"><i className="fas fa-user me-1"></i> Nom</label>
                    <div className="input-group-custom">
                      <span className="input-group-text"><i className="fas fa-user-circle"></i></span>
                      <input
                        type="text"
                        className="form-control-custom"
                        id="signup_nom"
                        placeholder="Vincent"
                        value={form.nom}
                        onChange={(e) => setForm({ ...form, nom: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="signup_email"><i className="fas fa-envelope me-1"></i> Adresse email</label>
                  <div className="input-group-custom">
                    <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                    <input
                      type="email"
                      className="form-control-custom"
                      id="signup_email"
                      placeholder="nom@novawin.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="signup_password"><i className="fas fa-lock me-1"></i> Mot de passe</label>
                  <div className="input-group-custom">
                    <span className="input-group-text"><i className="fas fa-key"></i></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control-custom"
                      id="signup_password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="signup_password_confirm"><i className="fas fa-check-circle me-1"></i> Confirmer</label>
                  <div className="input-group-custom">
                    <span className="input-group-text"><i className="fas fa-check"></i></span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control-custom"
                      id="signup_password_confirm"
                      placeholder="••••••••"
                      value={form.password_confirm}
                      onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                    </button>
                  </div>
                </div>

                <div className="form-check-custom">
                  <input
                    type="checkbox"
                    id="accept_terms"
                    checked={form.accept_terms}
                    onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })}
                  />
                  <label htmlFor="accept_terms">
                    J&apos;accepte la <a href="#" onClick={(e) => e.preventDefault()}>charte d&apos;utilisation</a>
                  </label>
                </div>

                <button type="submit" className="btn-primary-custom" disabled={loading}>
                  <span className="btn-content">
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Création...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i> Créer le compte
                      </>
                    )}
                  </span>
                </button>

                <div className="security-badge">
                  <i className="fas fa-shield-alt"></i> Réseau interne d&apos;administration sécurisé
                </div>
              </form>

              <div className="auth-footer">
                Déjà un compte ?
                <Link href="/login">
                  <i className="fas fa-arrow-left flip-toggle-icon"></i> Se connecter
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-bottom">
          © 2026. <strong>NOVAWIN</strong> — Console de Contrôle Administrative. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}