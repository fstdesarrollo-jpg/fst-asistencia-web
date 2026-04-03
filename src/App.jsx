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
import { hasPermission, PERMISSIONS } from './utils/roles';

/**
 * Wraps a route element so that:
 *  1. Unauthenticated users are redirected to /login.
 *  2. Authenticated users without the required permission are redirected to /dashboard.
 *
 * Pass `requiredPermission` (a PERMISSIONS constant) to enforce role-based access.
 * Omit it to require authentication only.
 */
function ProtectedRoute({ element, requiredPermission }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return element;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route
          path="/nueva-reunion"
          element={<ProtectedRoute element={<NuevaReunion />} requiredPermission={PERMISSIONS.ACCESS_NUEVA_REUNION} />}
        />
        <Route
          path="/gestor-madres"
          element={<ProtectedRoute element={<GestorMadres />} requiredPermission={PERMISSIONS.ACCESS_GESTOR_MADRES} />}
        />
        <Route
          path="/gestor-personal"
          element={<ProtectedRoute element={<GestorPersonal />} requiredPermission={PERMISSIONS.ACCESS_GESTOR_PERSONAL} />}
        />
        <Route
          path="/asistencia"
          element={<ProtectedRoute element={<Asistencia />} requiredPermission={PERMISSIONS.ACCESS_ASISTENCIA} />}
        />
        <Route
          path="/registro-alertas"
          element={<ProtectedRoute element={<RegistroAlertas />} requiredPermission={PERMISSIONS.ACCESS_REGISTRO_ALERTAS} />}
        />
        <Route
          path="/registro-asistencias"
          element={<ProtectedRoute element={<RegistroAsistencias />} requiredPermission={PERMISSIONS.ACCESS_REGISTRO_ASISTENCIAS} />}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
