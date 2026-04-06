const AUTH_KEY = 'fst_auth';
const ROLE_KEY = 'fst_role';

/**
 * Attempt to log in with the provided credentials via the backend API.
 * Stores the authenticated user's role in sessionStorage on success.
 *
 * Returns an object: { success: boolean, error?: string }
 * This is async — callers must await it.
 */
export async function login(cedula, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, password }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      sessionStorage.setItem(ROLE_KEY, json.data.rol);
      sessionStorage.setItem('fst_nombre', json.data.nombre);
      return { success: true };
    }
    return { success: false, error: json.error ?? 'Credenciales incorrectas.' };
  } catch (_err) {
    return { success: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
  }
}

/** Remove the authentication token and clear the session. */
export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem('fst_nombre');
}

/** Returns true if the user is currently authenticated. */
export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

/** Returns the current user's role, defaulting to 'Profesional'. */
export function getCurrentRole() {
  return sessionStorage.getItem(ROLE_KEY) ?? 'Profesional';
}

/** Returns the current user's display name. */
export function getCurrentNombre() {
  return sessionStorage.getItem('fst_nombre') ?? 'Usuario';
}

/**
 * Check if the current user has a specific permission.
 * Reads the role from sessionStorage and delegates to the roles utility.
 * Import hasPermission from roles.js directly in components for tree-shaking.
 */
export function checkPermission(permission) {
  // Inline the check here to avoid a circular import with roles.js
  const role = sessionStorage.getItem(ROLE_KEY) ?? 'Profesional';
  // Dynamic import not possible synchronously; consumers should use roles.js directly.
  // This function is provided as a convenience alias.
  return role === 'Administrador' || role === 'Coordinadora Técnica'
    ? true
    : false; // Fallback — use hasPermission() from roles.js for granular checks
}
