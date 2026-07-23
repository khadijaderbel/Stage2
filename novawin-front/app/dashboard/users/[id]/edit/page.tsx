'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import type { User } from '@/src/types/user';
import '@/app/globals.css';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    role: 'ROLE_USER',
    actif: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get token from cookies
  const getToken = () => {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? match[1] : null;
  };

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        setDebugInfo('');

        const token = getToken();
        setDebugInfo(`Token: ${token ? '✅ Présent' : '❌ Manquant'}`);
        
        if (!token) {
          router.push('/login');
          return;
        }

        // Afficher l'URL complète
        const url = `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`;
        setDebugInfo(prev => `${prev} | URL: ${url}`);

        console.log('🔍 Fetching user with ID:', userId);
        console.log('🔍 URL:', url);
        console.log('🔍 Token:', token);

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('🔍 Response status:', res.status);
        setDebugInfo(prev => `${prev} | Status: ${res.status}`);

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          if (res.status === 404) {
            throw new Error(`Utilisateur avec l'ID "${userId}" non trouvé`);
          }
          const data = await res.json().catch(() => ({}));
          console.log('🔍 Error response:', data);
          throw new Error(data.message || `Erreur ${res.status} lors du chargement de l'utilisateur`);
        }

        const data: User = await res.json();
        console.log('🔍 User data received:', data);
        
        setUser(data);
        setFormData({
          prenom: data.prenom,
          nom: data.nom,
          email: data.email,
          password: '',
          role: data.role,
          actif: data.actif,
        });
        setDebugInfo(prev => `${prev} | ✅ Chargé avec succès`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
        console.error('❌ Error:', errorMessage);
        setError(errorMessage);
        setDebugInfo(prev => `${prev} | ❌ Erreur: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    } else {
      setError('ID utilisateur manquant');
      setLoading(false);
    }
  }, [userId, router]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.prenom.trim() || formData.prenom.trim().length < 2) {
      errors.prenom = 'Le prénom est obligatoire (minimum 2 caractères)';
    }

    if (!formData.nom.trim() || formData.nom.trim().length < 2) {
      errors.nom = 'Le nom est obligatoire (minimum 2 caractères)';
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Veuillez saisir une adresse email valide';
    }

    if (formData.password && formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const payload: any = {
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        email: formData.email.trim(),
        role: formData.role,
        actif: formData.actif,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      console.log('🔍 Updating user with payload:', payload);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('🔍 Update response status:', res.status);

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur lors de la modification');
      }

      const data = await res.json();
      setSuccessMessage('Utilisateur modifié avec succès !');

      await Swal.fire({
        icon: 'success',
        title: 'Modifié !',
        text: 'L\'utilisateur a été modifié avec succès.',
        timer: 2000,
        showConfirmButton: false,
      });

      router.push('/dashboard/users');
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get role label
  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      'ROLE_SUPER_ADMIN': 'Super Administrateur',
      'ROLE_ADMIN': 'Administrateur',
      'ROLE_USER': 'Utilisateur',
    };
    return labels[role] || role;
  };

  // Get role options for select
  const getRoleOptions = () => {
    return ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN'];
  };

  if (loading) {
    return (
      <div className="container-fluid p-0">
        <div className="text-center py-5">
          <div className="spinner-border text-emerald" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2 text-muted" style={{ color: 'var(--text-secondary)' }}>
            Chargement de l'utilisateur...
          </p>
          {debugInfo && (
            <p className="mt-2" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
              {debugInfo}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="container-fluid p-0">
        <div className="alert alert-danger alert-dismissible fade show" role="alert" style={{ borderRadius: '12px', border: 'none', background: 'rgba(220, 53, 69, 0.12)', color: '#dc3545' }}>
          <i className="fas fa-exclamation-circle me-2"></i> {error}
          <button type="button" className="btn-close" onClick={() => router.push('/dashboard/users')} aria-label="Close" style={{ filter: 'var(--btn-close-filter)' }}></button>
        </div>
        {debugInfo && (
          <div className="mt-2 p-3" style={{ background: 'var(--bg-body)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Informations de débogage :</strong>
            <pre className="mt-1 mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container-fluid p-0">
      {/* Messages Flash */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert" style={{ borderRadius: '12px', border: 'none', background: 'rgba(40, 167, 69, 0.12)', color: '#28a745' }}>
          <i className="fas fa-check-circle me-2"></i> {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)} aria-label="Close" style={{ filter: 'var(--btn-close-filter)' }}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert" style={{ borderRadius: '12px', border: 'none', background: 'rgba(220, 53, 69, 0.12)', color: '#dc3545' }}>
          <i className="fas fa-exclamation-circle me-2"></i> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close" style={{ filter: 'var(--btn-close-filter)' }}></button>
        </div>
      )}

      {/* Formulaire */}
      <div className="card border-0 shadow-sm rounded-4" style={{ background: 'var(--card-bg-light)', border: '1px solid var(--border-color)' }}>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-4">
              {/* Prénom */}
              <div className="col-md-6">
                <label htmlFor="prenom" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Prénom *
                </label>
                <input
                  type="text"
                  id="prenom"
                  className={`form-control ${formErrors.prenom ? 'is-invalid' : ''}`}
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem'
                  }}
                  value={formData.prenom}
                  onChange={(e) => {
                    setFormData({ ...formData, prenom: e.target.value });
                    if (formErrors.prenom) {
                      setFormErrors({ ...formErrors, prenom: '' });
                    }
                  }}
                  required
                />
                {formErrors.prenom && (
                  <div className="invalid-feedback">{formErrors.prenom}</div>
                )}
              </div>

              {/* Nom */}
              <div className="col-md-6">
                <label htmlFor="nom" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Nom *
                </label>
                <input
                  type="text"
                  id="nom"
                  className={`form-control ${formErrors.nom ? 'is-invalid' : ''}`}
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem'
                  }}
                  value={formData.nom}
                  onChange={(e) => {
                    setFormData({ ...formData, nom: e.target.value });
                    if (formErrors.nom) {
                      setFormErrors({ ...formErrors, nom: '' });
                    }
                  }}
                  required
                />
                {formErrors.nom && (
                  <div className="invalid-feedback">{formErrors.nom}</div>
                )}
              </div>

              {/* Email */}
              <div className="col-12">
                <label htmlFor="email" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem'
                  }}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: '' });
                    }
                  }}
                  required
                />
                {formErrors.email && (
                  <div className="invalid-feedback">{formErrors.email}</div>
                )}
              </div>

              {/* Password */}
              <div className="col-12">
                <label htmlFor="password" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  id="password"
                  className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem'
                  }}
                  placeholder="Laisser vide pour conserver le mot de passe actuel"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: '' });
                    }
                  }}
                />
                <small style={{ color: 'var(--text-secondary)' }}>
                  Minimum 6 caractères si vous souhaitez changer le mot de passe.
                </small>
                {formErrors.password && (
                  <div className="invalid-feedback">{formErrors.password}</div>
                )}
              </div>

              {/* Rôle */}
              <div className="col-md-6">
                <label htmlFor="role" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Rôle *
                </label>
                <select
                  id="role"
                  className="form-control"
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem'
                  }}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {getRoleOptions().map((role) => (
                    <option key={role} value={role}>{getRoleLabel(role)}</option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div className="col-md-6">
                <label htmlFor="actif" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Statut *
                </label>
                <select
                  id="actif"
                  className="form-control"
                  style={{
                    background: 'var(--bg-body)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '10px',
                    padding: '0.6rem 1rem'
                  }}
                  value={formData.actif ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.value === 'true' })}
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
            </div>

            {/* Boutons */}
            <div className="mt-4 d-flex gap-3">
              <button
                type="submit"
                className="btn px-4 py-2 fw-semibold"
                style={{
                  background: 'var(--emerald)',
                  color: '#0b1329',
                  border: 'none',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}
                disabled={submitting}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,255,163,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'} me-2`}></i>
                {submitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>

              <Link
                href="/dashboard/users"
                className="btn px-4 py-2 fw-semibold"
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--emerald)';
                  e.currentTarget.style.color = 'var(--emerald)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <i className="fas fa-times me-2"></i> Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .form-control.is-invalid {
          border-color: #dc3545 !important;
        }

        .form-control.is-invalid:focus {
          box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
        }

        .invalid-feedback {
          display: block;
          color: #dc3545;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .form-control:focus {
          border-color: var(--emerald);
          box-shadow: 0 0 0 0.2rem rgba(0, 255, 163, 0.15);
        }

        .btn-close {
          filter: var(--btn-close-filter);
        }
      `}</style>
    </div>
  );
}