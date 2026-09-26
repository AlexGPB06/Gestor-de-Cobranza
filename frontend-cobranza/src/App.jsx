import { useState, useEffect } from 'react';
import axios from 'axios';
import InfoGestion from './components/InfoGestion';
import CarteraGestor from './components/CarteraGestor';
import MiMeta from './components/MiMeta';
import MiMetaEquipo from './components/MiMetaEquipo';
import CampanaList from './components/CampanaList';
import CatalogosManager from './components/CatalogosManager';
import AuditoriaViewer from './components/AuditoriaViewer';
import AsignacionCartera from './components/AsignacionCartera';
import EmpleadosManager from './components/EmpleadosManager';
import SupervisionPanel from './components/SupervisionPanel';
import AsignacionSupervisor from './components/AsignacionSupervisor';
import PromesasSupervisor from './components/PromesasSupervisor';
import { esOperador, esAdministrador, esSupervisor, resolverVista, seccionesPermitidas } from './permisos';

function App() {
  // --- ESTADO DE AUTENTICACIÓN ---
  // La sesion guardada se lee de forma perezosa, en el primer render, en vez de
  // hidratar el estado con un efecto: asi no hay un render con la pantalla en
  // blanco antes de recuperar al empleado.
  const [empleadoAutenticado, setEmpleadoAutenticado] = useState(() => {
    const guardada = localStorage.getItem('empleado');
    if (!guardada) return null;
    try {
      return JSON.parse(guardada);
    } catch {
      localStorage.removeItem('empleado');
      return null;
    }
  });
  
  // --- ESTADOS DE LOGIN Y ACTIVACIÓN ---
  const [modoLogin, setModoLogin] = useState('ingresar'); // 'ingresar' o 'activar'
  const [loginUsuario, setLoginUsuario] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(() => {
    // El aviso de sesion expirada lo deja apiClient al recibir un 401; se consume
    // aqui de forma perezosa para no depender de un efecto que dispare un render extra.
    if (!sessionStorage.getItem('sesionExpirada')) return '';
    sessionStorage.removeItem('sesionExpirada');
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  });
  
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');

  // --- ESTADOS DE DATOS ---
  const [campanas, setCampanas] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [gestiones, setGestiones] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [tiposPromesa, setTiposPromesa] = useState([]);
  const [tiposTicket, setTiposTicket] = useState([]);
  const [tickets, setTickets] = useState([]);

  // --- ESTADOS DE UI ---
  // vistaSolicitada es lo que el usuario pide al pulsar el menu; vistaActual es la
  // que de verdad se muestra, ya recortada a las vistas que su rol permite. Se
  // deriva en el render en lugar de sincronizarla con un efecto.
  const [vistaSolicitada, setVistaSolicitada] = useState('info');
  const vistaActual = resolverVista(empleadoAutenticado?.rol, vistaSolicitada);
  const setVistaActual = setVistaSolicitada;
  const [tabInfo, setTabInfo] = useState('info'); // submenú dentro de Info/Gestión: info | gestion | pagos
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [deudorBuscado, setDeudorBuscado] = useState(null);
  const [deudaSeleccionadaId, setDeudaSeleccionadaId] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');

  const esGestor = esOperador(empleadoAutenticado?.rol);

  const recargarDatosDinamicos = () => {
    if (!empleadoAutenticado) return;
    const params = { params: { empresaId: empleadoAutenticado.idEmpresa } };
    const paramsGestor = { params: { empleadoId: empleadoAutenticado.idEmpleado } };
    // Pagos y tickets son operacion de cobranza: pedirlos aqui devolvia 403
    // para el administrador y el supervisor.
    if (!esGestor) return;
    axios.get('http://localhost:8080/api/pagos', params).then(res => setPagos(res.data)).catch(console.error);
    axios.get('http://localhost:8080/api/tickets', params).then(res => setTickets(res.data)).catch(console.error);
    axios.get('http://localhost:8080/api/gestiones', params).then(res => setGestiones(res.data)).catch(console.error);
    axios.get('http://localhost:8080/api/asignaciones-cartera', paramsGestor).then(res => setAsignaciones(res.data)).catch(console.error);
  };

  useEffect(() => {
    if (empleadoAutenticado) {
      const params = { params: { empresaId: empleadoAutenticado.idEmpresa } };
      axios.get('http://localhost:8080/api/campanas', params).then(res => setCampanas(res.data)).catch(console.error);
      axios.get('http://localhost:8080/api/conceptos', params).then(res => setConceptos(res.data)).catch(console.error);
      if (esGestor) {
        axios.get('http://localhost:8080/api/deudores', params).then(res => setDeudores(res.data)).catch(console.error);
        axios.get('http://localhost:8080/api/deudas', params).then(res => setDeudas(res.data)).catch(console.error);
        axios.get('http://localhost:8080/api/motivos-no-pago', params).then(res => setMotivos(res.data)).catch(console.error);
        axios.get('http://localhost:8080/api/tipos-promesa', params).then(res => setTiposPromesa(res.data)).catch(console.error);
        axios.get('http://localhost:8080/api/tipos-ticket', params).then(res => setTiposTicket(res.data)).catch(console.error);
        axios.get('http://localhost:8080/api/asignaciones-cartera', { params: { empleadoId: empleadoAutenticado.idEmpleado } }).then(res => setAsignaciones(res.data)).catch(console.error);
      }
      recargarDatosDinamicos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoAutenticado]);

  useEffect(() => {
    recargarDatosDinamicos();
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
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('rol', response.data.rol);
        localStorage.setItem('empleado', JSON.stringify(response.data));
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
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('empleado');
    setEmpleadoAutenticado(null);
    setVistaActual('info');
    setTabInfo('info');
    setDeudorBuscado(null);
    setDeudaSeleccionadaId(null);
    setTerminoBusqueda('');
  };

  const limpiarSeleccion = () => {
    setDeudorBuscado(null);
    setDeudaSeleccionadaId(null);
    setMensajeBusqueda('');
  };

  const buscarPorCuenta = (e) => {
    e.preventDefault();
    setMensajeBusqueda('');
    const termino = (terminoBusqueda || '').trim().toLowerCase();
    let encontrado = null;

    if (termino) {
      const deudaPorCuenta = deudas.find(d => d.numeroCuenta && d.numeroCuenta.toLowerCase() === termino);
      if (deudaPorCuenta) {
        const idDeudor = deudaPorCuenta.deudor?.idDeudor ?? deudaPorCuenta.idDeudor;
        encontrado = deudores.find(d =>
          d.idDeudor === idDeudor || d.idDeudor?.toString() === idDeudor?.toString()
        );
      }
    }

    if (encontrado) {
      setDeudorBuscado(encontrado);
      const deudasDelCliente = deudas.filter(d => d.deudor?.idDeudor === encontrado.idDeudor);
      setDeudaSeleccionadaId(deudasDelCliente.length > 0 ? deudasDelCliente[0].idDeuda : null);
    } else {
      setDeudorBuscado(null);
      setDeudaSeleccionadaId(null);
      setMensajeBusqueda('No se encontró ningún producto con ese número. Verifica el identificador.');
    }
  };

  const seleccionarParaGestion = (deudor, deudaId) => {
    setDeudorBuscado(deudor);
    setDeudaSeleccionadaId(deudaId || null);
    setVistaActual('info');
    setTabInfo('gestion');
  };

  // --- VISTA 1: PANTALLA DE LOGIN / ACTIVACIÓN ---
  if (!empleadoAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
          <div className="bg-blue-600 md:w-1/2 p-10 text-white flex flex-col justify-center">
            <h1 className="text-4xl font-black mb-4">Sistema BPO</h1>
            <p className="text-blue-100 text-lg">
              Gestión de Cobranza. Ingresa tus credenciales o activa tu cuenta con el código proporcionado por Recursos Humanos.
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
          <p className="text-xs text-slate-500 mt-1">Gestión/Info</p>
          {empleadoAutenticado.empresa && (
            <p className="text-[11px] mt-2 bg-blue-600/30 text-blue-200 rounded px-2 py-1 font-bold text-center">{empleadoAutenticado.empresa}</p>
          )}
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {seccionesPermitidas(empleadoAutenticado.rol).includes('gestion') && (
            <div className="mb-1">
              <p className="px-4 text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Gestión/Info</p>
              <button onClick={() => setVistaActual('info')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'info' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🗂️ Info/Gestión</button>
              <button onClick={() => setVistaActual('cartera')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'cartera' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>👥 Mi Cartera</button>
              <button onClick={() => setVistaActual('meta')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'meta' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🎯 Mi Meta</button>
            </div>
          )}

          {seccionesPermitidas(empleadoAutenticado.rol).includes('administracion') && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="px-4 text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Administración</p>
              <button onClick={() => setVistaActual('empleados')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'empleados' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>👥 Alta / Baja de Empleados</button>
              <button onClick={() => setVistaActual('asignacion')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'asignacion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🗂️ Asignar Cartera</button>
              <button onClick={() => setVistaActual('catalogos')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'catalogos' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>⚙️ Catálogos Operativos</button>
              <button onClick={() => setVistaActual('auditoria')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'auditoria' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🛡️ Bitácora de Auditoría</button>
              <button onClick={() => setVistaActual('campanas')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'campanas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🏢 Campañas Activas</button>
            </div>
          )}

          {seccionesPermitidas(empleadoAutenticado.rol).includes('supervision') && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="px-4 text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Supervisión</p>
              <button onClick={() => setVistaActual('supervision')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'supervision' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>👁️ Monitoreo de Equipo</button>
              <button onClick={() => setVistaActual('asignacionSup')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'asignacionSup' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🗂️ Asignar Carteras</button>
              <button onClick={() => setVistaActual('promesasSup')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'promesasSup' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🎁 Promesas del Equipo</button>
              <button onClick={() => setVistaActual('metaEquipo')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'metaEquipo' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🎯 Meta del Equipo</button>
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
          {vistaActual === 'info' && esGestor && (
            <InfoGestion
              terminoBusqueda={terminoBusqueda}
              onTerminoChange={setTerminoBusqueda}
              onBuscar={buscarPorCuenta}
              mensajeBusqueda={mensajeBusqueda}
              deudorBuscado={deudorBuscado}
              limpiarSeleccion={limpiarSeleccion}
              deudas={deudas}
              deudaSeleccionadaId={deudaSeleccionadaId}
              onCambiarDeuda={setDeudaSeleccionadaId}
              gestiones={gestiones}
              conceptos={conceptos}
              motivos={motivos}
              empleadoActual={empleadoAutenticado}
              onGestionAgregada={recargarDatosDinamicos}
              pagos={pagos}
              tab={tabInfo}
              setTab={setTabInfo}
              tiposPromesa={tiposPromesa}
              tickets={tickets}
              tiposTicket={tiposTicket}
              onDatosActualizados={recargarDatosDinamicos}
            />
          )}
          {vistaActual === 'cartera' && esGestor && (
            <CarteraGestor
              asignaciones={asignaciones}
              onSeleccionar={seleccionarParaGestion}
            />
          )}
          {vistaActual === 'meta' && esGestor && (
            <MiMeta
              empleadoActual={empleadoAutenticado}
              gestiones={gestiones}
            />
          )}
          {vistaActual === 'metaEquipo' && esSupervisor(empleadoAutenticado.rol) && <MiMetaEquipo supervisorId={empleadoAutenticado.idEmpleado} />}
          {vistaActual === 'campanas' && esAdministrador(empleadoAutenticado.rol) && <div className="animate-fade-in"><CampanaList campanas={campanas} /></div>}
          {vistaActual === 'empleados' && esAdministrador(empleadoAutenticado.rol) && <div className="animate-fade-in"><EmpleadosManager empresaId={empleadoAutenticado.idEmpresa} /></div>}
          {vistaActual === 'asignacion' && esAdministrador(empleadoAutenticado.rol) && <div className="animate-fade-in"><AsignacionCartera empresaId={empleadoAutenticado.idEmpresa} /></div>}
          {vistaActual === 'catalogos' && esAdministrador(empleadoAutenticado.rol) && <div className="animate-fade-in"><CatalogosManager /></div>}
          {vistaActual === 'auditoria' && esAdministrador(empleadoAutenticado.rol) && <div className="animate-fade-in"><AuditoriaViewer /></div>}
          {vistaActual === 'supervision' && esSupervisor(empleadoAutenticado.rol) && <SupervisionPanel supervisorId={empleadoAutenticado.idEmpleado} />}
          {vistaActual === 'asignacionSup' && esSupervisor(empleadoAutenticado.rol) && <AsignacionSupervisor supervisorId={empleadoAutenticado.idEmpleado} empresaId={empleadoAutenticado.idEmpresa} />}
          {vistaActual === 'promesasSup' && esSupervisor(empleadoAutenticado.rol) && <PromesasSupervisor supervisorId={empleadoAutenticado.idEmpleado} empresaId={empleadoAutenticado.idEmpresa} />}
        </div>
      </main>
    </div>
  );
}

export default App;