import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg'; // Importa el driver de PostgreSQL

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Usa el puerto proporcionado por Railway o un valor por defecto (4173)
// Railway usualmente proporciona el puerto a través de process.env.PORT
const PORT = process.env.PORT || 4173;

// --- Configuración de la Base de Datos ---
// Usa la variable de entorno DATABASE_URL que configuramos en Railway
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Puede ser necesario en algunos entornos de Railway
  }
});

// Función para verificar la conexión a la base de datos (opcional pero recomendada)
// Esto se ejecutará cuando la aplicación inicie.
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.stack);
    // Si la conexión falla al inicio, podrías querer detener la aplicación
    // o manejar este error de forma más robusta.
  } else {
    console.log('Conectado a la base de datos PostgreSQL exitosamente!');
    release(); // Libera el cliente de la pool para que esté disponible para otras operaciones
  }
});
// --- Fin Configuración Base de Datos ---

// Middleware para parsear JSON (necesario si envías datos JSON en las peticiones)
app.use(express.json());

// Sirve archivos estáticos desde la carpeta 'dist' (generada por Vite)
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback — sirve index.html para todas las rutas que no sean archivos estáticos
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
