const AUTH_KEY = 'fst_auth';
const ROLE_KEY = 'fst_role';

/**
 * Registered users with their credentials and roles.
 * In a real system these would live in a backend database.
 */
const USERS = [
  { cedula: '1080290117', password: 'Somos.26fstadmin', rol: 'Administrador', nombre: 'Administrador FST' },
];

/**
 * Attempt to log in with the provided credentials.
 * Stores the authenticated user's role in sessionStorage.
 * Returns true on success, false on failure.
 */
export function login(cedula, password) {
  const user = USERS.find(
    (u) => u.cedula === cedula && u.password === password
  );
  if (user) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    sessionStorage.setItem(ROLE_KEY, user.rol);
    sessionStorage.setItem('fst_nombre', user.nombre);
    return true;
  }
  return false;
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
