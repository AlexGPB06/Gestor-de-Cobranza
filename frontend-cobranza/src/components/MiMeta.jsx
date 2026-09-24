import { useState, useMemo, useEffect, useRef } from 'react';
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

export default function MiMeta({ empleadoActual, gestiones }) {
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

  const abrirDetalle = (g) => {
    ultimaGestion.current = g;
    setDetalle(g);
  };

  const storageKey = `meta_gestor_${empleadoActual.idEmpleado}`;
  const leerMetaGuardada = () => {
    try {
      const guardada = JSON.parse(localStorage.getItem(storageKey));
      if (guardada && guardada.monto != null && guardada.gestiones != null) {
        return guardada;
      }
    } catch { /* sin meta guardada */ }
    return { monto: 100000, gestiones: 100 };
  };
  const [meta, setMeta] = useState(leerMetaGuardada);
  const [formMonto, setFormMonto] = useState('');
  const [formGestiones, setFormGestiones] = useState('');

  const hoy = new Date();
  const nombreMes = MES[hoy.getMonth()];

  const misGestiones = useMemo(
    () => gestiones.filter(g => g.empleado?.idEmpleado === empleadoActual.idEmpleado),
    [gestiones, empleadoActual.idEmpleado]
  );

  const gestionesDelMes = misGestiones.filter(g => estaEnEsteMes(g.fechaRegistro));
  const promesas = misGestiones.filter(g => g.montoPromesa != null);
  const promesasDelMes = promesas.filter(g => estaEnEsteMes(g.fechaRegistro));
  const montoPrometidoMes = promesasDelMes.reduce((acc, g) => acc + Number(g.montoPromesa || 0), 0);

  const promesasPendientes = promesas
    .filter(g => g.fechaPromesa && new Date(g.fechaPromesa + 'T00:00:00') >= new Date())
    .sort((a, b) => new Date(a.fechaPromesa) - new Date(b.fechaPromesa));
  const promesasVencidas = promesas
    .filter(g => g.fechaPromesa && new Date(g.fechaPromesa + 'T00:00:00') < new Date())
    .sort((a, b) => new Date(a.fechaPromesa) - new Date(b.fechaPromesa));
  const montoPrometidoVencido = promesasVencidas.reduce((acc, g) => acc + Number(g.montoPromesa || 0), 0);

  const pctMonto = meta.monto > 0 ? Math.min((montoPrometidoMes / meta.monto) * 100, 100) : 0;
  const pctGestiones = meta.gestiones > 0 ? Math.min((gestionesDelMes.length / meta.gestiones) * 100, 100) : 0;

  const guardarMeta = (e) => {
    e.preventDefault();
    const nueva = {
      monto: parseFloat(formMonto) || meta.monto,
      gestiones: parseInt(formGestiones, 10) || meta.gestiones
    };
    setMeta(nueva);
    localStorage.setItem(storageKey, JSON.stringify(nueva));
    setFormMonto('');
    setFormGestiones('');
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-1">Mi Meta · {nombreMes}</h2>
      <p className="text-sm text-slate-500 mb-6">Tu desempeño de cobranza del mes. Define tus metas y monitorea tu avance.</p>

      {/* DEFINICIÓN DE META */}
      <form onSubmit={guardarMeta} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta de Monto alcanzado ($)</label>
          <input
            type="number" step="0.01" min="0"
            value={formMonto}
            placeholder={String(meta.monto)}
            onChange={(e) => setFormMonto(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Meta de Gestiones (#)</label>
          <input
            type="number" min="0"
            value={formGestiones}
            placeholder={String(meta.gestiones)}
            onChange={(e) => setFormGestiones(e.target.value)}
            className="w-full p-2.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors">
          Guardar Meta
        </button>
      </form>

      {/* KPIs DE DESEMPEÑO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gestiones del Mes</span>
          <span className="text-4xl font-black text-slate-800">{gestionesDelMes.length}</span>
          <span className="text-xs text-slate-500 ml-1">/ {meta.gestiones} meta</span>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pctGestiones}%` }}></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <span className="block text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Prometido en el Mes</span>
          <span className="text-3xl font-black text-green-700">{formatearDinero(montoPrometidoMes)}</span>
          <span className="text-xs text-slate-500 ml-1">/ {formatearDinero(meta.monto)} meta</span>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5">
            <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pctMonto}%` }}></div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-sm p-5 text-white">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Promesas Vencidas</span>
          <span className="text-4xl font-black text-orange-400">{promesasVencidas.length}</span>
          <span className="text-xs text-slate-300 ml-1">= {formatearDinero(montoPrometidoVencido)}</span>
          <p className="text-[11px] text-slate-400 mt-2">Promesas con fecha ya pasada. Prioriza contactar y verificar su cumplimiento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PROMESAS PENDIENTES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">💵 Promesas Pendientes ({promesasPendientes.length})</h3>
          {promesasPendientes.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No tienes promesas con fecha futura.</p>
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

        {/* ÚLTIMAS GESTIONES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">🕘 Últimas Gestiones</h3>
          {misGestiones.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aún no registras gestiones.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {[...misGestiones]
                .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
                .slice(0, 15)
                .map(g => (
<li key={g.idGestion} className="bg-slate-50 border border-slate-100 rounded-lg p-3 cursor-pointer hover:border-blue-300 group">
                      <div className="flex justify-between">
                        <span className="text-[11px] font-black text-slate-700 uppercase">{g.concepto?.nombreConcepto || g.codigoResultado || 'Gestión'}</span>
                        <span className="text-[10px] text-slate-400">{new Date(g.fechaRegistro).toLocaleDateString('es-MX')}</span>
                      </div>
                      <p
                        className="text-[15px] leading-relaxed text-slate-600 italic mt-1 line-clamp-3 whitespace-pre-wrap"
                        onClick={() => abrirDetalle(g)}
                        tabIndex={0}
                        role="button"
                        title="Clic para ver el comentario completo (Ctrl+F2)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            abrirDetalle(g);
                          }
                        }}
                      >
                        "{g.comentarios}"
                        <span className="block text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">👁 Ver completo (Ctrl+F2)</span>
                      </p>
                      {g.montoPromesa != null && (
                        <span className="text-[11px] font-bold text-green-700">💵 {formatearDinero(g.montoPromesa)} → {g.fechaPromesa}</span>
                      )}
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