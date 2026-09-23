import { useState, useEffect } from 'react';
import axios from 'axios';

export default function EmpleadosManager({ empresaId }) {
  const [empleados, setEmpleados] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSel, setEmpresaSel] = useState('');
  const [cargando, setCargando] = useState(false);
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });

  const ROLES = ['ADMINISTRADOR', 'USUARIO'];

  // Estados del formulario (Ya no hay contraseña, se usa el código de 5 dígitos)
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState('USUARIO');

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function cargarDatos() {
    try {
      const params = empresaId ? { params: { empresaId } } : {};
      const resEmpleados = await axios.get('http://localhost:8080/api/empleados', params);
      setEmpleados(resEmpleados.data);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
      setNotificacion({ tipo: 'error', mensaje: 'Error al conectar con la base de datos.' });
    }
  }

  useEffect(() => {
    axios.get('http://localhost:8080/api/empresas')
      .then(res => {
        setEmpresas(res.data);
        if (empresaId) setEmpresaSel(String(empresaId));
      })
      .catch(err => console.error("Error al cargar empresas:", err));
  }, [empresaId]);

  const generarCodigoAleatorio = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 5; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodigoEmpresa(codigo);
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    
    if (codigoEmpresa.length !== 5) {
      setNotificacion({ tipo: 'error', mensaje: 'El código debe ser de exactamente 5 caracteres.' });
      return;
    }

    setCargando(true);
    setNotificacion({ tipo: '', mensaje: '' });

    try {
      // El empleado nace "inactivo" y sin usuario/contraseña hasta que haga su "Primer Ingreso"
      const nuevoEmpleado = {
        nombreCompleto: nombre,
        correoElectronico: correo,
        numeroEmpleado: codigoEmpresa.toUpperCase(),
        activo: false,
        rol: rolSeleccionado,
        idEmpresa: empresaSel || undefined
      };

      await axios.post('http://localhost:8080/api/empleados', nuevoEmpleado);
      
      setNotificacion({ tipo: 'exito', mensaje: 'Empleado registrado. Entrégale su código de 5 dígitos.' });
      
      setNombre('');
      setCorreo('');
      setCodigoEmpresa('');
      setRolSeleccionado('USUARIO');
      
      cargarDatos();
    } catch (error) {
      console.error("Error al registrar empleado:", error);
      setNotificacion({ tipo: 'error', mensaje: 'No se pudo registrar. Verifica que el código o correo no estén repetidos.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Directorio de Empleados</h2>
        <p className="text-sm text-slate-500 mt-1">Registra personal nuevo generándoles un código de activación único.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* PANEL IZQUIERDO: FORMULARIO DE REGISTRO */}
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
                <span>Código de Empresa</span>
                <button type="button" onClick={generarCodigoAleatorio} className="text-blue-600 hover:text-blue-800">Generar</button>
              </label>
              <input type="text" value={codigoEmpresa} onChange={(e) => setCodigoEmpresa(e.target.value)} maxLength={5} required placeholder="5 Caracteres" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase tracking-widest" />
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

        {/* PANEL DERECHO: TABLA DE EMPLEADOS */}
        <div className="xl:col-span-2">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Código / Empleado</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Perfil (Rol)</th>
                  <th className="px-6 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Estatus</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {empleados.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 italic">Cargando directorio...</td></tr>
                ) : (
                  empleados.map((emp) => (
                    <tr key={emp.idEmpleado || emp.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs text-blue-600 font-bold">{emp.numeroEmpleado || 'N/A'}</div>
                        <div className="font-bold text-slate-800">{emp.nombreCompleto}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {emp.empresa?.nombre || <span className="italic text-slate-400">Sin asignar</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {emp.usuario || <span className="italic text-slate-400">Sin activar</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${emp.rol === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {emp.rol || 'USUARIO'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {emp.usuario ? (
                          <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800">Activo</span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}