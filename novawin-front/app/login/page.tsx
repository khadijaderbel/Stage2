'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '@/app/globals.css';
import '@/app/auth.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired') === '1';
  const registered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login_check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Email ou mot de passe incorrect.');
      }

      const data = await res.json();
      document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
        <div className="flip-card">
          <div className="flip-card-inner">
            <div className="flip-card-front">
              <div className="auth-logo">
                <div className="logo-wrapper">
                  <div className="logo-glow"></div>
                  <i className="fas fa-cube" style={{ fontSize: '2rem', color: '#00ffa3' }}></i>
                </div>
                <h1>NOVA<span>WIN</span></h1>
                <p>Console de Contrôle Administrative</p>
              </div>

              {registered && !error && (
                <div className="alert-custom alert-success">
                  <i className="fas fa-check-circle"></i> Compte créé avec succès ! Vous pouvez maintenant vous connecter.
                </div>
              )}
              {expired && !error && (
                <div className="alert-custom alert-danger">
                  <i className="fas fa-exclamation-circle"></i> Votre session a expiré. Veuillez vous reconnecter.
                </div>
              )}
              {error && (
                <div className="alert-custom alert-danger">
                  <i className="fas fa-exclamation-circle"></i> {error}
                </div>
              )}

              <div className="section-title">
                <h5><i className="fas fa-sign-in-alt"></i>Se connecter</h5>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="login_email"><i className="fas fa-envelope me-1"></i> Adresse email</label>
                  <div className="input-group-custom">
                    <span className="input-group-text"><i className="fas fa-user"></i></span>
                    <input
                      type="email"
                      className="form-control-custom"
                      id="login_email"
                      placeholder="nom@novawin.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="login_password"><i className="fas fa-lock me-1"></i> Mot de passe</label>
                  <div className="input-group-custom">
                    <span className="input-group-text"><i className="fas fa-key"></i></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control-custom"
                      id="login_password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                    </button>
                  </div>
                </div>

                <div className="form-check-custom">
                  <input type="checkbox" id="remember_me" />
                  <label htmlFor="remember_me">Se souvenir de moi</label>
                </div>

                <button type="submit" className="btn-primary-custom" disabled={loading}>
                  <span className="btn-content">
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Connexion...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt"></i> Se connecter
                      </>
                    )}
                  </span>
                </button>

                <div className="security-badge">
                  <i className="fas fa-shield-alt"></i> Réseau interne d&apos;administration sécurisé
                </div>
              </form>

              <div className="auth-footer">
                Pas encore de compte ?
                <Link href="/register">
                  Créer un compte <i className="fas fa-arrow-right flip-toggle-icon"></i>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}