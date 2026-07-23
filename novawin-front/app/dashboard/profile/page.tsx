'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import type { User } from '@/src/types/user';
import '@/app/globals.css';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [originalEmail, setOriginalEmail] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
    verification_code: '',
  });

  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);

  // Get token from cookies
  const getToken = () => {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? match[1] : null;
  };

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Erreur lors du chargement du profil');
        }

        const data: User = await res.json();
        setUser(data);
        setOriginalEmail(data.email);
        setFormData({
          prenom: data.prenom,
          nom: data.nom,
          email: data.email,
          current_password: '',
          new_password: '',
          confirm_password: '',
          verification_code: '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // Get role badge configuration
  const getRoleBadge = (role: User['role']) => {
    const roleConfig: Record<User['role'], { bg: string; color: string; icon: string; label: string }> = {
      'ROLE_SUPER_ADMIN': {
        bg: 'rgba(220, 53, 69, 0.15)',
        color: '#dc3545',
        icon: 'crown',
        label: 'SUPER ADMIN'
      },
      'ROLE_ADMIN': {
        bg: 'rgba(255, 193, 7, 0.15)',
        color: '#ffc107',
        icon: 'shield-halved',
        label: 'ADMIN'
      },
      'ROLE_USER': {
        bg: 'rgba(23, 162, 184, 0.15)',
        color: '#17a2b8',
        icon: 'user',
        label: 'USER'
      }
    };
    return roleConfig[role] || roleConfig['ROLE_USER'];
  };

  // Toggle password visibility
  const togglePassword = (field: string) => {
    const input = document.getElementById(field) as HTMLInputElement;
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  };

  // Send verification code
  const sendVerificationCode = async () => {
    const email = formData.email.trim();

    if (email === originalEmail) {
      setShowVerificationCode(false);
      setEmailChanged(false);
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormErrors({ ...formErrors, email: 'Veuillez saisir une adresse email valide' });
      return;
    }

    setIsSendingCode(true);
    setFormErrors({ ...formErrors, email: '' });

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      // Appel à l'API pour envoyer le code de vérification
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur lors de l\'envoi du code');
      }

      setShowVerificationCode(true);
      setEmailChanged(true);
      await Swal.fire({
        icon: 'success',
        title: 'Code envoyé !',
        text: 'Un code de vérification a été envoyé à votre nouvelle adresse email.',
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code',
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.prenom.trim() || formData.prenom.trim().length < 2) {
      errors.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!formData.nom.trim() || formData.nom.trim().length < 2) {
      errors.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Veuillez saisir une adresse email valide';
    }

    // Si l'email change, le code de vérification est obligatoire
    if (formData.email.trim() !== originalEmail && !formData.verification_code.trim()) {
      errors.verification_code = 'Le code de vérification est obligatoire pour changer d\'email';
    }

    if (!formData.current_password.trim()) {
      errors.current_password = 'Le mot de passe actuel est obligatoire pour toute modification';
    }

    if (formData.new_password.trim()) {
      if (formData.new_password.trim().length < 6) {
        errors.new_password = 'Le mot de passe doit contenir au moins 6 caractères';
      }
      if (formData.new_password.trim() !== formData.confirm_password.trim()) {
        errors.confirm_password = 'Les mots de passe ne correspondent pas';
      }
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
        current_password: formData.current_password,
      };

      if (formData.new_password.trim()) {
        payload.new_password = formData.new_password.trim();
        payload.confirm_password = formData.confirm_password.trim();
      }

      if (formData.email.trim() !== originalEmail && formData.verification_code.trim()) {
        payload.verification_code = formData.verification_code.trim();
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.errors?.join('\n') || 'Erreur lors de la mise à jour du profil');
      }

      const data = await res.json();
      setSuccessMessage('Profil mis à jour avec succès !');
      setOriginalEmail(formData.email);
      setShowVerificationCode(false);
      setEmailChanged(false);

      // Mettre à jour l'utilisateur
      if (data.user) {
        setUser(data.user);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Profil mis à jour !',
        text: 'Vos informations ont été modifiées avec succès.',
        timer: 2000,
        showConfirmButton: false,
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      await Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err instanceof Error ? err.message : 'Une erreur est survenue',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid p-0">
        <div className="text-center py-5">
          <div className="spinner-border text-emerald" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-2 text-muted" style={{ color: 'var(--text-secondary)' }}>
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = getRoleBadge(user.role);
  const initials = user.prenom.charAt(0) + user.nom.charAt(0);

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
          <div className="row">
            {/* Photo de profil */}
            <div className="col-md-3 text-center mb-4 mb-md-0">
              <div className="position-relative d-inline-block">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mx-auto"
                  style={{
                    width: '120px',
                    height: '120px',
                    background: 'linear-gradient(135deg, var(--emerald), var(--accent-color))',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '3rem'
                  }}
                >
                  {initials}
                </div>
                <div
                  className="position-absolute bottom-0 end-0 bg-success rounded-circle p-1 border border-2 border-white"
                  style={{ width: '28px', height: '28px' }}
                >
                  <i className="fas fa-check text-white" style={{ fontSize: '12px' }}></i>
                </div>
              </div>
              <h5 className="mt-3 fw-bold" style={{ color: 'var(--text-primary)' }}>
                {user.prenom} {user.nom}
              </h5>
              <span
                className="badge px-3 py-2 rounded-pill"
                style={{
                  background: role.bg,
                  color: role.color
                }}
              >
                <i className={`fas fa-${role.icon} me-1`}></i>
                {role.label}
              </span>
              <div className="mt-3 small text-muted" style={{ color: 'var(--text-secondary)' }}>
                <i className="fas fa-calendar-alt me-1"></i>
                Membre depuis {new Date().toLocaleDateString('fr-FR')}
              </div>
            </div>

            {/* Formulaire */}
            <div className="col-md-9">
              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-4">
                  {/* Prénom */}
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="prenom" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        <i className="fas fa-user me-1"></i> Prénom
                      </label>
                      <div className={`input-group ${formErrors.prenom ? 'error' : ''}`}>
                        <span className="input-group-text"><i className="fas fa-user-circle"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          id="prenom"
                          value={formData.prenom}
                          onChange={(e) => {
                            setFormData({ ...formData, prenom: e.target.value });
                            setFormErrors({ ...formErrors, prenom: '' });
                          }}
                          style={{
                            background: 'var(--bg-body)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                      {formErrors.prenom && (
                        <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {formErrors.prenom}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nom */}
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="nom" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        <i className="fas fa-user me-1"></i> Nom
                      </label>
                      <div className={`input-group ${formErrors.nom ? 'error' : ''}`}>
                        <span className="input-group-text"><i className="fas fa-user-circle"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          id="nom"
                          value={formData.nom}
                          onChange={(e) => {
                            setFormData({ ...formData, nom: e.target.value });
                            setFormErrors({ ...formErrors, nom: '' });
                          }}
                          style={{
                            background: 'var(--bg-body)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '10px'
                          }}
                        />
                      </div>
                      {formErrors.nom && (
                        <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {formErrors.nom}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="email" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        <i className="fas fa-envelope me-1"></i> Adresse email
                      </label>
                      <div className={`input-group ${formErrors.email ? 'error' : ''}`}>
                        <span className="input-group-text"><i className="fas fa-envelope"></i></span>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            setFormErrors({ ...formErrors, email: '' });
                            if (e.target.value !== originalEmail) {
                              setEmailChanged(true);
                            } else {
                              setEmailChanged(false);
                              setShowVerificationCode(false);
                            }
                          }}
                          style={{
                            background: 'var(--bg-body)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '10px'
                          }}
                        />
                        <button
                          type="button"
                          className="btn"
                          id="sendCodeBtn"
                          style={{
                            background: 'var(--emerald)',
                            color: '#0b1329',
                            border: 'none',
                            borderRadius: '0 10px 10px 0',
                            padding: '0.6rem 1.2rem',
                            fontWeight: 600,
                            transition: 'all 0.3s ease'
                          }}
                          onClick={sendVerificationCode}
                          disabled={isSendingCode}
                        >
                          <i className={`fas ${isSendingCode ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                          {isSendingCode ? ' Envoi...' : ' Vérifier'}
                        </button>
                      </div>
                      {formErrors.email && (
                        <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {formErrors.email}
                        </div>
                      )}
                      <div id="emailInfo" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        <i className="fas fa-info-circle me-1"></i>
                        {formData.email === originalEmail
                          ? 'Aucun changement d\'email détecté.'
                          : 'Si vous changez votre email, un code de vérification vous sera envoyé.'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Code de vérification */}
                  {showVerificationCode && (
                    <div className="col-12">
                      <div className="form-group">
                        <label htmlFor="verification_code" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                          <i className="fas fa-shield-alt me-1"></i> Code de vérification
                        </label>
                        <div className={`input-group ${formErrors.verification_code ? 'error' : ''}`}>
                          <span className="input-group-text"><i className="fas fa-key"></i></span>
                          <input
                            type="text"
                            className="form-control"
                            id="verification_code"
                            placeholder="Entrez le code reçu par email"
                            value={formData.verification_code}
                            onChange={(e) => {
                              setFormData({ ...formData, verification_code: e.target.value });
                              setFormErrors({ ...formErrors, verification_code: '' });
                            }}
                            style={{
                              background: 'var(--bg-body)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-primary)',
                              borderRadius: '10px'
                            }}
                          />
                        </div>
                        {formErrors.verification_code && (
                          <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {formErrors.verification_code}
                          </div>
                        )}
                        <div id="codeInfo" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          <i className="fas fa-clock me-1"></i> Un code a été envoyé à votre nouvelle adresse email. Valable 15 minutes.
                        </div>
                      </div>
                    </div>
                  )}

                  <hr style={{ borderColor: 'var(--border-color)' }} />

                  {/* Mot de passe actuel */}
                  <div className="col-12">
                    <div className="form-group">
                      <label htmlFor="current_password" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        <i className="fas fa-lock me-1"></i> Mot de passe actuel <span className="text-danger">*</span>
                      </label>
                      <div className={`input-group ${formErrors.current_password ? 'error' : ''}`}>
                        <span className="input-group-text"><i className="fas fa-key"></i></span>
                        <input
                          type="password"
                          className="form-control"
                          id="current_password"
                          placeholder="Entrez votre mot de passe actuel"
                          value={formData.current_password}
                          onChange={(e) => {
                            setFormData({ ...formData, current_password: e.target.value });
                            setFormErrors({ ...formErrors, current_password: '' });
                          }}
                          style={{
                            background: 'var(--bg-body)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '10px'
                          }}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => togglePassword('current_password')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '0.6rem 1rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                      {formErrors.current_password && (
                        <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {formErrors.current_password}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nouveau mot de passe */}
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="new_password" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        <i className="fas fa-key me-1"></i> Nouveau mot de passe
                      </label>
                      <div className={`input-group ${formErrors.new_password ? 'error' : ''}`}>
                        <span className="input-group-text"><i className="fas fa-key"></i></span>
                        <input
                          type="password"
                          className="form-control"
                          id="new_password"
                          placeholder="Laissez vide pour conserver"
                          value={formData.new_password}
                          onChange={(e) => {
                            setFormData({ ...formData, new_password: e.target.value });
                            setFormErrors({ ...formErrors, new_password: '' });
                          }}
                          style={{
                            background: 'var(--bg-body)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '10px'
                          }}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => togglePassword('new_password')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '0.6rem 1rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                      {formErrors.new_password && (
                        <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {formErrors.new_password}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirmer mot de passe */}
                  <div className="col-md-6">
                    <div className="form-group">
                      <label htmlFor="confirm_password" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        <i className="fas fa-check-circle me-1"></i> Confirmer
                      </label>
                      <div className={`input-group ${formErrors.confirm_password ? 'error' : ''}`}>
                        <span className="input-group-text"><i className="fas fa-check"></i></span>
                        <input
                          type="password"
                          className="form-control"
                          id="confirm_password"
                          placeholder="Confirmez le nouveau mot de passe"
                          value={formData.confirm_password}
                          onChange={(e) => {
                            setFormData({ ...formData, confirm_password: e.target.value });
                            setFormErrors({ ...formErrors, confirm_password: '' });
                          }}
                          style={{
                            background: 'var(--bg-body)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '10px'
                          }}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => togglePassword('confirm_password')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '0.6rem 1rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                      {formErrors.confirm_password && (
                        <div className="error-message" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          {formErrors.confirm_password}
                        </div>
                      )}
                    </div>
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
                    href="/dashboard"
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
        </div>
      </div>

      <style jsx>{`
        .input-group {
          border-radius: 10px;
          border: 2px solid var(--border-color);
          transition: all 0.3s ease;
          background: var(--bg-body);
        }
        .input-group:focus-within {
          border-color: var(--emerald);
          box-shadow: 0 0 0 4px rgba(0, 255, 163, 0.08);
        }
        .input-group.error {
          border-color: #dc3545 !important;
          box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.1) !important;
        }
        .input-group .form-control {
          border: none !important;
        }
        .input-group .form-control:focus {
          box-shadow: none !important;
        }
        .input-group-text {
          background: transparent !important;
          border: none !important;
          color: var(--text-secondary) !important;
        }
        .password-toggle {
          background: transparent !important;
          border: none !important;
          color: var(--text-secondary) !important;
        }
        .password-toggle:hover {
          color: var(--emerald) !important;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.3rem;
        }
        #sendCodeBtn {
          transition: all 0.3s ease;
        }
        #sendCodeBtn:hover:not(:disabled) {
          transform: scale(1.02);
        }
        #sendCodeBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-close {
          filter: var(--btn-close-filter);
        }
      `}</style>
    </div>
  );
}