/**
 * FST API Client
 *
 * Centralised fetch wrapper for all backend API calls.
 * All functions return { success, data, message } on success
 * or { success: false, error, code } on failure — matching the
 * server's standard response envelope.
 */

const BASE = '/api';

/**
 * Core fetch helper. Throws on network errors; returns the parsed JSON body.
 */
async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return json; // always return the envelope; callers check json.success
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user against the database.
 * @returns {{ success, data: { rol, nombre, cedula }, error }}
 */
export async function apiLogin(cedula, password) {
  return request('POST', '/auth/login', { cedula, password });
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

/** Fetch all users. */
export async function apiGetUsuarios() {
  return request('GET', '/usuarios');
}

/** Create a single user. */
export async function apiCreateUsuario(data) {
  return request('POST', '/usuarios', data);
}

/** Bulk-import an array of users. */
export async function apiBulkUsuarios(usuarios) {
  return request('POST', '/usuarios/bulk', { usuarios });
}

/** Get a user by ID. */
export async function apiGetUsuario(id) {
  return request('GET', `/usuarios/${id}`);
}

/** Update a user by ID. */
export async function apiUpdateUsuario(id, data) {
  return request('PUT', `/usuarios/${id}`, data);
}

/** Delete a user by ID. */
export async function apiDeleteUsuario(id) {
  return request('DELETE', `/usuarios/${id}`);
}

/**
 * Generate (or reset) a password for a user.
 * Returns { success, data: { nuevaClave, nombre, email, estado } }
 */
export async function apiGeneratePassword(id) {
  return request('POST', `/usuarios/${id}/password`);
}

// ─── Madres Sustitutas ────────────────────────────────────────────────────────

/** Fetch all madres sustitutas. */
export async function apiGetMadres() {
  return request('GET', '/madres-sustitutas');
}

/** Create a single madre sustituta. */
export async function apiCreateMadre(data) {
  return request('POST', '/madres-sustitutas', data);
}

/** Bulk-import an array of madres sustitutas. */
export async function apiBulkMadres(madres) {
  return request('POST', '/madres-sustitutas/bulk', { madres });
}

/** Get a madre sustituta by ID. */
export async function apiGetMadre(id) {
  return request('GET', `/madres-sustitutas/${id}`);
}

/** Update a madre sustituta by ID. */
export async function apiUpdateMadre(id, data) {
  return request('PUT', `/madres-sustitutas/${id}`, data);
}

/** Delete a madre sustituta by ID. */
export async function apiDeleteMadre(id) {
  return request('DELETE', `/madres-sustitutas/${id}`);
}
