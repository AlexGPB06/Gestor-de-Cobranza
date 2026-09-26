import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import DetalleVista from './DetalleVista';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Badge = ({ children, clase }) => (
  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${clase || 'bg-slate-100 text-slate-600'}`}>
    {children}
  </span>
);

export default function SupervisionPanel({ supervisorId }) {
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState('MES'); // HOY | MES | TODO
  const [gestionesEmpleado, setGestionesEmpleado] = useState(null); // modal de detalle por gestor
  const [detalle, setDetalle] = useState(null);
  const [refresco, setRefresco] = useState(0);
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
    axios.get('/api/supervision/equipo', { params: { supervisorId, periodo } })
      .then(res => { if (activo) setEquipo(res.data); })
      .catch(() => { if (activo) setError('No se pudo consultar el equipo. Verifica la conexión con el servidor.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [supervisorId, periodo, refresco]);

  const PERIODO_LABEL = { HOY: 'Hoy', MES: 'Mes', TODO: 'Total' };

  const abrirGestionesDe = async (empleado) => {
    const res = await axios.get('/api/gestiones', { params: { empleadoId: empleado.idEmpleado } });
    setGestionesEmpleado({ empleado, gestiones: res.data });
  };

  const abrirDetalle = (gestion) => {
    ultimaGestion.current = gestion;
    setDetalle(gestion);
  };

  const totales = equipo.reduce((acc, f) => {
    acc.cuentas += f.cuentasAsignadas || 0;
    acc.saldo += Number(f.saldoTotal || 0);
    acc.gestiones += f.gestiones || 0;
    acc.promesas += f.promesas || 0;
    acc.pendientes += f.promocionesPendientes || 0;
    acc.tickets += f.tickets || 0;
    return acc;
  }, { cuentas: 0, saldo: 0, gestiones: 0, promesas: 0, pendientes: 0, tickets: 0 });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Monitoreo de Mi Equipo</h2>
          <p className="text-sm text-slate-500 mt-1">Indicadores de gestión de cada gestor bajo tu supervisión.</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {['HOY', 'MES', 'TODO'].map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${periodo === p ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
                {PERIODO_LABEL[p]}
              </button>
            ))}
          </div>
          <button onClick={() => { setRefresco(r => r + 1); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
            🔄 Refrescar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-blue-700">{totales.cuentas}</p>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Cuentas</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-lg font-black text-emerald-700">{formatearDinero(totales.saldo)}</p>
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Saldo total</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-indigo-700">{totales.gestiones}</p>
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Gestiones · {PERIODO_LABEL[periodo]}</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-violet-700">{totales.promesas}</p>
          <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wide">Promesas · {PERIODO_LABEL[periodo]}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{totales.pendientes}</p>
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Promos pend.</p>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-rose-700">{totales.tickets}</p>
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">Tickets · {PERIODO_LABEL[periodo]}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded text-red-800 font-semibold">{error}</div>}

      {cargando ? (
        <div className="text-center py-10 text-slate-500 font-medium animate-pulse">Cargando indicadores del equipo...</div>
      ) : equipo.length === 0 ? (
        <div className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-lg border border-slate-100">No tienes gestores asignados.</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Gestor</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Cuentas</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Saldo total</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Mora 1-2 m</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Mora 3-4 m</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Mora 5-6 m</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Gestiones / Promesas · {PERIODO_LABEL[periodo]}</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Tickets</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {equipo.map((fila) => (
                <tr key={fila.empleado.idEmpleado} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{fila.empleado.nombreCompleto}</div>
                    <div className="text-xs text-slate-400 font-mono">{fila.empleado.numeroEmpleado}</div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{fila.cuentasAsignadas ?? 0}</td>
                  <td className="px-4 py-4 font-semibold text-emerald-700">{formatearDinero(fila.saldoTotal)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatearDinero(fila.saldoMora1y2)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatearDinero(fila.saldoMora3y4)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatearDinero(fila.saldoMora5y6)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge clase="bg-indigo-100 text-indigo-700">{fila.gestiones ?? 0} gestiones</Badge>
                      <Badge clase={`${fila.promesas > 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>{fila.promesas ?? 0} promesas</Badge>
                      {fila.promocionesPendientes > 0 && <Badge clase="bg-amber-100 text-amber-700">{fila.promocionesPendientes} pend.</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700 font-semibold">{fila.tickets ?? 0}</td>
                  <td className="px-4 py-4">
                    <button onClick={() => abrirGestionesDe(fila.empleado)} className="text-blue-600 hover:text-blue-800 font-bold text-xs">👁 Ver gestiones</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gestionesEmpleado && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setGestionesEmpleado(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between bg-slate-800 text-white px-6 py-4">
              <div>
                <h3 className="text-lg font-black">Gestiones de {gestionesEmpleado.empleado.nombreCompleto}</h3>
                <p className="text-xs text-slate-300 mt-0.5">Clic en una gestión para ver el detalle completo (Ctrl+F2)</p>
              </div>
              <button onClick={() => setGestionesEmpleado(null)} className="text-2xl leading-none text-slate-300 hover:text-white font-bold">✕</button>
            </div>
            <div className={`flex-1 overflow-y-auto overscroll-contain ${gestionesEmpleado.gestiones.length > 10 ? 'max-h-[480px]' : ''} px-4 py-4`}>
              {gestionesEmpleado.gestiones.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic">Este gestor aún no registra gestiones.</div>
              ) : (
                <ul className="space-y-2">
                  {gestionesEmpleado.gestiones.map((g) => (
                    <li key={g.idGestion}>
                      <button
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') abrirDetalle(g); }}
                        onClick={() => abrirDetalle(g)}
                        className="w-full flex items-center justify-between gap-3 text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl px-4 py-3 transition-colors"
                        title="Clic para ver la gestión completa (Ctrl+F2)"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{g.deuda?.numeroCuenta} — {g.concepto?.nombreConcepto || g.codigoResultado || 'Gestión'}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{g.deuda?.deudor?.nombreCompleto} · {new Date(g.fechaRegistro).toLocaleString('es-MX')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {g.montoPromesa != null && (
                            <span className="text-sm font-black text-violet-700">{formatearDinero(g.montoPromesa)}</span>
                          )}
                          {g.estadoBonificacion ? (
                            <Badge clase={g.estadoBonificacion === 'APLICADA' ? 'bg-green-100 text-green-700' : g.estadoBonificacion === 'APROBADA' ? 'bg-blue-100 text-blue-700' : g.estadoBonificacion === 'RECHAZADA' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{g.estadoBonificacion}</Badge>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                  {gestionesEmpleado.gestiones.length > 10 && (
                    <li className="text-center text-[11px] font-semibold text-slate-400 pt-1">· desliza ⬇</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <DetalleVista item={detalle} tipo="gestion" onCerrar={() => setDetalle(null)} />
    </div>
  );
}