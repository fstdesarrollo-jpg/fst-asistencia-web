const AUTH_KEY = 'fst_auth';

const ADMIN_CREDENTIALS = {
  cedula: '1080290117',
  password: 'Somos.26fstadmin',
};

/**
 * Attempt to log in with the provided credentials.
 * Returns true on success, false on failure.
 */
export function login(cedula, password) {
  if (
    cedula === ADMIN_CREDENTIALS.cedula &&
    password === ADMIN_CREDENTIALS.password
  ) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    return true;
  }
  return false;
}

/** Remove the authentication token and clear the session. */
export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

/** Returns true if the user is currently authenticated. */
export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}
