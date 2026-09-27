import { useState, useEffect } from 'react';
import axios from 'axios';

const ROLES = ['GESTOR', 'SUPERVISOR', 'ADMINISTRADOR', 'USUARIO'];

const mensajeError = (error, porDefecto) => {
  const dato = error.response?.data;
  if (typeof dato === 'string' && dato.trim()) return dato;
  return porDefecto;
};

export default function EmpleadosManager({ empresaId }) {
  const [empleados, setEmpleados] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [rolesCampana, setRolesCampana] = useState([]);
  const [empresaSel, setEmpresaSel] = useState('');
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });
  const [busqueda, setBusqueda] = useState('');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState('GESTOR');
  const [supervisorSel, setSupervisorSel] = useState('');
  const [empleadoSel, setEmpleadoSel] = useState(null);
  const [rolEdit, setRolEdit] = useState('');
  const [campanaEdit, setCampanaEdit] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  useEffect(() => {
    axios.get('/api/empresas')
      .then(res => {
        setEmpresas(res.data);
        if (empresaId) setEmpresaSel(String(empresaId));
      })
      .catch(err => console.error("Error al cargar empresas:", err));
  }, [empresaId]);

  async function cargarDatos() {
    try {
      const resEmpleados = await axios.get('/api/empleados');
      setEmpleados(resEmpleados.data);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
      setNotificacion({ tipo: 'error', mensaje: mensajeError(error, 'No se pudo cargar el directorio.') });
    }
    // Campañas y roles_campana nutren la columna "Campaña"; si fallan la
    // tabla simplemente muestra "—" en lugar de tumbar el directorio.
    axios.get('/api/campanas')
      .then(res => setCampanas(res.data))
      .catch(err => console.error("Error al cargar campañas:", err));
    axios.get('/api/roles-campana')
      .then(res => setRolesCampana(res.data))
      .catch(err => console.error("Error al cargar roles por campaña:", err));
  }

  const generarCodigoAleatorio = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    let codigo = '';
    for (let i = 0; i < 5; i++) {
      codigo += chars.charAt(bytes[i] % chars.length);
    }
    setCodigoEmpresa(codigo);
  };

  const limpiarFormulario = () => {
    setNombre('');
    setCorreo('');
    setCodigoEmpresa('');
    setRolSeleccionado('GESTOR');
    setSupervisorSel('');
  };

  const handleRegistro = async (e) => {
    e.preventDefault();

    if (!/^[A-Za-z0-9]{5}$/.test(codigoEmpresa.trim())) {
      setNotificacion({ tipo: 'error', mensaje: 'El número de empleado debe tener exactamente 5 caracteres alfanuméricos.' });
      return;
    }

    setCargando(true);
    setNotificacion({ tipo: '', mensaje: '' });

    try {
      const nuevoEmpleado = {
        nombreCompleto: nombre.trim(),
        correoElectronico: correo.trim(),
        numeroEmpleado: codigoEmpresa.trim().toUpperCase(),
        rol: rolSeleccionado,
        idEmpresa: empresaSel || undefined,
        idSupervisor: supervisorSel || undefined
      };

      const respuesta = await axios.post('/api/empleados', nuevoEmpleado);
      const numero = respuesta.data?.numeroEmpleado || nuevoEmpleado.numeroEmpleado;

      setNotificacion({
        tipo: 'exito',
        mensaje: `Empleado registrado con el número ${numero}. Entrégaselo para que cree su usuario y contraseña.`
      });

      limpiarFormulario();
      await cargarDatos();
    } catch (error) {
      console.error("Error al registrar empleado:", error);
      setNotificacion({
        tipo: 'error',
        mensaje: mensajeError(error, 'No se pudo registrar el empleado.')
      });
    } finally {
      setCargando(false);
    }
  };

  const handleCambioEstado = async (empleado, activar) => {
    const accion = activar ? 'reactivar' : 'dar de baja';
    if (!window.confirm(`¿Seguro que quieres ${accion} a ${empleado.nombreCompleto} (${empleado.numeroEmpleado})?`)) {
      return;
    }

    setNotificacion({ tipo: '', mensaje: '' });
    try {
      const respuesta = await axios.post('/api/empleados/estado', {
        numeroEmpleado: empleado.numeroEmpleado,
        activo: String(activar)
      });
      setNotificacion({ tipo: 'exito', mensaje: respuesta.data?.mensaje || 'Estado actualizado' });
      await cargarDatos();
    } catch (error) {
      console.error("Error al cambiar el estado:", error);
      setNotificacion({ tipo: 'error', mensaje: mensajeError(error, 'No se pudo actualizar el estado.') });
    }
  };

  const handleCambiarRol = async (empleado) => {
    const ok = window.confirm(
      `¿Cambiar el rol de ${empleado.nombreCompleto} (${empleado.numeroEmpleado}) a ${rolEdit}?`
    );
    if (!ok) return;

    setNotificacion({ tipo: '', mensaje: '' });
    try {
      const respuesta = await axios.put(`/api/empleados/${empleado.numeroEmpleado}/rol`, { rol: rolEdit });
      setNotificacion({ tipo: 'exito', mensaje: respuesta.data?.mensaje || 'Rol actualizado' });
      await cargarDatos();
    } catch (error) {
      console.error("Error al cambiar el rol:", error);
      setNotificacion({ tipo: 'error', mensaje: mensajeError(error, 'No se pudo cambiar el rol.') });
    }
  };

  const handleCambiarCampana = async (empleado) => {
    if (!campanaEdit) {
      setNotificacion({ tipo: 'error', mensaje: 'Selecciona la campaña de destino.' });
      return;
    }
    const destino = campanas.find(c => String(c.idCampana) === String(campanaEdit));
    const ok = window.confirm(
      `¿Cambiar a ${empleado.nombreCompleto} (${empleado.numeroEmpleado}) a la campaña ${destino?.nombreEmpresa || ''}?`
    );
    if (!ok) return;

    setNotificacion({ tipo: '', mensaje: '' });
    try {
      const respuesta = await axios.put(`/api/empleados/${empleado.numeroEmpleado}/campana`, {
        idCampana: String(campanaEdit)
      });
      setNotificacion({ tipo: 'exito', mensaje: respuesta.data?.mensaje || 'Campaña actualizada' });
      await cargarDatos();
    } catch (error) {
      console.error("Error al cambiar la campaña:", error);
      setNotificacion({ tipo: 'error', mensaje: mensajeError(error, 'No se pudo cambiar la campaña.') });
    }
  };

  const campanasDe = (empleado) => {
    const id = empleado.empresa?.idEmpresa ?? empresaId;
    return campanas.filter(c => String(c.empresa?.idEmpresa) === String(id));
  };

  const campanaActivaDe = (empleado) =>
    rolesCampana.filter(r => r.activo && r.empleado?.idEmpleado === empleado.idEmpleado);

  const supervisores = empleados.filter((emp) => emp.rol === 'SUPERVISOR');

  const empleadosFiltrados = (() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return empleados;
    return empleados.filter((emp) =>
      (emp.numeroEmpleado || '').toLowerCase().includes(t) ||
      (emp.nombreCompleto || '').toLowerCase().includes(t) ||
      (emp.usuario || '').toLowerCase().includes(t) ||
      (emp.correoElectronico || '').toLowerCase().includes(t) ||
      (emp.rol || '').toLowerCase().includes(t)
    );
  })();

  const estiloRol = (rol) => {
    if (rol === 'ADMINISTRADOR') return 'bg-purple-100 text-purple-800';
    if (rol === 'SUPERVISOR') return 'bg-amber-100 text-amber-800';
    if (rol === 'GESTOR') return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-700';
  };

  const abrirModal = (emp) => {
    setEmpleadoSel(emp);
    setRolEdit(emp.rol || 'GESTOR');
    setCampanaEdit(String(campanaActivaDe(emp)[0]?.campana?.idCampana ?? ''));
    setNotificacion({ tipo: '', mensaje: '' });
  };

  const sel = !empleadoSel
    ? null
    : empleadoSel.idEmpleado != null
      ? empleados.find(e => e.idEmpleado === empleadoSel.idEmpleado) || empleadoSel
      : empleadoSel;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Alta, Baja, Roles y Campañas de Empleados</h2>
        <p className="text-sm text-slate-500 mt-1">
          Registra al personal y entrégale su número de empleado. Con ese número él mismo crea su usuario y contraseña.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        <div className="xl:col-span-1 bg-slate-50 p-5 rounded-lg border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-700 mb-4">Alta de Personal</h3>

          <form onSubmit={handleRegistro} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nombre Completo</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej. Juan Pérez" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required placeholder="juan@bpo.com" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex justify-between">
                <span>Número de Empleado</span>
                <button type="button" onClick={generarCodigoAleatorio} className="text-blue-600 hover:text-blue-800">Generar</button>
              </label>
              <input
                type="text"
                value={codigoEmpresa}
                onChange={(e) => setCodigoEmpresa(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                maxLength={5}
                required
                placeholder="5 Caracteres"
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase tracking-widest"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Empresa de Pertenencia</label>
              <select value={empresaSel} onChange={(e) => setEmpresaSel(e.target.value)} required className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="">Selecciona una empresa...</option>
                {empresas.map(emp => (
                  <option key={emp.idEmpresa} value={String(emp.idEmpresa)}>{emp.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Rol en el Sistema</label>
              <select value={rolSeleccionado} onChange={(e) => setRolSeleccionado(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {ROLES.map(rol => (
                  <option key={rol} value={rol}>{rol}</option>
                ))}
              </select>
            </div>

            {rolSeleccionado === 'GESTOR' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Supervisor</label>
                <select value={supervisorSel} onChange={(e) => setSupervisorSel(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Sin supervisor</option>
                  {supervisores.map(sup => (
                    <option key={sup.idEmpleado} value={sup.numeroEmpleado}>
                      {sup.numeroEmpleado} - {sup.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" disabled={cargando} className={`w-full font-bold py-2 px-4 rounded transition-colors mt-2 ${cargando ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {cargando ? 'Guardando...' : 'Registrar Empleado'}
            </button>
          </form>

          {!empleadoSel && notificacion.mensaje && (
            <div className={`mt-4 p-3 rounded text-sm font-bold ${notificacion.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {notificacion.mensaje}
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Buscar en el directorio
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
                  placeholder="Escribe el número de empleado, ej. S1G01"
                  className="w-full p-2 pl-3 pr-20 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
              {busqueda.trim()
                ? `${empleadosFiltrados.length} de ${empleados.length}`
                : `${empleados.length} en total`}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Número / Empleado</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Campaña</th>
                  <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Estatus</th>
                  <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {empleados.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500 italic">Cargando directorio...</td></tr>
                ) : empleadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      Sin resultados para <span className="font-mono font-bold text-slate-700">{busqueda}</span>
                    </td>
                  </tr>
                ) : (
                  empleadosFiltrados.map((emp) => {
                    const sinUsuario = !emp.usuario;
                    return (
                      <tr
                        key={emp.idEmpleado || emp.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => abrirModal(emp)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-mono text-xs text-blue-600 font-bold">{emp.numeroEmpleado || 'N/A'}</div>
                          <div className="font-bold text-slate-800">{emp.nombreCompleto}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                          {emp.usuario || <span className="italic text-slate-400">Sin activar</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${estiloRol(emp.rol)}`}>
                            {emp.rol || 'USUARIO'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const activas = campanaActivaDe(emp);
                            if (activas.length === 0) {
                              return <span className="italic text-slate-400">—</span>;
                            }
                            const extra = activas.length - 1;
                            return (
                              <span className="text-xs font-semibold text-slate-700">
                                {activas[0].campana?.nombreEmpresa || '—'}
                                {extra > 0 && <span className="text-slate-400 font-bold"> (+{extra})</span>}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {emp.activo && !sinUsuario ? (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800">Activo</span>
                          ) : sinUsuario ? (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-800">De baja</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => abrirModal(emp)}
                            className="px-3 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Administrar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {sel && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Gestionar a ${sel.nombreCompleto}`}
          onClick={(e) => { if (e.target === e.currentTarget) setEmpleadoSel(null); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-blue-600 font-bold">{sel.numeroEmpleado || 'N/A'}</div>
                <h3 className="text-lg font-bold text-slate-800">{sel.nombreCompleto}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 inline-flex text-xs font-bold rounded-full ${!sel.usuario ? 'bg-yellow-100 text-yellow-800' : sel.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {!sel.usuario ? 'Pendiente' : sel.activo ? 'Activo' : 'De baja'}
                  </span>
                  <span className={`px-2 py-1 inline-flex text-xs font-bold rounded-full ${estiloRol(sel.rol)}`}>
                    {sel.rol || 'USUARIO'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmpleadoSel(null)}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-700 text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>

            {notificacion.mensaje && (
              <div className={`p-3 rounded text-sm font-bold ${notificacion.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {notificacion.mensaje}
              </div>
            )}

            <section>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Estatus</h4>
              {sel.activo && sel.usuario ? (
                <button
                  type="button"
                  onClick={() => handleCambioEstado(sel, false)}
                  className="px-4 py-2 text-sm font-bold rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Dar de baja
                </button>
              ) : !sel.activo && sel.usuario ? (
                <button
                  type="button"
                  onClick={() => handleCambioEstado(sel, true)}
                  className="px-4 py-2 text-sm font-bold rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Reactivar
                </button>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Aún no crea su usuario. Entrégale su número de empleado para que se dé de alta con su contraseña.
                </p>
              )}
            </section>

            <section>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Rol en el sistema</h4>
              <div className="flex gap-2">
                <select
                  aria-label="Rol"
                  value={rolEdit}
                  onChange={(e) => setRolEdit(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleCambiarRol(sel)}
                  className="px-4 py-2 text-sm font-bold rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  Guardar rol
                </button>
              </div>
            </section>

            <section>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Campaña asignada</h4>
              <div className="flex gap-2">
                <select
                  aria-label="Campaña"
                  value={campanaEdit}
                  onChange={(e) => setCampanaEdit(e.target.value)}
                  className="flex-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                >
                  <option value="">Selecciona campaña...</option>
                  {campanasDe(sel).map(c => (
                    <option key={c.idCampana} value={String(c.idCampana)}>{c.nombreEmpresa}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleCambiarCampana(sel)}
                  className="px-4 py-2 text-sm font-bold rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  Guardar campaña
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
