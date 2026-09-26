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
  const [empresaSel, setEmpresaSel] = useState('');
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });
  const [busqueda, setBusqueda] = useState('');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState('GESTOR');
  const [supervisorSel, setSupervisorSel] = useState('');

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  useEffect(() => {
    axios.get('http://localhost:8080/api/empresas')
      .then(res => {
        setEmpresas(res.data);
        if (empresaId) setEmpresaSel(String(empresaId));
      })
      .catch(err => console.error("Error al cargar empresas:", err));
  }, [empresaId]);

  async function cargarDatos() {
    try {
      const params = empresaId ? { params: { empresaId } } : {};
      const resEmpleados = await axios.get('http://localhost:8080/api/empleados', params);
      setEmpleados(resEmpleados.data);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
      setNotificacion({ tipo: 'error', mensaje: mensajeError(error, 'No se pudo cargar el directorio.') });
    }
  }

  const generarCodigoAleatorio = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 5; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
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

      const respuesta = await axios.post('http://localhost:8080/api/empleados', nuevoEmpleado);
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
      const respuesta = await axios.post('http://localhost:8080/api/empleados/estado', {
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

  const handleEliminar = async (empleado) => {
    const ok = window.confirm(
      `Se eliminará el alta de ${empleado.nombreCompleto} (${empleado.numeroEmpleado}) y el número quedará disponible. ¿Continuar?`
    );
    if (!ok) return;

    setNotificacion({ tipo: '', mensaje: '' });
    try {
      const respuesta = await axios.delete(`http://localhost:8080/api/empleados/${empleado.numeroEmpleado}`);
      setNotificacion({ tipo: 'exito', mensaje: respuesta.data?.mensaje || 'Alta eliminada' });
      await cargarDatos();
    } catch (error) {
      console.error("Error al eliminar el alta:", error);
      setNotificacion({ tipo: 'error', mensaje: mensajeError(error, 'No se pudo eliminar el alta.') });
    }
  };

  const supervisores = empleados.filter((emp) => emp.rol === 'SUPERVISOR');

  const empleadosFiltrados = (() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return empleados;
    return empleados.filter((emp) =>
      (emp.numeroEmpleado || '').toLowerCase().includes(t) ||
      (emp.nombreCompleto || '').toLowerCase().includes(t) ||
      (emp.usuario || '').toLowerCase().includes(t) ||
      (emp.rol || '').toLowerCase().includes(t)
    );
  })();

  const estiloRol = (rol) => {
    if (rol === 'ADMINISTRADOR') return 'bg-purple-100 text-purple-800';
    if (rol === 'SUPERVISOR') return 'bg-amber-100 text-amber-800';
    if (rol === 'GESTOR') return 'bg-blue-100 text-blue-800';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Alta y Baja de Empleados</h2>
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

          {notificacion.mensaje && (
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
                  <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Estatus</th>
                  <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {empleados.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 italic">Cargando directorio...</td></tr>
                ) : empleadosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      Sin resultados para <span className="font-mono font-bold text-slate-700">{busqueda}</span>
                    </td>
                  </tr>
                ) : (
                  empleadosFiltrados.map((emp) => {
                    const sinUsuario = !emp.usuario;
                    return (
                      <tr key={emp.idEmpleado || emp.id} className="hover:bg-slate-50">
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {emp.activo && !sinUsuario ? (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800">Activo</span>
                          ) : sinUsuario ? (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-800">De baja</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {emp.activo && !sinUsuario ? (
                            <button
                              onClick={() => handleCambioEstado(emp, false)}
                              className="px-3 py-1 text-xs font-bold rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Dar de baja
                            </button>
                          ) : sinUsuario ? (
                            <button
                              onClick={() => handleEliminar(emp)}
                              className="px-3 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Eliminar alta
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCambioEstado(emp, true)}
                              className="px-3 py-1 text-xs font-bold rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              Reactivar
                            </button>
                          )}
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
    </div>
  );
}
