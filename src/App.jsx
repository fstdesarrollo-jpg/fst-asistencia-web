import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaReunion from './pages/NuevaReunion';
import GestorMadres from './pages/GestorMadres';
import GestorPersonal from './pages/GestorPersonal';
import Asistencia from './pages/Asistencia';
import RegistroAlertas from './pages/RegistroAlertas';
import RegistroAsistencias from './pages/RegistroAsistencias';
import { isAuthenticated } from './utils/auth';

/**
 * Wraps a route element so that unauthenticated users are redirected to /login.
 * The `replace` prop on Navigate prevents the login page from being pushed onto
 * the history stack, so the back button behaves correctly after login.
 */
function ProtectedRoute({ element }) {
  return isAuthenticated() ? element : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/nueva-reunion" element={<ProtectedRoute element={<NuevaReunion />} />} />
        <Route path="/gestor-madres" element={<ProtectedRoute element={<GestorMadres />} />} />
        <Route path="/gestor-personal" element={<ProtectedRoute element={<GestorPersonal />} />} />
        <Route path="/asistencia" element={<ProtectedRoute element={<Asistencia />} />} />
        <Route path="/registro-alertas" element={<ProtectedRoute element={<RegistroAlertas />} />} />
        <Route path="/registro-asistencias" element={<ProtectedRoute element={<RegistroAsistencias />} />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
