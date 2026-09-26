import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import DetalleVista from './DetalleVista';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const estaEnEsteMes = (fechaRegistro) => {
  const d = new Date(fechaRegistro);
  if (Number.isNaN(d.getTime())) return false;
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
};

export default function MiMetaEquipo({ supervisorId }) {
  const [equipoTodo, setEquipoTodo] = useState([]);
  const [equipoMes, setEquipoMes] = useState([]);
  const [promesas, setPromesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [refresco, setRefresco] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const ultimaGestion = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey && (e.key === 'F2' || e.code === 'F2')) {
        e.preventDefault();
        setDetalle(cur => (cur ? null : ultimaGestion.current));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    let activo = true;
    Promise.all([
      axios.get('http://localhost:8080/api/supervision/equipo', { params: { supervisorId } }),
      axios.get('http://localhost:8080/api/supervision/equipo', { params: { supervisorId, periodo: 'MES' } }),
      axios.get('http://localhost:8080/api/supervision/promesas', { params: { supervisorId } })
    ])
      .then(([a, b, c]) => {
        if (activo) {
          setEquipoTodo(a.data);
          setEquipoMes(b.data);
          setPromesas(c.data);
          setError('');
        }
      })
      .catch(() => { if (activo) setError('No se pudo consultar la meta del equipo.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [supervisorId, refresco]);

  const abrirDetalle = (g) => {
    ultimaGestion.current = g;
    setDetalle(g);
  };

  const cuentas = equipoTodo.reduce((acc, f) => acc + (f.cuentasAsignadas || 0), 0);
  const metaEquipo = equipoTodo.reduce((acc, f) => acc + Number(f.saldoTotal || 0), 0);
  const gestionesMes = equipoMes.reduce((acc, f) => acc + (f.gestiones || 0), 0);
  const promesasMes = equipoMes.reduce((acc, f) => acc + (f.promesas || 0), 0);

  const montoPrometidoMes = useMemo(
    () => promesas.filter(g => estaEnEsteMes(g.fechaRegistro)).reduce((acc, g) => acc + Number(g.montoPromesa || 0), 0),
    [promesas]
  );
  const promesasPendientes = useMemo(
    () => promesas
      .filter(g => g.fechaPromesa && new Date(g.fechaPromesa + 'T00:00:00') >= new Date())
      .sort((a, b) => new Date(a.fechaPromesa) - new Date(b.fechaPromesa)),
    [promesas]
  );
  const promesasVencidas = useMemo(
    () => promesas
      .filter(g => g.fechaPromesa && new Date(g.fechaPromesa + 'T00:00:00') < new Date())
      .sort((a, b) => new Date(a.fechaPromesa) - new Date(b.fechaPromesa)),
    [promesas]
  );
  const montoPrometidoVencido = promesasVencidas.reduce((acc, g) => acc + Number(g.montoPromesa || 0), 0);

  const hoy = new Date();
  const nombreMes = MES[hoy.getMonth()];

  if (cargando && !error) {
    return <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in text-center py-10 text-slate-500 font-medium animate-pulse">Calculando la meta del equipo...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-1">Meta del Equipo · {nombreMes}</h2>
          <p className="text-sm text-slate-500">Tu meta como supervisor es el valor total de la cartera de tus {cuentas} contratos repartidos entre {equipoTodo.length} gestores.</p>
        </div>
        <button onClick={() => { setCargando(true); setRefresco(r => r + 1); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
          🔄 Refrescar
        </button>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded text-red-800 font-semibold">{error}</div>}

      {/* META DEL EQUIPO */}
      <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 p-6 mb-6 text-white">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🎯 Meta del Equipo (valor total de la cartera)</span>
        <p className="text-4xl md:text-5xl font-black text-emerald-400 mt-2">{formatearDinero(metaEquipo)}</p>
        <p className="text-xs text-slate-400 mt-2">{cuentas} contratos TDC morosos asignados a tus gestores</p>
      </div>

      {/* KPIs DEL MES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gestiones del Mes</span>
          <span className="text-4xl font-black text-slate-800">{gestionesMes}</span>
          <span className="text-xs text-slate-500 ml-1">del equipo</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Promesas del Mes</span>
          <span className="text-4xl font-black text-indigo-700">{promesasMes}</span>
          <span className="text-xs text-slate-500 ml-1">registradas</span>
        </div>
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <span className="block text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Prometido en el Mes</span>
          <span className="text-3xl font-black text-green-700">{formatearDinero(montoPrometidoMes)}</span>
          <span className="text-xs text-slate-500 ml-1">del equipo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">💵 Promesas Pendientes ({promesasPendientes.length})</h3>
          {promesasPendientes.length === 0 ? (
            <p className="text-sm text-slate-400 italic">El equipo no tiene promesas con fecha futura.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {promesasPendientes.map(g => (
                <li key={g.idGestion} className="flex justify-between items-center bg-green-50 border border-green-100 rounded-lg p-3">
                  <div>
                    <div className="font-mono text-xs font-black text-slate-700">{g.deuda?.numeroCuenta}</div>
                    <div className="text-[11px] text-slate-500">{g.deuda?.deudor?.nombreCompleto}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-green-700">{formatearDinero(g.montoPromesa)}</div>
                    <div className="text-[11px] font-bold text-slate-500">🗓️ {g.fechaPromesa}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-sm p-5 text-white">
          <span className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Promesas Vencidas</span>
          <span className="text-4xl font-black text-orange-400">{promesasVencidas.length}</span>
          <span className="text-xs text-slate-300 ml-1">= {formatearDinero(montoPrometidoVencido)}</span>
          <p className="text-[11px] text-slate-400 mt-2">Promesas del equipo con fecha ya pasada. Coordina con tus gestores su seguimiento.</p>
          {promesasVencidas.length > 0 && (
            <ul className="mt-3 space-y-2 max-h-44 overflow-y-auto">
              {promesasVencidas.map(g => (
                <li key={g.idGestion}>
                  <button tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') abrirDetalle(g); }} onClick={() => abrirDetalle(g)} className="w-full text-left bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-sm transition-colors" title="Clic para ver el detalle (Ctrl+F2)">
                    <span className="font-mono font-bold">{g.deuda?.numeroCuenta}</span> — <span className="text-green-400 font-black">{formatearDinero(g.montoPromesa)}</span> · {g.fechaPromesa}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DetalleVista item={detalle} tipo="gestion" onCerrar={() => setDetalle(null)} />
    </div>
  );
}