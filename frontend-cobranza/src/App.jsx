import { useState, useEffect } from 'react';
import axios from 'axios';
import DeudorCard from './components/DeudorCard';
import CampanaList from './components/CampanaList';
import DashboardKPI from './components/DashboardKPI';
import CatalogosManager from './components/CatalogosManager';
import AuditoriaViewer from './components/AuditoriaViewer';
import AsignacionCartera from './components/AsignacionCartera';
import EmpleadosManager from './components/EmpleadosManager';

function App() {
  // --- ESTADO DE AUTENTICACIÓN ---
  const [empleadoAutenticado, setEmpleadoAutenticado] = useState(null);
  
  // --- ESTADOS DE LOGIN Y ACTIVACIÓN ---
  const [modoLogin, setModoLogin] = useState('ingresar'); // 'ingresar' o 'activar'
  const [loginUsuario, setLoginUsuario] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');

  // --- ESTADOS DE DATOS ---
  const [campanas, setCampanas] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [pagos, setPagos] = useState([]);

  // --- ESTADOS DE UI ---
  const [vistaActual, setVistaActual] = useState('gestion');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [deudorBuscado, setDeudorBuscado] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');

  const recargarDatosDinamicos = () => {
    const params = empleadoAutenticado?.idEmpresa ? { params: { empresaId: empleadoAutenticado.idEmpresa } } : {};
    axios.get('http://localhost:8080/api/deudas', params).then(res => setDeudas(res.data)).catch(console.error);
    axios.get('http://localhost:8080/api/gestiones', params).then(res => setGestiones(res.data)).catch(console.error);
    axios.get('http://localhost:8080/api/pagos', params).then(res => setPagos(res.data)).catch(console.error);
  };

  useEffect(() => {
    if (empleadoAutenticado) {
      const params = empleadoAutenticado.idEmpresa ? { params: { empresaId: empleadoAutenticado.idEmpresa } } : {};
      axios.get('http://localhost:8080/api/campanas', params).then(res => setCampanas(res.data)).catch(console.error);
      axios.get('http://localhost:8080/api/deudores', params).then(res => setDeudores(res.data)).catch(console.error);
      recargarDatosDinamicos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoAutenticado]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await axios.post('http://localhost:8080/api/empleados/login', {
        usuario: loginUsuario.trim(),
        password: loginPass
      });

      if (response.status === 200) {
        setEmpleadoAutenticado(response.data);
      }
    } catch (err) {
      const mensaje = err.response?.data;
      setLoginError(typeof mensaje === 'string' ? mensaje : 'Usuario o contraseña incorrectos.');
    }
  };

  const handleActivarCuenta = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    if (!/^[A-Za-z0-9]{5}$/.test(codigoEmpresa)) {
      setLoginError('El código de empresa debe ser exactamente de 5 caracteres alfanuméricos.');
      return;
    }

    if (nuevaContrasena.length < 8) {
      setLoginError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/api/empleados/activar', {
        numeroEmpleado: codigoEmpresa.toUpperCase(),
        nuevoUsuario: nuevoUsuario.trim(),
        nuevaContrasena: nuevaContrasena
      });
      
      if (response.status === 200) {
        setModoLogin('ingresar');
        setLoginUsuario(response.data.usuario || '');
        setCodigoEmpresa('');
        setNuevoUsuario('');
        setNuevaContrasena('');
        alert('¡Cuenta activada con éxito! Ya puedes iniciar sesión.');
      }
    } catch (err) {
      const mensaje = err.response?.data;
      setLoginError(typeof mensaje === 'string' ? mensaje : 'Código inválido, usuario en uso o la cuenta ya fue activada.');
    }
  };

  const cerrarSesion = () => {
    setEmpleadoAutenticado(null);
    setVistaActual('gestion');
    setDeudorBuscado(null);
    setTerminoBusqueda('');
  };

  const buscarCliente = (e) => {
    e.preventDefault();
    setMensajeBusqueda('');
    const termino = (terminoBusqueda || '').trim().toLowerCase();
    let encontrado = null;

    if (termino) {
      const deudaPorCuenta = deudas.find(d => d.numeroCuenta && d.numeroCuenta.toLowerCase().includes(termino));
      if (deudaPorCuenta) {
        const idDeudor = deudaPorCuenta.deudor?.idDeudor ?? deudaPorCuenta.idDeudor;
        encontrado = deudores.find(d =>
          d.idDeudor === idDeudor || d.idDeudor?.toString() === idDeudor?.toString()
        );
      }
      if (!encontrado) {
        encontrado = deudores.find(d =>
          (d.documentoIdentidad && d.documentoIdentidad.toLowerCase().includes(termino)) ||
          (d.telefonoPrincipal && d.telefonoPrincipal.includes(termino)) ||
          (d.nombreCompleto && d.nombreCompleto.toLowerCase().includes(termino)) ||
          d.idDeudor?.toString() === termino ||
          d.id?.toString() === termino
        );
      }
    }

    if (encontrado) setDeudorBuscado(encontrado);
    else {
      setDeudorBuscado(null);
      setMensajeBusqueda('No se encontró ningún cliente con ese dato. Verifica el identificador.');
    }
  };

  // --- VISTA 1: PANTALLA DE LOGIN / ACTIVACIÓN ---
  if (!empleadoAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
          <div className="bg-blue-600 md:w-1/2 p-10 text-white flex flex-col justify-center">
            <h1 className="text-4xl font-black mb-4">Sistema BPO</h1>
            <p className="text-blue-100 text-lg">
              Portal Operativo de Cobranza. Ingresa tus credenciales o activa tu cuenta con el código proporcionado por Recursos Humanos.
            </p>
          </div>
          
          <div className="md:w-1/2 p-10 bg-white relative">
            <div className="flex border-b border-slate-200 mb-6">
              <button 
                onClick={() => {setModoLogin('ingresar'); setLoginError('');}}
                className={`pb-2 px-4 font-bold text-sm transition-colors ${modoLogin === 'ingresar' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Iniciar Sesión
              </button>
              <button 
                onClick={() => {setModoLogin('activar'); setLoginError('');}}
                className={`pb-2 px-4 font-bold text-sm transition-colors ${modoLogin === 'activar' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Primer Ingreso
              </button>
            </div>

            {modoLogin === 'ingresar' && (
              <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Usuario</label>
                  <input type="text" value={loginUsuario} onChange={(e) => setLoginUsuario(e.target.value)} required placeholder="Ej. juan.perez" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Contraseña</label>
                  <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required placeholder="Tu contraseña" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4">Entrar al Sistema</button>
              </form>
            )}

            {modoLogin === 'activar' && (
              <form onSubmit={handleActivarCuenta} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Código de Empresa (5 dígitos)</label>
                  <input type="text" value={codigoEmpresa} onChange={(e) => setCodigoEmpresa(e.target.value)} maxLength={5} required placeholder="Ej. A1B2C" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase font-mono tracking-widest"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Crea tu Usuario</label>
                  <input type="text" value={nuevoUsuario} onChange={(e) => setNuevoUsuario(e.target.value)} required placeholder="Elige un nombre de usuario" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Crea tu Contraseña</label>
                  <input type="password" value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} required placeholder="Mínimo 8 caracteres" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4">Activar mi Cuenta</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA 2: APLICACIÓN PRINCIPAL ---
  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-10 flex-shrink-0">
        <div className="p-5 bg-slate-950 border-b border-slate-800">
          <h1 className="text-xl font-black text-white tracking-tight">Sistema BPO</h1>
          <p className="text-xs text-slate-500 mt-1">Portal Operativo</p>
          {empleadoAutenticado.empresa && (
            <p className="text-[11px] mt-2 bg-blue-600/30 text-blue-200 rounded px-2 py-1 font-bold text-center">{empleadoAutenticado.empresa}</p>
          )}
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          <button onClick={() => setVistaActual('agenda')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'agenda' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>📅 Mi Agenda (Hoy)</button>
          <button onClick={() => setVistaActual('gestion')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'gestion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>📞 Panel de Gestión</button>
          <button onClick={() => setVistaActual('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>📊 Dashboard KPIs</button>
          <button onClick={() => setVistaActual('cartera')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'cartera' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>👥 Cartera Completa</button>
          <button onClick={() => setVistaActual('campanas')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'campanas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🏢 Campañas Activas</button>

          {empleadoAutenticado.rol === 'ADMINISTRADOR' && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="px-4 text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Administración</p>
              <button onClick={() => setVistaActual('empleados')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'empleados' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>👥 Directorio de Empleados</button>
              <button onClick={() => setVistaActual('asignacion')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'asignacion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🗂️ Asignar Cartera</button>
              <button onClick={() => setVistaActual('catalogos')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'catalogos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>⚙️ Catálogos Operativos</button>
              <button onClick={() => setVistaActual('auditoria')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'auditoria' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🛡️ Bitácora de Auditoría</button>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold uppercase">
              {empleadoAutenticado.nombre?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-white font-semibold text-xs">{empleadoAutenticado.nombre || empleadoAutenticado.usuario}</p>
              <p className="text-[10px] text-blue-400 font-bold">{empleadoAutenticado.rol}</p>
            </div>
          </div>
          <button onClick={cerrarSesion} className="text-slate-500 hover:text-red-400 transition-colors" title="Cerrar Sesión">
            🚪
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {vistaActual === 'agenda' && <div className="animate-fade-in">{/* ... Contenido de Agenda ... */}</div>}
          {vistaActual === 'gestion' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Buscador de Clientes</h2>
              <form onSubmit={buscarCliente} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buscar por Número de Cuenta, Nombre, Teléfono o ID</label>
                  <input type="text" value={terminoBusqueda} onChange={(e) => setTerminoBusqueda(e.target.value)} placeholder="Ej. TDC-456789" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors h-[46px]">Buscar Expediente</button>
                </div>
              </form>
              {mensajeBusqueda && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 mb-6 font-semibold text-center">{mensajeBusqueda}</div>}
              {deudorBuscado && <div className="mt-4"><DeudorCard deudor={deudorBuscado} deudas={deudas} gestiones={gestiones} pagos={pagos} onDatosActualizados={recargarDatosDinamicos} empleadoActual={empleadoAutenticado} /></div>}
              {!deudorBuscado && !mensajeBusqueda && (
                <div className="text-center py-20 text-slate-400">
                  <div className="text-6xl mb-4">🎧</div>
                  <p className="text-lg font-semibold">Esperando llamada...</p>
                </div>
              )}
            </div>
          )}
          {vistaActual === 'dashboard' && <div className="animate-fade-in"><DashboardKPI deudas={deudas} gestiones={gestiones} /></div>}
          {vistaActual === 'cartera' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Cartera Activa</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {deudores.map(deudor => <DeudorCard key={deudor.idDeudor || deudor.id} deudor={deudor} deudas={deudas} gestiones={gestiones} pagos={pagos} onDatosActualizados={recargarDatosDinamicos} empleadoActual={empleadoAutenticado} />)}
              </div>
            </div>
          )}
          {vistaActual === 'campanas' && <div className="animate-fade-in"><CampanaList campanas={campanas} /></div>}
          {vistaActual === 'empleados' && empleadoAutenticado.rol === 'ADMINISTRADOR' && <div className="animate-fade-in"><EmpleadosManager empresaId={empleadoAutenticado.idEmpresa} /></div>}
          {vistaActual === 'asignacion' && empleadoAutenticado.rol === 'ADMINISTRADOR' && <div className="animate-fade-in"><AsignacionCartera empresaId={empleadoAutenticado.idEmpresa} /></div>}
          {vistaActual === 'catalogos' && empleadoAutenticado.rol === 'ADMINISTRADOR' && <div className="animate-fade-in"><CatalogosManager /></div>}
          {vistaActual === 'auditoria' && empleadoAutenticado.rol === 'ADMINISTRADOR' && <div className="animate-fade-in"><AuditoriaViewer /></div>}
        </div>
      </main>
    </div>
  );
}

export default App;