/**
 * FST Role-Based Access Control (RBAC) System
 *
 * Role hierarchy (highest → lowest privilege):
 *   Administrador
 *   Coordinadora Técnica  (same as Administrador)
 *   Coordinadora          (limited admin)
 *   Coordinador           (same as Coordinadora)
 *   Profesional           (limited access)
 *   Psicólogo             (same as Profesional)
 *   Trabajador Social     (same as Profesional)
 *   Nutricionista         (same as Profesional)
 *   Profesional de Área   (same as Profesional)
 *   Gestor de Caso        (same as Profesional)
 */

// ─── Permission keys ────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Employee management
  MANAGE_EMPLOYEES: 'manage_employees',       // add / edit employees
  DELETE_EMPLOYEES: 'delete_employees',       // remove employees
  GENERATE_PASSWORDS: 'generate_passwords',   // create / reset passwords
  VIEW_PASSWORDS: 'view_passwords',           // see the password column

  // Module access
  ACCESS_GESTOR_PERSONAL: 'access_gestor_personal',
  ACCESS_GESTOR_MADRES: 'access_gestor_madres',
  ACCESS_NUEVA_REUNION: 'access_nueva_reunion',
  ACCESS_ASISTENCIA: 'access_asistencia',
  ACCESS_REGISTRO_ASISTENCIAS: 'access_registro_asistencias',
  ACCESS_REGISTRO_ALERTAS: 'access_registro_alertas',

  // Data visibility
  VIEW_ALL_DATA: 'view_all_data',             // see data from all teams/zones
  VIEW_ASSIGNED_DATA: 'view_assigned_data',   // see only own team data
};

// ─── Role definitions ────────────────────────────────────────────────────────
const FULL_ACCESS = Object.values(PERMISSIONS);

const COORDINATOR_PERMISSIONS = [
  PERMISSIONS.MANAGE_EMPLOYEES,
  PERMISSIONS.DELETE_EMPLOYEES,
  PERMISSIONS.GENERATE_PASSWORDS,
  PERMISSIONS.VIEW_PASSWORDS,
  PERMISSIONS.ACCESS_GESTOR_PERSONAL,
  PERMISSIONS.ACCESS_GESTOR_MADRES,
  PERMISSIONS.ACCESS_NUEVA_REUNION,
  PERMISSIONS.ACCESS_ASISTENCIA,
  PERMISSIONS.ACCESS_REGISTRO_ASISTENCIAS,
  PERMISSIONS.ACCESS_REGISTRO_ALERTAS,
  PERMISSIONS.VIEW_ALL_DATA,
];

const PROFESSIONAL_PERMISSIONS = [
  PERMISSIONS.ACCESS_NUEVA_REUNION,
  PERMISSIONS.ACCESS_ASISTENCIA,
  PERMISSIONS.ACCESS_REGISTRO_ASISTENCIAS,
  PERMISSIONS.ACCESS_REGISTRO_ALERTAS,
  PERMISSIONS.VIEW_ASSIGNED_DATA,
];

export const ROLE_PERMISSIONS = {
  'Administrador':        FULL_ACCESS,
  'Coordinadora Técnica': FULL_ACCESS,           // same as Administrador
  'Coordinadora':         COORDINATOR_PERMISSIONS,
  'Coordinador':          COORDINATOR_PERMISSIONS, // same as Coordinadora
  'Profesional':          PROFESSIONAL_PERMISSIONS,
  'Psicólogo':            PROFESSIONAL_PERMISSIONS,
  'Trabajador Social':    PROFESSIONAL_PERMISSIONS,
  'Nutricionista':        PROFESSIONAL_PERMISSIONS,
  'Profesional de Área':  PROFESSIONAL_PERMISSIONS,
  'Gestor de Caso':       PROFESSIONAL_PERMISSIONS,
};

// Roles that appear in the Excel import dropdown
export const IMPORTABLE_ROLES = [
  'Profesional',
  'Coordinador',
  'Coordinadora Técnica',
];

// All known roles (for UI selectors)
export const ALL_ROLES = Object.keys(ROLE_PERMISSIONS);

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Returns the permission set for a given role.
 * Falls back to PROFESSIONAL_PERMISSIONS for unknown roles.
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? PROFESSIONAL_PERMISSIONS;
}

/**
 * Returns true if the given role has the specified permission.
 */
export function roleHasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

/**
 * Returns true if the current session role has the specified permission.
 * Reads the role from sessionStorage (set by auth.js on login).
 */
export function hasPermission(permission) {
  const role = sessionStorage.getItem('fst_role') ?? 'Profesional';
  return roleHasPermission(role, permission);
}

/** Convenience wrappers */
export function canManageEmployees()   { return hasPermission(PERMISSIONS.MANAGE_EMPLOYEES); }
export function canDeleteEmployees()   { return hasPermission(PERMISSIONS.DELETE_EMPLOYEES); }
export function canGeneratePasswords() { return hasPermission(PERMISSIONS.GENERATE_PASSWORDS); }
export function canViewPasswords()     { return hasPermission(PERMISSIONS.VIEW_PASSWORDS); }
export function canViewAllData()       { return hasPermission(PERMISSIONS.VIEW_ALL_DATA); }

/**
 * Returns true if the current session role can access the given module.
 * @param {string} moduleName - one of the ACCESS_* permission keys or the route name
 */
export function canAccessModule(moduleName) {
  const permKey = `access_${moduleName.replace(/-/g, '_')}`;
  const permission = Object.values(PERMISSIONS).find(p => p === permKey);
  if (!permission) return false;
  return hasPermission(permission);
}
