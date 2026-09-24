import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import DetalleVista from './DetalleVista';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const colorEstado = (estado) => {
  if (estado === 'APLICADA') return 'bg-green-100 text-green-800';
  if (estado === 'APROBADA') return 'bg-blue-100 text-blue-800';
  if (estado === 'RECHAZADA') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

export default function PromesasSupervisor({ supervisorId, empresaId }) {
  const [promesas, setPromesas] = useState([]);
  const [tiposPromesa, setTiposPromesa] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [termino, setTermino] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipoPromesaId: '', montoPromesa: '', fechaPromesa: '' });
  const [guardando, setGuardando] = useState(false);
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
    Promise.all([
      axios.get('http://localhost:8080/api/supervision/promesas', { params: { supervisorId } }),
      axios.get('http://localhost:8080/api/tipos-promesa', { params: { empresaId } })
    ])
      .then(([a, b]) => {
        if (activo) {
          setPromesas(a.data);
          setTiposPromesa(b.data);
        }
      })
      .catch(() => { if (activo) setError('No se pudieron cargar las promesas del equipo.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [supervisorId, empresaId, refresco]);

  const filtradas = useMemo(() => {
    const t = termino.trim().toLowerCase();
    if (!t) return promesas;
    return promesas.filter((p) =>
      (p.deuda?.deudor?.nombreCompleto || '').toLowerCase().includes(t) ||
      (p.deuda?.numeroCuenta || '').toLowerCase().includes(t)
    );
  }, [promesas, termino]);

  const grupos = useMemo(() => {
    const map = new Map();
    filtradas.forEach((p) => {
      const deudor = p.deuda?.deudor || {};
      const key = deudor.idDeudor ?? p.deuda?.numeroCuenta ?? p.idGestion;
      if (!map.has(key)) {
        map.set(key, { deudor, cuentas: new Set(), promesas: [] });
      }
      const g = map.get(key);
      g.cuentas.add(p.deuda?.numeroCuenta);
      g.promesas.push(p);
    });
    return [...map.values()].sort((a, b) => b.promesas.length - a.promesas.length);
  }, [filtradas]);

  const abrirDetalle = (gestion) => {
    ultimaGestion.current = gestion;
    setDetalle(gestion);
  };

  const abrirEditar = (gestion) => {
    setEditando(gestion);
    setForm({
      tipoPromesaId: gestion.tipoPromesa?.idTipoPromesa || '',
      montoPromesa: gestion.montoPromesa ?? '',
      fechaPromesa: gestion.fechaPromesa || ''
    });
  };

  const guardarPromesa = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      const body = {};
      if (form.tipoPromesaId) body.tipoPromesaId = Number(form.tipoPromesaId);
      if (form.montoPromesa !== '' && form.montoPromesa != null) body.montoPromesa = Number(form.montoPromesa);
      if (form.fechaPromesa) body.fechaPromesa = form.fechaPromesa;
      await axios.put(`http://localhost:8080/api/gestiones/${editando.idGestion}/promesa`, body);
      setMensaje(`✅ Promesa de ${editando.deuda?.numeroCuenta} modificada.`);
      setEditando(null);
      setRefresco(r => r + 1);
    } catch (err) {
      const detalleErr = err.response?.data;
      setMensaje(typeof detalleErr === 'string' ? `⚠️ ${detalleErr}` : '⚠️ No se pudo modificar la promesa.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (gestion, estado) => {
    setMensaje('');
    try {
      await axios.put(`http://localhost:8080/api/gestiones/${gestion.idGestion}/estado-bonificacion`, { estado });
      setMensaje(estado === 'APROBADA'
        ? `✅ Promesa de ${gestion.deuda?.numeroCuenta} aprobada.`
        : `🗑️ Promesa de ${gestion.deuda?.numeroCuenta} dada de baja.`);
      setRefresco(r => r + 1);
    } catch (err) {
      const detalleErr = err.response?.data;
      setMensaje(typeof detalleErr === 'string' ? `⚠️ ${detalleErr}` : '⚠️ No se pudo actualizar el estado de la promesa.');
    }
  };

  const pendientes = promesas.filter(p => (p.estadoBonificacion || 'PENDIENTE') === 'PENDIENTE').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Promesas del Equipo</h2>
          <p className="text-sm text-slate-500 mt-1">Busca por cliente, revisa su promesa y apróbalas, modifícalas o dálas de baja.</p>
        </div>
        <button onClick={() => { setCargando(true); setRefresco(r => r + 1); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
          🔄 Refrescar
        </button>
      </div>

      {mensaje && <div className="bg-slate-50 border border-slate-300 p-3 mb-4 rounded text-slate-700 font-semibold text-sm">{mensaje}</div>}
      {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded text-red-800 font-semibold">{error}</div>}

      <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
        <div className="bg-violet-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-violet-700">{promesas.length}</p>
          <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wide">Promesas</p>
        </div>
        <div className="bg-blue-600/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-blue-700">{promesas.filter(p => p.estadoBonificacion === 'APROBADA').length}</p>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Aprobadas</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-amber-700">{pendientes}</p>
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Por autorizar</p>
        </div>
      </div>

      <div className="mb-4 max-w-xl">
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          placeholder="🔍 Buscar cliente por nombre o número de cuenta..."
          className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        {termino && (
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            {grupos.length} cliente(s) con {filtradas.length} promesa(s) que coinciden.
          </p>
        )}
      </div>

      {cargando ? (
        <div className="text-center py-10 text-slate-500 font-medium animate-pulse">Cargando promesas...</div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-lg border border-slate-100">
          {termino ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay promesas registradas por tus gestores.'}
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-black text-slate-800">{g.deudor.nombreCompleto || 'Cliente sin nombre'}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{[...g.cuentas].join(' · ')}</div>
                </div>
                <span className="text-xs font-black bg-violet-100 text-violet-700 rounded-full px-2 py-1 shrink-0">{g.promesas.length} promesa(s)</span>
              </div>
              <div className="divide-y divide-slate-100">
                {g.promesas.map((p) => (
                  <div key={p.idGestion} className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-[140px]">
                      <button tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') abrirDetalle(p); }} onClick={() => abrirDetalle(p)} title="Clic para ver detalle (Ctrl+F2)" className="text-left">
                        <div className="font-mono text-xs font-black text-slate-700 hover:text-blue-600">{p.deuda?.numeroCuenta}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.empleado?.nombreCompleto} · {new Date(p.fechaRegistro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </div>
                      </button>
                    </div>
                    <div className="min-w-[110px] text-xs text-slate-500">{p.tipoPromesa?.nombre || '—'}</div>
                    <div className="min-w-[110px] font-black text-violet-700">{p.montoPromesa != null ? formatearDinero(p.montoPromesa) : '—'}</div>
                    <div className="min-w-[120px] text-xs font-bold text-slate-600">🗓️ {p.fechaPromesa || '—'}</div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full uppercase ${colorEstado(p.estadoBonificacion)}`}>
                      {p.estadoBonificacion || 'Sin estado'}
                    </span>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <button onClick={() => abrirEditar(p)} className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors" title="Modificar la promesa">✏️ Modificar</button>
                      {(!p.estadoBonificacion || p.estadoBonificacion === 'PENDIENTE') && (
                        <button onClick={() => cambiarEstado(p, 'APROBADA')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors">✔ Aprobar</button>
                      )}
                      {p.estadoBonificacion !== 'RECHAZADA' && p.estadoBonificacion !== 'APLICADA' && (
                        <button onClick={() => cambiarEstado(p, 'RECHAZADA')} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-colors">🗑 Dar de baja</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">✏️ Modificar Promesa</h3>
                <p className="text-xs text-slate-300 mt-0.5">{editando.deuda?.numeroCuenta} — {editando.deuda?.deudor?.nombreCompleto}</p>
              </div>
              <button onClick={() => setEditando(null)} className="text-2xl leading-none text-slate-300 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={guardarPromesa} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Tipo de promesa</label>
                <select value={form.tipoPromesaId} onChange={(e) => setForm({ ...form, tipoPromesaId: e.target.value })} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">Selecciona un tipo...</option>
                  {tiposPromesa.map((tp) => (
                    <option key={tp.idTipoPromesa} value={tp.idTipoPromesa}>{tp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Monto prometido ($)</label>
                <input type="number" step="0.01" min="0" value={form.montoPromesa} onChange={(e) => setForm({ ...form, montoPromesa: e.target.value })} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Fecha prometida de pago</label>
                <input type="date" value={form.fechaPromesa} onChange={(e) => setForm({ ...form, fechaPromesa: e.target.value })} required className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-lg transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2.5 px-5 rounded-lg transition-colors text-sm">
                  {guardando ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetalleVista item={detalle} tipo="gestion" onCerrar={() => setDetalle(null)} />
    </div>
  );
}