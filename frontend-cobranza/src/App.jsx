import { useState, useEffect } from 'react';
import axios from 'axios';
import DeudorCard from './components/DeudorCard';
import CampanaList from './components/CampanaList';
import DashboardKPI from './components/DashboardKPI';

function App() {
  // --- ESTADO DE AUTENTICACIÓN ---
  const [empleadoAutenticado, setEmpleadoAutenticado] = useState(null);
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ESTADOS DE DATOS ---
  const [campanas, setCampanas] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [gestiones, setGestiones] = useState([]);

  const [vistaActual, setVistaActual] = useState('gestion');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [deudorBuscado, setDeudorBuscado] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState('');

  const cargarGestiones = () => {
    axios.get('http://localhost:8080/api/gestiones')
      .then(response => setGestiones(response.data))
      .catch(error => console.error("Error en gestiones:", error));
  };

  // Solo cargamos la base de datos si el empleado ya inició sesión
  useEffect(() => {
    if (empleadoAutenticado) {
      axios.get('http://localhost:8080/api/campanas').then(res => setCampanas(res.data)).catch(console.error);
      axios.get('http://localhost:8080/api/deudores').then(res => setDeudores(res.data)).catch(console.error);
      axios.get('http://localhost:8080/api/deudas').then(res => setDeudas(res.data)).catch(console.error);
      cargarGestiones();
    }
  }, [empleadoAutenticado]);

  // --- FUNCIÓN DE LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    // Validación simulada en frontend. 
    if (loginId === '1' && loginPass === 'admin123') {
      setEmpleadoAutenticado({
        idEmpleado: parseInt(loginId),
        nombre: 'Alex',
        rol: 'Gestor de Cobranza'
      });
      setLoginError('');
    } else {
      setLoginError('Credenciales inválidas. Usa ID: 1 y Contraseña: admin123');
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
    const encontrado = deudores.find(d => 
      d.telefonoPrincipal.includes(terminoBusqueda) || 
      d.nombreCompleto.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      d.idDeudor.toString() === terminoBusqueda
    );
    if (encontrado) setDeudorBuscado(encontrado);
    else {
      setDeudorBuscado(null);
      setMensajeBusqueda('No se encontró ningún cliente con ese dato. Verifica el identificador.');
    }
  };

  // --- VISTA 1: PANTALLA DE LOGIN ---
  if (!empleadoAutenticado) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
          <div className="bg-blue-600 md:w-1/2 p-10 text-white flex flex-col justify-center">
            <h1 className="text-4xl font-black mb-4">Sistema BPO</h1>
            <p className="text-blue-100 text-lg">Portal Operativo de Cobranza. Ingresa tus credenciales para iniciar tu turno.</p>
          </div>
          <div className="md:w-1/2 p-10 bg-white">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Iniciar Sesión</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">ID de Empleado</label>
                <input 
                  type="number" value={loginId} onChange={(e) => setLoginId(e.target.value)}
                  required placeholder="Ej. 1"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Contraseña</label>
                <input 
                  type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                  required placeholder="admin123"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4">
                Entrar al Sistema
              </button>
            </form>
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
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-2">
          <button onClick={() => setVistaActual('gestion')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'gestion' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>📞 Panel de Gestión</button>
          <button onClick={() => setVistaActual('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>📊 Dashboard KPIs</button>
          <button onClick={() => setVistaActual('cartera')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'cartera' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>👥 Cartera Completa</button>
          <button onClick={() => setVistaActual('campanas')} className={`w-full flex items-center px-4 py-3 rounded-lg font-semibold transition-colors ${vistaActual === 'campanas' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>🏢 Campañas Activas</button>
        </nav>
        
        {/* Mostramos los datos reales del empleado logueado */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold uppercase">
              {empleadoAutenticado.nombre.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold text-xs">{empleadoAutenticado.nombre}</p>
              <p className="text-[10px] text-slate-400">{empleadoAutenticado.rol}</p>
            </div>
          </div>
          <button onClick={cerrarSesion} className="text-slate-500 hover:text-red-400 transition-colors" title="Cerrar Sesión">
            🚪
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          
          {vistaActual === 'gestion' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Buscador de Clientes</h2>
              <form onSubmit={buscarCliente} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buscar por Nombre, Teléfono o ID</label>
                  <input type="text" value={terminoBusqueda} onChange={(e) => setTerminoBusqueda(e.target.value)} placeholder="Ej. 8112345678" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors h-[46px]">Buscar Expediente</button>
                </div>
              </form>

              {mensajeBusqueda && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 mb-6 font-semibold text-center">{mensajeBusqueda}</div>}

              {deudorBuscado && (
                <div className="mt-4">
                  {/* Pasamos el empleado a la tarjeta del deudor */}
                  <DeudorCard 
                    deudor={deudorBuscado} 
                    deudas={deudas} 
                    gestiones={gestiones} 
                    onGestionAgregada={cargarGestiones} 
                    empleadoActual={empleadoAutenticado} 
                  />
                </div>
              )}
              
              {!deudorBuscado && !mensajeBusqueda && (
                <div className="text-center py-20 text-slate-400">
                  <div className="text-6xl mb-4">🎧</div>
                  <p className="text-lg font-semibold">Esperando llamada...</p>
                  <p className="text-sm">Ingresa un identificador para comenzar la gestión de cobranza.</p>
                </div>
              )}
            </div>
          )}

          {vistaActual === 'dashboard' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Métricas Globales</h2>
              <DashboardKPI deudas={deudas} gestiones={gestiones} />
            </div>
          )}

          {vistaActual === 'cartera' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Cartera Activa</h2>
              {deudores.length === 0 ? <p className="text-slate-500 italic">Cargando deudores...</p> : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {deudores.map(deudor => (
                    <DeudorCard 
                      key={deudor.idDeudor} 
                      deudor={deudor} 
                      deudas={deudas} 
                      gestiones={gestiones} 
                      onGestionAgregada={cargarGestiones} 
                      empleadoActual={empleadoAutenticado} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {vistaActual === 'campanas' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Portafolios Asignados</h2>
              <CampanaList campanas={campanas} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;