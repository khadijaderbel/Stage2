const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getClientToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function handleSessionExpired() {
  document.cookie = 'token=; path=/; max-age=0';
  window.location.href = '/login?expired=1';
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getClientToken();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    handleSessionExpired();
    throw new Error('Session expirée, redirection en cours...');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = Array.isArray(data?.errors) && data.errors.length > 0
      ? data.errors.join(' ')
      : data?.message || `Erreur API : ${res.status}`;
    const error: any = new Error(message);
    error.errors = Array.isArray(data?.errors) ? data.errors : [message];
    error.status = res.status;
    throw error;
  }

  return data;
}

// Téléchargement de fichier (export, template) : on récupère un blob
// avec le header Authorization, plutôt qu'une navigation classique
// qui ne peut pas transporter le Bearer token.
export async function downloadFile(endpoint: string, filename: string) {
  const token = getClientToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) { handleSessionExpired(); return; }
  if (!res.ok) throw new Error(`Erreur téléchargement : ${res.status}`);

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}