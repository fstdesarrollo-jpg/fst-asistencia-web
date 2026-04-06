import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import bcrypt from 'bcrypt';

// Load .env in development (Railway injects env vars in production)
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (_) { /* dotenv optional */ }

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;

// ─── PostgreSQL connection pool ───────────────────────────────────────────────
const { Pool } = pg;

let pool = null;
let dbAvailable = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });
} else {
  console.warn('[DB] DATABASE_URL not set — running without database (mock mode).');
}

// ─── Schema initialisation ────────────────────────────────────────────────────
async function initDB() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id            SERIAL PRIMARY KEY,
        cedula        VARCHAR(20)  UNIQUE NOT NULL,
        nombre        VARCHAR(255) NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        cargo         VARCHAR(100) NOT NULL,
        municipio     VARCHAR(100) NOT NULL,
        equipo        VARCHAR(100) NOT NULL,
        rol           VARCHAR(50)  NOT NULL DEFAULT 'Profesional',
        password_hash VARCHAR(255),
        estado        VARCHAR(20)  DEFAULT 'Pendiente',
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS madres_sustitutas (
        id         SERIAL PRIMARY KEY,
        nombre     VARCHAR(255) NOT NULL,
        documento  VARCHAR(20)  UNIQUE NOT NULL,
        email      VARCHAR(255),
        municipio  VARCHAR(100) NOT NULL,
        equipo     VARCHAR(100),
        estado     VARCHAR(20)  DEFAULT 'Activo',
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed the default admin user if the table is empty
    const { rows } = await client.query(`SELECT COUNT(*) FROM usuarios`);
    if (parseInt(rows[0].count, 10) === 0) {
      const hash = await bcrypt.hash('Somos.26fstadmin', 12);
      await client.query(
        `INSERT INTO usuarios (cedula, nombre, email, cargo, municipio, equipo, rol, password_hash, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (cedula) DO NOTHING`,
        ['1080290117', 'Administrador FST', 'admin@fst.com', 'Administrador', 'Ibagué', 'Central', 'Administrador', hash, 'Activo']
      );
      console.log('[DB] Default admin user seeded.');
    }

    dbAvailable = true;
    console.log('[DB] Schema ready.');
  } catch (err) {
    console.error('[DB] Schema init failed:', err.message);
  } finally {
    client.release();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ok  = (res, data, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, data, message });

const fail = (res, error, status = 400, code = 'ERROR') =>
  res.status(status).json({ success: false, error, code });

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Express setup ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ─── Auth endpoint ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { cedula, password } = req.body;
  if (!cedula || !password) return fail(res, 'Cédula y contraseña son requeridas.', 400, 'MISSING_FIELDS');

  if (!dbAvailable) {
    // Fallback: hardcoded admin when DB is unavailable
    if (cedula === '1080290117' && password === 'Somos.26fstadmin') {
      return ok(res, { rol: 'Administrador', nombre: 'Administrador FST', cedula }, 'Login exitoso');
    }
    return fail(res, 'Cédula o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, cedula, nombre, rol, password_hash, estado FROM usuarios WHERE cedula = $1`,
      [cedula.trim()]
    );
    if (rows.length === 0) return fail(res, 'Cédula o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');

    const user = rows[0];
    if (user.estado !== 'Activo') return fail(res, 'Tu cuenta está pendiente de activación. Contacta al administrador.', 403, 'ACCOUNT_PENDING');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return fail(res, 'Cédula o contraseña incorrectos.', 401, 'INVALID_CREDENTIALS');

    return ok(res, { rol: user.rol, nombre: user.nombre, cedula: user.cedula }, 'Login exitoso');
  } catch (err) {
    console.error('[API] /auth/login error:', err.message);
    return fail(res, 'Error interno del servidor.', 500, 'SERVER_ERROR');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIOS (Empleados / Profesionales)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/usuarios — list all
app.get('/api/usuarios', async (_req, res) => {
  if (!dbAvailable) return ok(res, [], 'Base de datos no disponible.');
  try {
    const { rows } = await pool.query(
      `SELECT id, cedula, nombre, email, cargo, municipio, equipo, rol, estado, created_at FROM usuarios ORDER BY id`
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[API] GET /usuarios error:', err.message);
    return fail(res, 'Error al obtener usuarios.', 500, 'SERVER_ERROR');
  }
});

// POST /api/usuarios — create one
app.post('/api/usuarios', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  const { cedula, nombre, email, cargo, municipio, equipo, rol } = req.body;

  if (!cedula || !nombre || !email || !cargo || !municipio || !equipo || !rol)
    return fail(res, 'Todos los campos son obligatorios.', 400, 'MISSING_FIELDS');
  if (!validateEmail(email))
    return fail(res, `El correo "${email}" no es válido.`, 400, 'INVALID_EMAIL');

  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (cedula, nombre, email, cargo, municipio, equipo, rol)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, cedula, nombre, email, cargo, municipio, equipo, rol, estado, created_at`,
      [cedula.trim(), nombre.trim(), email.trim(), cargo.trim(), municipio.trim(), equipo.trim(), rol.trim()]
    );
    return ok(res, rows[0], 'Usuario creado exitosamente.', 201);
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'correo' : 'cédula';
      return fail(res, `Ya existe un usuario con ese ${field}.`, 409, 'DUPLICATE');
    }
    console.error('[API] POST /usuarios error:', err.message);
    return fail(res, 'Error al crear usuario.', 500, 'SERVER_ERROR');
  }
});

// POST /api/usuarios/bulk — bulk import
app.post('/api/usuarios/bulk', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  const { usuarios } = req.body;
  if (!Array.isArray(usuarios) || usuarios.length === 0)
    return fail(res, 'Se requiere un array de usuarios.', 400, 'MISSING_FIELDS');

  const results = [];
  for (const u of usuarios) {
    const { cedula, nombre, email, cargo, municipio, equipo, rol } = u;
    if (!cedula || !nombre || !email || !cargo || !municipio || !equipo || !rol) {
      results.push({ cedula, ok: false, msg: 'Campos incompletos.' });
      continue;
    }
    if (!validateEmail(email)) {
      results.push({ cedula, nombre, ok: false, msg: `Correo inválido: ${email}` });
      continue;
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO usuarios (cedula, nombre, email, cargo, municipio, equipo, rol)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (cedula) DO NOTHING
         RETURNING id, cedula, nombre, email, cargo, municipio, equipo, rol, estado`,
        [cedula.trim(), nombre.trim(), email.trim(), cargo.trim(), municipio.trim(), equipo.trim(), rol.trim()]
      );
      if (rows.length > 0) {
        results.push({ cedula, nombre, ok: true, msg: 'Importado correctamente.', data: rows[0] });
      } else {
        results.push({ cedula, nombre, ok: false, msg: `La cédula ${cedula} ya existe en el sistema.` });
      }
    } catch (err) {
      results.push({ cedula, nombre, ok: false, msg: err.message });
    }
  }
  return ok(res, results, 'Importación procesada.');
});

// GET /api/usuarios/:id
app.get('/api/usuarios/:id', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  try {
    const { rows } = await pool.query(
      `SELECT id, cedula, nombre, email, cargo, municipio, equipo, rol, estado, created_at FROM usuarios WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404, 'NOT_FOUND');
    return ok(res, rows[0]);
  } catch (err) {
    console.error('[API] GET /usuarios/:id error:', err.message);
    return fail(res, 'Error al obtener usuario.', 500, 'SERVER_ERROR');
  }
});

// PUT /api/usuarios/:id
app.put('/api/usuarios/:id', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  const { cedula, nombre, email, cargo, municipio, equipo, rol, estado } = req.body;
  if (email && !validateEmail(email))
    return fail(res, `El correo "${email}" no es válido.`, 400, 'INVALID_EMAIL');
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios
       SET cedula=$1, nombre=$2, email=$3, cargo=$4, municipio=$5, equipo=$6, rol=$7, estado=$8, updated_at=NOW()
       WHERE id=$9
       RETURNING id, cedula, nombre, email, cargo, municipio, equipo, rol, estado`,
      [cedula, nombre, email, cargo, municipio, equipo, rol, estado, req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404, 'NOT_FOUND');
    return ok(res, rows[0], 'Usuario actualizado.');
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'correo' : 'cédula';
      return fail(res, `Ya existe un usuario con ese ${field}.`, 409, 'DUPLICATE');
    }
    console.error('[API] PUT /usuarios/:id error:', err.message);
    return fail(res, 'Error al actualizar usuario.', 500, 'SERVER_ERROR');
  }
});

// DELETE /api/usuarios/:id
app.delete('/api/usuarios/:id', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  try {
    const { rows } = await pool.query(
      `DELETE FROM usuarios WHERE id=$1 RETURNING id, nombre`,
      [req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404, 'NOT_FOUND');
    return ok(res, rows[0], `Usuario ${rows[0].nombre} eliminado.`);
  } catch (err) {
    console.error('[API] DELETE /usuarios/:id error:', err.message);
    return fail(res, 'Error al eliminar usuario.', 500, 'SERVER_ERROR');
  }
});

// POST /api/usuarios/:id/password — generate / reset password
app.post('/api/usuarios/:id/password', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  try {
    const nuevaClave = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(nuevaClave, 12);
    const { rows } = await pool.query(
      `UPDATE usuarios SET password_hash=$1, estado='Activo', updated_at=NOW()
       WHERE id=$2
       RETURNING id, nombre, email, estado`,
      [hash, req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Usuario no encontrado.', 404, 'NOT_FOUND');
    // Return the plain password once so the admin can share it
    return ok(res, { ...rows[0], nuevaClave }, 'Contraseña generada exitosamente.');
  } catch (err) {
    console.error('[API] POST /usuarios/:id/password error:', err.message);
    return fail(res, 'Error al generar contraseña.', 500, 'SERVER_ERROR');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MADRES SUSTITUTAS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/madres-sustitutas
app.get('/api/madres-sustitutas', async (_req, res) => {
  if (!dbAvailable) return ok(res, [], 'Base de datos no disponible.');
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, documento, email, municipio, equipo, estado, created_at FROM madres_sustitutas ORDER BY id`
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[API] GET /madres-sustitutas error:', err.message);
    return fail(res, 'Error al obtener madres sustitutas.', 500, 'SERVER_ERROR');
  }
});

// POST /api/madres-sustitutas
app.post('/api/madres-sustitutas', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  const { nombre, documento, email, municipio, equipo } = req.body;
  if (!nombre || !documento || !municipio)
    return fail(res, 'Nombre, documento y municipio son obligatorios.', 400, 'MISSING_FIELDS');
  if (email && !validateEmail(email))
    return fail(res, `El correo "${email}" no es válido.`, 400, 'INVALID_EMAIL');
  try {
    const { rows } = await pool.query(
      `INSERT INTO madres_sustitutas (nombre, documento, email, municipio, equipo)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, nombre, documento, email, municipio, equipo, estado`,
      [nombre.trim(), documento.trim(), email?.trim() || null, municipio.trim(), equipo?.trim() || null]
    );
    return ok(res, rows[0], 'Madre sustituta registrada.', 201);
  } catch (err) {
    if (err.code === '23505')
      return fail(res, `Ya existe una madre sustituta con el documento ${documento}.`, 409, 'DUPLICATE');
    console.error('[API] POST /madres-sustitutas error:', err.message);
    return fail(res, 'Error al registrar madre sustituta.', 500, 'SERVER_ERROR');
  }
});

// POST /api/madres-sustitutas/bulk
app.post('/api/madres-sustitutas/bulk', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  const { madres } = req.body;
  if (!Array.isArray(madres) || madres.length === 0)
    return fail(res, 'Se requiere un array de madres sustitutas.', 400, 'MISSING_FIELDS');

  const results = [];
  for (const m of madres) {
    const { nombre, documento, email, municipio, equipo } = m;
    if (!nombre || !documento || !municipio) {
      results.push({ documento, ok: false, msg: 'Campos incompletos (nombre, documento, municipio son requeridos).' });
      continue;
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO madres_sustitutas (nombre, documento, email, municipio, equipo)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (documento) DO NOTHING
         RETURNING id, nombre, documento, email, municipio, equipo, estado`,
        [nombre.trim(), documento.trim(), email?.trim() || null, municipio.trim(), equipo?.trim() || null]
      );
      if (rows.length > 0) {
        results.push({ documento, nombre, ok: true, msg: 'Importada correctamente.', data: rows[0] });
      } else {
        results.push({ documento, nombre, ok: false, msg: `El documento ${documento} ya existe.` });
      }
    } catch (err) {
      results.push({ documento, nombre, ok: false, msg: err.message });
    }
  }
  return ok(res, results, 'Importación procesada.');
});

// GET /api/madres-sustitutas/:id
app.get('/api/madres-sustitutas/:id', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, documento, email, municipio, equipo, estado FROM madres_sustitutas WHERE id=$1`,
      [req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Madre sustituta no encontrada.', 404, 'NOT_FOUND');
    return ok(res, rows[0]);
  } catch (err) {
    console.error('[API] GET /madres-sustitutas/:id error:', err.message);
    return fail(res, 'Error al obtener madre sustituta.', 500, 'SERVER_ERROR');
  }
});

// PUT /api/madres-sustitutas/:id
app.put('/api/madres-sustitutas/:id', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  const { nombre, documento, email, municipio, equipo, estado } = req.body;
  if (email && !validateEmail(email))
    return fail(res, `El correo "${email}" no es válido.`, 400, 'INVALID_EMAIL');
  try {
    const { rows } = await pool.query(
      `UPDATE madres_sustitutas
       SET nombre=$1, documento=$2, email=$3, municipio=$4, equipo=$5, estado=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING id, nombre, documento, email, municipio, equipo, estado`,
      [nombre, documento, email || null, municipio, equipo || null, estado || 'Activo', req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Madre sustituta no encontrada.', 404, 'NOT_FOUND');
    return ok(res, rows[0], 'Madre sustituta actualizada.');
  } catch (err) {
    if (err.code === '23505')
      return fail(res, `Ya existe una madre sustituta con ese documento.`, 409, 'DUPLICATE');
    console.error('[API] PUT /madres-sustitutas/:id error:', err.message);
    return fail(res, 'Error al actualizar madre sustituta.', 500, 'SERVER_ERROR');
  }
});

// DELETE /api/madres-sustitutas/:id
app.delete('/api/madres-sustitutas/:id', async (req, res) => {
  if (!dbAvailable) return fail(res, 'Base de datos no disponible.', 503, 'DB_UNAVAILABLE');
  try {
    const { rows } = await pool.query(
      `DELETE FROM madres_sustitutas WHERE id=$1 RETURNING id, nombre`,
      [req.params.id]
    );
    if (rows.length === 0) return fail(res, 'Madre sustituta no encontrada.', 404, 'NOT_FOUND');
    return ok(res, rows[0], `${rows[0].nombre} eliminada del sistema.`);
  } catch (err) {
    console.error('[API] DELETE /madres-sustitutas/:id error:', err.message);
    return fail(res, 'Error al eliminar madre sustituta.', 500, 'SERVER_ERROR');
  }
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
// Must come after all API routes. Express 5.x does not accept bare '*'.
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
await initDB();

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
