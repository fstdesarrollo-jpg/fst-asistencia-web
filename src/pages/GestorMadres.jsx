import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, Edit2, Trash2, Mail, ShieldCheck, ArrowLeft, Home, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGetMadres, apiCreateMadre, apiUpdateMadre, apiDeleteMadre } from '../utils/api';

export default function GestorMadres() {
  const navigate = useNavigate();

  const [madres, setMadres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState(null);

  const mostrarNotificacion = (mensaje) => {
    setNotificacion(mensaje);
    setTimeout(() => setNotificacion(null), 6000);
  };

  // ── Load data from API on mount ─────────────────────────────────────────────
  const cargarMadres = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const res = await apiGetMadres();
    if (res.success) {
      setMadres(res.data.map(m => ({
        id: m.id,
        nombre: m.nombre,
        documento: m.documento,
        municipio: m.municipio,
        equipo: m.equipo ?? '',
        correo: m.email ?? '',
        estado: m.estado,
      })));
    } else {
      setApiError(res.error ?? 'Error al cargar las madres sustitutas.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { cargarMadres(); }, [cargarMadres]);

  const eliminarMadre = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${nombre} del sistema?\n\n¡OJO! Esta acción será notificada inmediatamente a la Coordinación Técnica.`)) return;
    const res = await apiDeleteMadre(id);
    if (res.success) {
      setMadres(prev => prev.filter(m => m.id !== id));
      mostrarNotificacion(`Se registró la eliminación de ${nombre} en la base de datos. La Coordinación Técnica ha sido notificada.`);
    } else {
      alert(`Error al eliminar: ${res.error}`);
    }
  };

  const editarMadre = async (madre) => {
    const nuevoMunicipio = window.prompt(`Municipio de ${madre.nombre}:`, madre.municipio);
    if (!nuevoMunicipio) return;
    const nuevoEquipo = window.prompt(`Equipo de ${madre.nombre}:`, madre.equipo);
    if (nuevoEquipo === null) return;
    const nuevoCorreo = window.prompt(`Correo de ${madre.nombre}:`, madre.correo);
    if (nuevoCorreo === null) return;

    const res = await apiUpdateMadre(madre.id, {
      nombre: madre.nombre,
      documento: madre.documento,
      email: nuevoCorreo.trim() || null,
      municipio: nuevoMunicipio.trim(),
      equipo: nuevoEquipo.trim() || null,
      estado: madre.estado,
    });

    if (res.success) {
      setMadres(prev => prev.map(m => m.id === madre.id
        ? { ...m, municipio: res.data.municipio, equipo: res.data.equipo ?? '', correo: res.data.email ?? '' }
        : m
      ));
      mostrarNotificacion(`Datos de ${madre.nombre} actualizados en la base de datos.`);
    } else {
      alert(`Error al actualizar: ${res.error}`);
    }
  };
  
  const agregarMadre = async () => {
    const nombre = window.prompt('Nombre completo de la nueva Madre Sustituta:');
    if (!nombre) return;
    const documento = window.prompt(`Número de documento de ${nombre}:`);
    if (!documento) return;
    const municipio = window.prompt(`Municipio de ${nombre}:`);
    if (!municipio) return;
    const equipo = window.prompt(`Equipo asignado (opcional):`, '');
    const correo = window.prompt(`Correo electrónico (opcional):`, '');

    const res = await apiCreateMadre({
      nombre: nombre.trim(),
      documento: documento.trim(),
      municipio: municipio.trim(),
      equipo: equipo?.trim() || null,
      email: correo?.trim() || null,
    });

    if (res.success) {
      const m = res.data;
      setMadres(prev => [...prev, {
        id: m.id,
        nombre: m.nombre,
        documento: m.documento,
        municipio: m.municipio,
        equipo: m.equipo ?? '',
        correo: m.email ?? '',
        estado: m.estado,
      }]);
      mostrarNotificacion(`${nombre} ha sido registrada en la base de datos.`);
    } else {
      alert(`Error al registrar: ${res.error}`);
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const madresFiltradas = madres.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.documento.includes(busqueda)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="flex-1 flex flex-col p-4 md:p-8 animate-fade-in relative max-w-6xl mx-auto w-full">
         <div className="flex gap-3 mb-6">
           <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-black font-bold flex items-center gap-2 w-fit bg-white px-4 py-2 rounded shadow border border-slate-300">
             <ArrowLeft className="w-4 h-4" /> Volver Atrás
           </button>
           <button onClick={() => navigate('/dashboard')} className="text-white hover:bg-slate-800 font-bold flex items-center gap-2 w-fit bg-slate-900 px-4 py-2 rounded shadow border border-slate-700">
             <Home className="w-4 h-4" /> Panel de Inicio FST
           </button>
         </div>
         
         {notificacion && (
            <div className="fixed top-4 right-4 bg-slate-900 border-l-4 border-accent-500 text-white p-4 rounded-xl shadow-2xl z-50 flex items-start gap-3 max-w-md animate-fade-in">
               <Mail className="w-6 h-6 text-accent-500 shrink-0" />
               <div>
                 <h4 className="font-bold text-sm text-accent-500 uppercase">Aviso de Seguridad Enviado</h4>
                 <p className="text-sm text-slate-200 mt-1 leading-relaxed">{notificacion}</p>
               </div>
            </div>
         )}
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary-600" /> Directorio de Madres Sustitutas
              </h1>
              <p className="text-slate-500 mt-1">Módulo exclusivo para Administradores y Coordinadores</p>
            </div>
            <button onClick={agregarMadre} className="btn-premium flex items-center justify-center gap-2 px-6 w-full md:w-auto">
              <Plus className="w-5 h-5" /> Nueva Madre Sustituta
            </button>
         </div>

         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
               <div className="relative w-full sm:w-96">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar por documento o nombre..."
                    className="input-premium pl-10 w-full"
                  />
               </div>
               <div className="flex items-center gap-2 text-sm text-primary-900 font-bold bg-primary-100 px-4 py-2 rounded-lg border border-primary-200 shadow-inner">
                  <ShieldCheck className="w-5 h-5 text-primary-600" /> Conexión Abierta de Alto Privilegio
               </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold border-b border-slate-200">Madre Sustituta</th>
                        <th className="p-4 font-bold border-b border-slate-200">Documento</th>
                        <th className="p-4 font-bold hidden md:table-cell border-b border-slate-200">Municipio</th>
                        <th className="p-4 font-bold border-b border-slate-200">Equipo</th>
                        <th className="p-4 font-bold text-center border-b border-slate-200">Acciones Privilegiadas</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading && (
                       <tr>
                         <td colSpan={5} className="p-10 text-center text-slate-400 font-bold">
                           <div className="flex items-center justify-center gap-2">
                             <Loader2 className="w-5 h-5 animate-spin" /> Cargando directorio desde la base de datos...
                           </div>
                         </td>
                       </tr>
                     )}
                     {!loading && apiError && (
                       <tr>
                         <td colSpan={5} className="p-10 text-center text-red-500 font-bold">
                           <div className="flex items-center justify-center gap-2">
                             <AlertCircle className="w-5 h-5" /> {apiError}
                           </div>
                         </td>
                       </tr>
                     )}
                     {!loading && !apiError && madresFiltradas.length === 0 && (
                       <tr>
                         <td colSpan={5} className="p-10 text-center text-slate-400 font-bold">
                           {busqueda ? 'No se encontraron resultados.' : 'No hay madres sustitutas registradas.'}
                         </td>
                       </tr>
                     )}
                     {!loading && !apiError && madresFiltradas.map((m) => (
                        <tr key={m.id} className="hover:bg-primary-50 transition-colors">
                           <td className="p-4">
                              <p className="font-bold text-slate-800">{m.nombre}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{m.correo}</p>
                           </td>
                           <td className="p-4 text-slate-600 font-mono text-sm">{m.documento}</td>
                           <td className="p-4 text-slate-600 hidden md:table-cell">{m.municipio}</td>
                           <td className="p-4">
                              <span className="bg-white text-primary-700 px-3 py-1 rounded-full text-xs font-bold border border-primary-200 shadow-sm">
                                {m.equipo}
                              </span>
                           </td>
                           <td className="p-4">
                              <div className="flex items-center justify-center gap-3">
                                 <button onClick={() => editarMadre(m)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Editar Información">
                                   <Edit2 className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => eliminarMadre(m.id, m.nombre)} className="p-2 text-slate-400 hover:text-accent-500 hover:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Eliminar (Enviará Alerta)">
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
