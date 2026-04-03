import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4173;

// Serve static files from the Vite build output
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback — serve index.html for all non-file routes so that
// client-side routing (react-router-dom) works correctly.
// app.use() is used instead of app.get('*') because Express 5.x does not
// accept bare '*' as a route pattern (throws PathError).
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
