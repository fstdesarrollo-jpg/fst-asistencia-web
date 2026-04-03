import { useState, useRef } from 'react';
import { UserPlus, Search, ShieldAlert, KeyRound, Building2, Trash2, ShieldCheck, Mail, MapPin, RefreshCw, ArrowLeft, Home, FileSpreadsheet, Upload, Download, X, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getCurrentRole } from '../utils/auth';
import { canManageEmployees, canDeleteEmployees, canGeneratePasswords, canViewPasswords, IMPORTABLE_ROLES } from '../utils/roles';

// ─── Excel template columns ──────────────────────────────────────────────────
const TEMPLATE_COLUMNS = [
  'Nombre Completo',
  'Número de Documento',
  'Correo Electrónico',
  'Cargo',
  'Municipio',
  'Equipo Asignado',
  'Rol',
];

const REQUIRED_FIELDS = TEMPLATE_COLUMNS; // all columns are required

/** Validate a single parsed row. Returns an array of error strings (empty = valid). */
function validateRow(row, index) {
  const errors = [];
  REQUIRED_FIELDS.forEach((col) => {
    if (!row[col] || String(row[col]).trim() === '') {
      errors.push(`Fila ${index + 2}: El campo "${col}" es obligatorio.`);
    }
  });
  if (row['Correo Electrónico'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Correo Electrónico'])) {
    errors.push(`Fila ${index + 2}: El correo "${row['Correo Electrónico']}" no es válido.`);
  }
  if (row['Rol'] && !IMPORTABLE_ROLES.includes(row['Rol'])) {
    errors.push(`Fila ${index + 2}: El rol "${row['Rol']}" no es válido. Use: ${IMPORTABLE_ROLES.join(', ')}.`);
  }
  return errors;
}

export default function GestorPersonal() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Real role from session — no more simulator
  const rolActual = getCurrentRole();
  const esAdmin = canViewPasswords();
  const puedeGestionar = canManageEmployees();
  const puedeEliminar = canDeleteEmployees();
  const puedeGenerarClave = canGeneratePasswords();

  // ── Import modal state ──────────────────────────────────────────────────────
  const [modoImport, setModoImport] = useState(false);          // show import panel
  const [importPreview, setImportPreview] = useState(null);     // parsed rows ready to preview
  const [importErrors, setImportErrors] = useState([]);         // validation errors
  const [importResultados, setImportResultados] = useState([]); // per-row import results
  const [importFileName, setImportFileName] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Mock data representing Staff
  const [personal, setPersonal] = useState([
    { id: 1, nombre: 'Ana María Osorio', documento: '11112222', correo: 'ana@fst.com', municipio: 'Ibagué', equipo: 'Zonal 1', cargo: 'Coordinadora Zonal', rol: 'Coordinador', password: null, estado: 'Pendiente' },
    { id: 2, nombre: 'Julián Camilo Reyes', documento: '33334444', correo: 'julian@fst.com', municipio: 'Lérida', equipo: 'Zonal 2', cargo: 'Profesional Psicosocial', rol: 'Profesional', password: null, estado: 'Pendiente' },
    { id: 3, nombre: 'Marta Helena Restrepo', documento: '55556666', correo: 'marta@fst.com', municipio: 'Planadas', equipo: 'Zonal 3', cargo: 'Técnica de Operaciones', rol: 'Coordinadora Técnica', password: '948271', estado: 'Activo' },
  ]);

  const [notificacion, setNotificacion] = useState(null);

  const mostrarNotificacion = (mensaje) => {
    setNotificacion(mensaje);
    setTimeout(() => setNotificacion(null), 5000);
  };

  // ── Individual add ──────────────────────────────────────────────────────────
  const eliminarPersonal = (id, nombre) => {
    if (!puedeEliminar) return;
    if (window.confirm(`🚧 ¡ALERTA DE SEGURIDAD EXTREMA! 🚧\n\n¿Estás absolutamente segura de REVOCAR EL ACCESO INMEDIATO a ${nombre}?\n\nEsta persona ya no podrá entrar a la aplicación ni registrar datos.`)) {
      setPersonal(personal.filter(p => p.id !== id));
      mostrarNotificacion(`Acceso revocado definitivamente para ${nombre}. Su credencial ha sido destruida del sistema.`);
    }
  };

  const agregarPersonal = () => {
    if (!puedeGestionar) return;
    const nombre = window.prompt(`Paso 1/7: Escribe el NOMBRE COMPLETO del trabajador:`);
    if (!nombre) return;
    
    const doc = window.prompt(`Paso 2/7: Escribe el NÚMERO DE DOCUMENTO (Será su Usuario):\n\nTrabajador: ${nombre}`);
    if (!doc) return;

    const correo = window.prompt(`Paso 3/7: Escribe el CORREO ELECTRÓNICO (Se usará para enviar su contraseña):\n\nTrabajador: ${nombre}`);
    if (!correo) return;

    const cargo = window.prompt(`Paso 4/7: Escribe el CARGO (Ej: Psicólogo, Trabajador Social, etc):\n\nTrabajador: ${nombre}`);
    if (!cargo) return;

    const municipio = window.prompt(`Paso 5/7: Escribe el MUNICIPIO ASIGNADO (Ej: Ibagué, Lérida, Chaparral):\n\nTrabajador: ${nombre}`);
    if (!municipio) return;

    const equipo = window.prompt(`Paso 6/7: Escribe el NÚMERO DE EQUIPO ASIGNADO (Ej: Zonal 1, Zonal 2):\n\nTrabajador: ${nombre}`);
    if (!equipo) return;

    const rol = window.prompt('Paso Final (7/7): Asigna su ROL OPERATIVO de sistema.\n\nEscribe el número:\n1 = Profesional\n2 = Coordinador\n3 = Coordinadora Técnica', '1');
    if (!rol) return;
    
    let rolAsignado = 'Profesional';
    if(rol === '2') rolAsignado = 'Coordinador';
    if(rol === '3') rolAsignado = 'Coordinadora Técnica';

    setPersonal(prev => [...prev, { 
      id: Date.now(), 
      nombre: nombre.trim(), 
      documento: doc.trim(), 
      correo: correo.trim(),
      municipio: municipio.trim(),
      equipo: equipo.trim(),
      cargo: cargo.trim(), 
      rol: rolAsignado, 
      password: null,
      estado: 'Pendiente'
    }]);

    mostrarNotificacion(`¡Alta de perfil exitosa! ${nombre} ha sido ingresado al sistema. Se ha enviado automáticamente una alerta al Administrador para que genere y autorice su contraseña.`);
  };

  const generarContrasena = (id, nombre, correo, yaTiene) => {
    if (!puedeGenerarClave) return;
    if (yaTiene && !window.confirm(`⚠️ ${nombre} ya tiene una contraseña activa. ¿Estás seguro de que deseas REVOCAR la actual y enviarle una NUEVA contraseña por correo?`)) {
       return;
    }
    
    const nuevaClave = Math.floor(100000 + Math.random() * 900000).toString();
    
    setPersonal(prev => prev.map(p => {
      if (p.id === id) return { ...p, password: nuevaClave, estado: 'Activo' };
      return p;
    }));
    
    alert(`🔑 LLAVE MAESTRA CREADA CON ÉXITO\n\nEl sistema FST ha generado automáticamente la clave de 6 dígitos segura para ${nombre}.\n\nNueva Clave: [ ${nuevaClave} ]\n\nSIMULACIÓN: El servidor acaba de enviar un correo a [${correo}] informando al profesional su nuevo acceso al Software FST.`);
    mostrarNotificacion(`Contraseña actualizada y correo enviado a ${correo}.`);
  };

  // ── Excel template download ─────────────────────────────────────────────────
  const descargarPlantilla = () => {
    // Build a worksheet with the header row + one example row
    const exampleRow = {
      'Nombre Completo': 'Ejemplo: María García',
      'Número de Documento': '1234567890',
      'Correo Electrónico': 'maria@fst.com',
      'Cargo': 'Psicóloga',
      'Municipio': 'Ibagué',
      'Equipo Asignado': 'Zonal 1',
      'Rol': 'Profesional',
    };

    const ws = XLSX.utils.json_to_sheet([exampleRow], { header: TEMPLATE_COLUMNS });

    // Style the header row (column widths)
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 28 }));

    // Add a validation comment to the Rol column header
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla FST');

    // Add a second sheet with role options for reference
    const wsRoles = XLSX.utils.aoa_to_sheet([
      ['Roles Válidos para la columna "Rol"'],
      ...IMPORTABLE_ROLES.map(r => [r]),
    ]);
    wsRoles['!cols'] = [{ wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsRoles, 'Roles Válidos');

    XLSX.writeFile(wb, 'Plantilla_Importacion_Personal_FST.xlsx');
    mostrarNotificacion('Plantilla Excel descargada. Completa los datos y súbela usando el botón "Subir Archivo Excel".');
  };

  // ── File upload & parse ─────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setImportErrors(['El archivo debe ser .xlsx, .xls o .csv']);
      setImportPreview(null);
      return;
    }

    setImportFileName(file.name);
    setImportErrors([]);
    setImportPreview(null);
    setImportResultados([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          setImportErrors(['El archivo está vacío o no tiene filas de datos.']);
          return;
        }

        // Validate all rows
        const allErrors = [];
        rows.forEach((row, i) => {
          const rowErrors = validateRow(row, i);
          allErrors.push(...rowErrors);
        });

        setImportErrors(allErrors);
        setImportPreview(rows);
      } catch (err) {
        setImportErrors([`Error al leer el archivo: ${err.message}`]);
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset the input so the same file can be re-uploaded after fixing
    e.target.value = '';
  };

  // ── Confirm bulk import ─────────────────────────────────────────────────────
  const confirmarImport = () => {
    if (!importPreview || importErrors.length > 0) return;

    const resultados = [];
    const nuevos = [];

    importPreview.forEach((row, i) => {
      const docExistente = personal.find(p => p.documento === String(row['Número de Documento']).trim());
      if (docExistente) {
        resultados.push({ fila: i + 2, nombre: row['Nombre Completo'], ok: false, msg: `Documento ${row['Número de Documento']} ya existe en el sistema.` });
        return;
      }
      const nuevo = {
        id: Date.now() + i,
        nombre: String(row['Nombre Completo']).trim(),
        documento: String(row['Número de Documento']).trim(),
        correo: String(row['Correo Electrónico']).trim(),
        cargo: String(row['Cargo']).trim(),
        municipio: String(row['Municipio']).trim(),
        equipo: String(row['Equipo Asignado']).trim(),
        rol: String(row['Rol']).trim(),
        password: null,
        estado: 'Pendiente',
      };
      nuevos.push(nuevo);
      resultados.push({ fila: i + 2, nombre: nuevo.nombre, ok: true, msg: 'Importado correctamente.' });
    });

    setPersonal(prev => [...prev, ...nuevos]);
    setImportResultados(resultados);
    setImportPreview(null);

    const exitosos = resultados.filter(r => r.ok).length;
    mostrarNotificacion(`Importación completada: ${exitosos} empleado(s) agregado(s) de ${resultados.length} fila(s) procesada(s).`);
  };

  const cerrarImport = () => {
    setModoImport(false);
    setImportPreview(null);
    setImportErrors([]);
    setImportResultados([]);
    setImportFileName('');
  };

  // ── Filtered list ───────────────────────────────────────────────────────────
  const personalFiltrado = personal.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.documento.includes(busqueda)
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="flex-1 flex flex-col p-4 md:p-8 animate-fade-in relative max-w-7xl mx-auto w-full">
         
         {/* ── Top navigation ── */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
           <div className="flex gap-3">
             <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-black font-bold flex items-center gap-2 w-fit bg-white px-4 py-2 rounded shadow border border-slate-300">
               <ArrowLeft className="w-4 h-4" /> Volver Atrás
             </button>
             <button onClick={() => navigate('/dashboard')} className="text-white hover:bg-slate-800 font-bold flex items-center gap-2 w-fit bg-slate-900 px-4 py-2 rounded shadow border border-slate-700">
               <Home className="w-4 h-4" /> Panel de Inicio FST
             </button>
           </div>
           {/* Role badge */}
           <span className="inline-flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
             Sesión activa: {rolActual}
           </span>
         </div>
         
         {/* ── Toast notification ── */}
         {notificacion && (
            <div className="fixed top-4 right-4 bg-green-900 border-l-4 border-green-500 text-white p-4 rounded-xl shadow-2xl z-50 flex items-start gap-3 max-w-md animate-fade-in">
               <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
               <div>
                 <h4 className="font-bold text-sm text-green-400 uppercase tracking-widest">Sistema Actualizado</h4>
                 <p className="text-sm text-slate-200 mt-1 leading-relaxed">{notificacion}</p>
               </div>
            </div>
         )}
         
         {/* ── Page header + action buttons ── */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <ShieldAlert className={`w-8 h-8 ${esAdmin ? 'text-accent-500' : 'text-primary-600'}`} /> 
                Bóveda de Registro de Personal
              </h1>
              <p className="text-slate-500 mt-1 font-medium">
                {esAdmin
                  ? 'Modo Activo: Permisos Absolutos de Administrador / Activador de Accesos.'
                  : 'Modo Operativo: Puedes agregar empleados, pero el Administrador validará su acceso final.'}
              </p>
            </div>
            
            {puedeGestionar && (
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={agregarPersonal}
                  className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-105 border border-slate-700"
                >
                  <UserPlus className="w-5 h-5 text-accent-500" /> Agregar Empleado Individual
                </button>
                <button
                  onClick={() => { setModoImport(true); setImportPreview(null); setImportErrors([]); setImportResultados([]); setImportFileName(''); }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-105 border border-emerald-900"
                >
                  <FileSpreadsheet className="w-5 h-5" /> Importar Lote de Empleados
                </button>
              </div>
            )}
         </div>

         {/* ── Info cards ── */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-primary-300 transition-colors">
               <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center shrink-0">
                 <Building2 className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Criterio de Usuario Oficial</p>
                  <p className="text-sm font-black text-primary-800">DOCUMENTO DE IDENTIDAD</p>
               </div>
            </div>
            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-colors ${esAdmin ? 'hover:border-amber-300' : 'opacity-70 grayscale'}`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${esAdmin ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                 <KeyRound className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Activación de Accesos</p>
                  <p className={`text-sm font-black ${esAdmin ? 'text-amber-800' : 'text-slate-600'}`}>Solo Módulo Administrativo</p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-green-300 transition-colors">
               <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                 <ShieldCheck className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Privacidad Bóveda</p>
                  <p className="text-sm font-black text-green-800">Sistema Inaccesible a Profesionales</p>
               </div>
            </div>
         </div>

         {/* ── Employee table ── */}
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 ${esAdmin ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
               <div className="relative w-full sm:w-96">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar empleado por cédula o nombre..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-slate-300 focus:border-primary-500 text-sm font-bold bg-white"
                  />
               </div>
               {esAdmin ? (
                  <div className="flex items-center gap-2 text-sm text-accent-500 font-bold bg-black/50 px-4 py-2 rounded-lg shadow-inner">
                    <ShieldAlert className="w-5 h-5" /> ¡Sistema Activador Maestro Autorizado!
                  </div>
               ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-bold bg-slate-200 px-4 py-2 rounded-lg shadow-inner border border-slate-300">
                    <ShieldCheck className="w-5 h-5" /> Permisos Ocultos: Eres Coordinadora/Operativa.
                  </div>
               )}
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-widest">
                        <th className="p-4 font-black border-b border-slate-300 border-r border-slate-200">Empleado FST</th>
                        <th className="p-4 font-black border-b border-slate-300 border-r border-slate-200">Contacto y Zona Asignada</th>
                        <th className="p-4 font-black border-b border-slate-300 border-r border-slate-200">Usuario y Nivel FST</th>
                        {esAdmin && (
                           <th className="p-4 font-black border-b text-amber-900 bg-amber-50 border-amber-200 border-r text-center">🔐 Llave de Acceso Secreta</th>
                        )}
                        <th className="p-4 font-black text-center border-b border-slate-300">Acciones Directas</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {personalFiltrado.length === 0 && (
                       <tr>
                         <td colSpan={esAdmin ? 5 : 4} className="p-10 text-center text-slate-400 font-bold">
                           {busqueda ? 'No se encontraron empleados con esa búsqueda.' : 'No hay empleados registrados.'}
                         </td>
                       </tr>
                     )}
                     {personalFiltrado.map((p) => (
                        <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                           
                           <td className="p-4 border-r border-slate-200 align-top">
                              <p className="font-bold text-slate-800 text-base">{p.nombre}</p>
                              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-bold">{p.cargo}</p>
                           </td>
                           
                           <td className="p-4 border-r border-slate-200 align-top">
                              <p className="flex items-center gap-1.5 text-sm text-slate-700 mb-1"><Mail className="w-4 h-4 text-slate-400"/> {p.correo}</p>
                              <p className="flex items-center gap-1.5 text-sm text-slate-700 bg-slate-50 px-2 py-1 rounded inline-flex border border-slate-200">
                                <MapPin className="w-4 h-4 text-slate-400"/> {p.municipio} <span className="font-bold ml-1 text-primary-700">({p.equipo})</span>
                              </p>
                           </td>

                           <td className="p-4 border-r border-slate-200 align-top">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Doc. Identidad / Usuario:</p>
                              <div className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-sm font-bold font-mono inline-block border border-slate-300 shadow-sm shadow-slate-200 mb-2">
                                {p.documento}
                              </div>
                              <div className="mt-1">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                  p.rol === 'Coordinadora Técnica' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                  p.rol === 'Coordinador' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                  'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                  Rol: {p.rol}
                                </span>
                              </div>
                           </td>

                           {esAdmin && (
                              <td className="p-4 border-r border-slate-200 bg-amber-50/20 align-middle text-center">
                                {p.estado === 'Pendiente' ? (
                                   <div className="bg-amber-100 text-amber-800 px-3 py-2 rounded border border-amber-300 inline-flex flex-col items-center">
                                      <span className="font-bold text-xs uppercase animate-pulse mb-2">🟡 Esperando Clave</span>
                                      {puedeGenerarClave && (
                                        <button onClick={() => generarContrasena(p.id, p.nombre, p.correo, false)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-colors whitespace-nowrap">
                                          Generar Nueva Clave
                                        </button>
                                      )}
                                   </div>
                                ) : (
                                   <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm inline-block">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1">CLAVE ESTABLECIDA</p>
                                      <p className="font-mono text-xl font-black text-slate-800 tracking-widest bg-slate-100 px-2 py-1 rounded select-all">{p.password}</p>
                                   </div>
                                )}
                              </td>
                           )}

                           <td className="p-4 align-middle">
                              <div className="flex flex-col items-center gap-3 w-full max-w-[150px] mx-auto">
                                 {puedeGenerarClave && p.estado === 'Activo' && (
                                   <button onClick={() => generarContrasena(p.id, p.nombre, p.correo, true)} className="flex items-center justify-center gap-2 px-3 py-2 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all border border-slate-300 text-xs font-bold w-full shadow-sm" title="Revocar clave existente y enviar una nueva">
                                     <RefreshCw className="w-3 h-3" /> Reiniciar Clave
                                   </button>
                                 )}
                                 {puedeEliminar && (
                                   <button onClick={() => eliminarPersonal(p.id, p.nombre)} className="flex items-center justify-center gap-2 px-3 py-2 text-red-700 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-red-200 text-xs font-bold w-full shadow-sm" title="Bloquear Usuario Inmediatamente">
                                     <Trash2 className="w-4 h-4" /> Eliminar Perfil
                                   </button>
                                 )}
                                 {!puedeEliminar && !puedeGenerarClave && (
                                   <span className="text-xs text-slate-400 italic text-center">Sin acciones disponibles</span>
                                 )}
                              </div>
                           </td>
                           
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          BULK IMPORT MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {modoImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 animate-fade-in">
            
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-emerald-900 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-emerald-300" />
                <div>
                  <h2 className="text-xl font-bold text-white">Importar Lote de Empleados</h2>
                  <p className="text-emerald-300 text-sm mt-0.5">Carga masiva desde archivo Excel o CSV</p>
                </div>
              </div>
              <button onClick={cerrarImport} className="text-emerald-300 hover:text-white p-2 rounded-lg hover:bg-emerald-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* Step 1: Download template */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                  Descargar Plantilla Excel
                </h3>
                <p className="text-sm text-slate-500 mb-4 ml-8">
                  Descarga la plantilla oficial con las columnas requeridas. Completa los datos y guarda el archivo.
                </p>
                <div className="ml-8 flex flex-wrap gap-3 items-center">
                  <button
                    onClick={descargarPlantilla}
                    className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow border border-emerald-900"
                  >
                    <Download className="w-4 h-4" /> Descargar Plantilla Excel
                  </button>
                  <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <p className="font-bold text-slate-700 mb-1">Columnas requeridas:</p>
                    <p className="font-mono">{TEMPLATE_COLUMNS.join(' · ')}</p>
                    <p className="mt-1">Roles válidos: <span className="font-bold text-emerald-700">{IMPORTABLE_ROLES.join(', ')}</span></p>
                  </div>
                </div>
              </div>

              {/* Step 2: Upload file */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                  Subir Archivo Excel
                </h3>
                <p className="text-sm text-slate-500 mb-4 ml-8">
                  Acepta archivos <strong>.xlsx</strong>, <strong>.xls</strong> y <strong>.csv</strong>. La primera fila debe ser el encabezado.
                </p>
                <div className="ml-8">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="import-file-input"
                  />
                  <label
                    htmlFor="import-file-input"
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow border border-slate-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {importFileName ? `Archivo: ${importFileName}` : 'Seleccionar Archivo (.xlsx / .csv)'}
                  </label>
                </div>
              </div>

              {/* Validation errors */}
              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5" /> {importErrors.length} Error(es) de Validación
                  </h4>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5 shrink-0">•</span> {err}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-3 font-bold">Corrige los errores en el archivo y vuelve a subirlo.</p>
                </div>
              )}

              {/* Step 3: Preview */}
              {importPreview && importErrors.length === 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
                    Vista Previa — {importPreview.length} empleado(s) listos para importar
                  </h3>
                  <p className="text-sm text-slate-500 mb-4 ml-8">Revisa los datos antes de confirmar. Esta acción no se puede deshacer.</p>
                  
                  <div className="overflow-x-auto rounded-lg border border-slate-200 ml-8">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <th className="p-3 border-r border-slate-300">#</th>
                          {TEMPLATE_COLUMNS.map(col => (
                            <th key={col} className="p-3 border-r border-slate-300 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="hover:bg-emerald-50">
                            <td className="p-3 border-r border-slate-200 text-slate-400 font-bold">{i + 1}</td>
                            {TEMPLATE_COLUMNS.map(col => (
                              <td key={col} className="p-3 border-r border-slate-200 text-slate-700 whitespace-nowrap max-w-[160px] truncate" title={String(row[col] ?? '')}>
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 ml-8 flex gap-3">
                    <button
                      onClick={confirmarImport}
                      className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow border border-emerald-900"
                    >
                      <CheckCircle className="w-5 h-5" /> Confirmar e Importar {importPreview.length} Empleado(s)
                    </button>
                    <button
                      onClick={() => { setImportPreview(null); setImportFileName(''); }}
                      className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold transition-colors shadow border border-slate-300"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Import results */}
              {importResultados.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" /> Resultados de la Importación
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importResultados.map((r, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${r.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {r.ok
                          ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        }
                        <div>
                          <span className="font-bold">{r.nombre}</span>
                          <span className="text-slate-500 ml-2">(Fila {r.fila})</span>
                          <p className={`text-xs mt-0.5 ${r.ok ? 'text-green-700' : 'text-red-700'}`}>{r.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={cerrarImport}
                    className="mt-4 flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow border border-slate-700 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" /> Cerrar y Ver Empleados
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
