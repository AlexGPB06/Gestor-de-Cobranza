import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const diasMora = (d) => {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
};

const rangoMora = (dias) => {
  if (dias >= 150) return { label: 'Mora 5-6 m', clase: 'bg-rose-100 text-rose-700' };
  if (dias >= 90) return { label: 'Mora 3-4 m', clase: 'bg-amber-100 text-amber-700' };
  if (dias >= 30) return { label: 'Mora 1-2 m', clase: 'bg-emerald-100 text-emerald-700' };
  return { label: 'Al día', clase: 'bg-slate-100 text-slate-500' };
};

export default function AsignacionSupervisor({ supervisorId, empresaId }) {
  const [gestores, setGestores] = useState([]);
  const [gestorSel, setGestorSel] = useState(null);
  const [deudasLibres, setDeudasLibres] = useState([]);
  const [asignadas, setAsignadas] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [termino, setTermino] = useState('');
  const [terminoGestor, setTerminoGestor] = useState('');
  const [filtroMora, setFiltroMora] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [liberando, setLiberando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [refresco, setRefresco] = useState(0);

  const obtenerDatos = async () => {
    const [resEmp, resDeu, resAsig] = await Promise.all([
      axios.get('/api/empleados', { params: { empresaId } }),
      axios.get('/api/deudas', { params: { empresaId } }),
      axios.get('/api/asignaciones-cartera', { params: { empresaId } })
    ]);
    const misGestores = resEmp.data.filter(
      (e) => e.rol?.toUpperCase() === 'GESTOR' && Number(e.supervisor?.idEmpleado) === Number(supervisorId)
    );
    const asignadasIds = new Set(
      resAsig.data.filter((a) => a.estatusActiva).map((a) => Number(a.deuda?.idDeuda))
    );
    const libres = resDeu.data
      .filter((d) => (d.estado || 'PENDIENTE') === 'PENDIENTE' && !asignadasIds.has(Number(d.idDeuda)))
      .sort((a, b) => diasMora(b.fechaVencimiento) - diasMora(a.fechaVencimiento));
    return { misGestores, asignadas: resAsig.data.filter((a) => a.estatusActiva), libres };
  };

  const aplicarDatos = (d) => {
    setGestores(d.misGestores);
    setAsignadas(d.asignadas);
    setDeudasLibres(d.libres);
    // Mantiene al gestor seleccionado si sigue en el equipo; si no, regresa
    // al primero para no dejar la pantalla sin selección.
    setGestorSel(prev => {
      const actual = d.misGestores.find(g => Number(g.idEmpleado) === Number(prev?.idEmpleado));
      return actual || d.misGestores[0] || null;
    });
    setSeleccionadas(new Set());
  };

  useEffect(() => {
    let activo = true;
    obtenerDatos()
      .then(d => { if (activo) aplicarDatos(d); })
      .catch(() => { if (activo) setError('No se pudieron cargar los datos para asignar carteras.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorId, refresco]);

  const deudasFiltradas = useMemo(() => {
    const t = termino.trim().toLowerCase();
    return deudasLibres.filter((d) => {
      if (filtroMora !== 'todas') {
        const dias = diasMora(d.fechaVencimiento);
        const rango = dias >= 150 ? '5-6' : dias >= 90 ? '3-4' : dias >= 30 ? '1-2' : 'aldia';
        if (rango !== filtroMora) return false;
      }
      if (!t) return true;
      return (d.numeroCuenta || '').toLowerCase().includes(t) || (d.deudor?.nombreCompleto || '').toLowerCase().includes(t);
    });
  }, [deudasLibres, termino, filtroMora]);

  const gestoresFiltrados = useMemo(() => {
    const t = terminoGestor.trim().toLowerCase();
    if (!t) return gestores;
    return gestores.filter((g) =>
      (g.nombreCompleto || '').toLowerCase().includes(t) ||
      (g.numeroEmpleado || '').toLowerCase().includes(t) ||
      (g.usuario || '').toLowerCase().includes(t)
    );
  }, [gestores, terminoGestor]);

  const toggle = (id) => {
    setSeleccionadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const seleccionarTodas = (filtrar) => {
    setSeleccionadas(prev => {
      const nuevo = new Set(prev);
      filtrar.forEach(d => nuevo.add(Number(d.idDeuda)));
      return nuevo;
    });
  };

  const asignar = async () => {
    if (!gestorSel || seleccionadas.size === 0) return;
    setAsignando(true);
    setMensaje('');
    try {
      const res = await axios.post('/api/asignaciones-cartera/por-lote', {
        empleadoId: gestorSel.idEmpleado,
        deudaIds: [...seleccionadas]
      });
      setMensaje(`✅ Cartera asignada: ${res.data.asignadas} cuenta(s) a ${gestorSel.nombreCompleto}${res.data.errores?.length ? ` (${res.data.errores.length} con error)` : ''}.`);
      const datos = await obtenerDatos();
      aplicarDatos(datos);
    } catch (err) {
      const detalleErr = err.response?.data;
      setMensaje(typeof detalleErr === 'string' ? `⚠️ ${detalleErr}` : '⚠️ Ocurrió un error al asignar la cartera.');
    } finally {
      setAsignando(false);
    }
  };

  const liberar = async (asignacion) => {
    const cuenta = asignacion.deuda?.numeroCuenta || '';
    const ok = window.confirm(
      `¿Liberar la cuenta ${cuenta} de ${gestorSel?.nombreCompleto}? Volverá a la lista de cuentas sin asignar.`
    );
    if (!ok) return;

    setLiberando(true);
    setMensaje('');
    try {
      await axios.delete(`/api/asignaciones-cartera/${asignacion.idAsignacion}`);
      setMensaje(`✅ Cuenta ${cuenta} liberada. Ya está disponible para reasignar.`);
      const datos = await obtenerDatos();
      aplicarDatos(datos);
    } catch (err) {
      const detalleErr = err.response?.data;
      setMensaje(typeof detalleErr === 'string' ? `⚠️ ${detalleErr}` : '⚠️ No se pudo liberar la cuenta.');
    } finally {
      setLiberando(false);
    }
  };

  const conteoGestor = (g) => asignadas.filter(a => Number(a.empleado?.idEmpleado) === Number(g.idEmpleado)).length;

  const asignadasDelGestor = gestorSel
    ? asignadas.filter(a => Number(a.empleado?.idEmpleado) === Number(gestorSel.idEmpleado))
    : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asignar Carteras</h2>
          <p className="text-sm text-slate-500 mt-1">Asigna un conjunto de contratos adeudados a los gestores de tu equipo.</p>
        </div>
        <button onClick={() => { setCargando(true); setRefresco(r => r + 1); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded transition-colors flex items-center gap-2">
          🔄 Refrescar
        </button>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded text-red-800 font-semibold">{error}</div>}
      {mensaje && <div className="bg-slate-50 border border-slate-300 p-3 mb-4 rounded text-slate-700 font-semibold text-sm">{mensaje}</div>}
      {!cargando && !error && deudasLibres.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-emerald-800 text-sm font-semibold">
          ✅ 0 cuentas por asignar · Toda la cartera del equipo ya está distribuida entre tus {gestores.length} gestores. Si necesitas reasignar, usa el botón <b>Quitar</b> sobre la cuenta asignada al gestor.
        </div>
      )}

      {cargando ? (
        <div className="text-center py-10 text-slate-500 font-medium animate-pulse">Cargando equipo y cartera disponible...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={gestores.length > 8 ? 'md:max-h-[520px] md:overflow-y-auto overscroll-contain' : ''}>
            <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider mb-3">Gestores del equipo</h3>
            <input
              type="text"
              value={terminoGestor}
              onChange={(e) => setTerminoGestor(e.target.value)}
              placeholder="🔍 Buscar gestor (usuario, nombre...)"
              className="w-full mb-2 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="space-y-2">
              {gestoresFiltrados.map((g) => (
                <button
                  key={g.idEmpleado}
                  onClick={() => { setGestorSel(g); setSeleccionadas(new Set()); setMensaje(''); }}
                  className={`w-full flex items-center justify-between text-left bg-slate-50 border rounded-xl px-4 py-3 transition-colors ${gestorSel?.idEmpleado === g.idEmpleado ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{g.nombreCompleto}</div>
                    <div className="text-xs text-slate-400 font-mono">@{g.usuario} · {g.numeroEmpleado}</div>
                  </div>
                  <span className="shrink-0 text-xs font-black bg-blue-100 text-blue-700 rounded-full px-2 py-1">{conteoGestor(g)} cuentas</span>
                </button>
              ))}
              {gestoresFiltrados.length > 8 && <p className="text-center text-[11px] font-semibold text-slate-400 pt-1">· desliza ⬇</p>}
              {gestoresFiltrados.length === 0 && <p className="text-slate-500 italic text-sm">No hay gestores que coincidan con la búsqueda.</p>}
            </div>
          </div>

          <div className="md:col-span-2">
            {gestorSel && asignadasDelGestor.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider mb-3">
                  Cuentas asignadas a {gestorSel.nombreCompleto} ({asignadasDelGestor.length})
                </h3>
                <div className="space-y-2">
                  {asignadasDelGestor.map((a) => (
                    <div key={a.idAsignacion} className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800">{a.deuda?.numeroCuenta} — {a.deuda?.deudor?.nombreCompleto}</div>
                        <div className="text-xs text-slate-500">Contrato TDC moroso · saldo {formatearDinero(a.deuda?.saldoPendiente)}</div>
                      </div>
                      <span className="shrink-0 font-black text-slate-700">{formatearDinero(a.deuda?.saldoPendiente)}</span>
                      <button
                        onClick={() => liberar(a)}
                        disabled={liberando}
                        className="shrink-0 px-3 py-1 text-xs font-bold rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider mr-1">Cuentas sin asignar ({deudasLibres.length})</h3>
              <input
                type="text"
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                placeholder="🔍 Buscar cuenta o cliente"
                className="flex-1 min-w-[180px] p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {[
                { key: 'todas', label: 'Todas' },
                { key: '1-2', label: 'Mora 1-2 m' },
                { key: '3-4', label: 'Mora 3-4 m' },
                { key: '5-6', label: 'Mora 5-6 m' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltroMora(f.key)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filtroMora === f.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f.label}
                </button>
              ))}
              <button onClick={() => seleccionarTodas(deudasFiltradas)} className="ml-auto text-xs font-bold text-blue-600 hover:text-blue-800">
                Seleccionar visibles ({deudasFiltradas.length})
              </button>
            </div>

            {deudasFiltradas.length === 0 ? (
              <div className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-lg border border-slate-100">No hay cuentas libres que coincidan con el filtro.</div>
            ) : (
              <ul className={`space-y-2 ${deudasFiltradas.length > 10 ? 'max-h-[440px] overflow-y-auto overscroll-contain pr-1' : ''}`}>
                {deudasFiltradas.map((d) => {
                  const mora = rangoMora(diasMora(d.fechaVencimiento));
                  const sel = seleccionadas.has(Number(d.idDeuda));
                  return (
                    <li key={d.idDeuda}>
                      <label
                        className={`flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-3 cursor-pointer transition-colors hover:bg-blue-50 ${sel ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-300' : 'border-slate-200'}`}
                      >
                        <input type="checkbox" checked={sel} onChange={() => toggle(Number(d.idDeuda))} className="w-5 h-5 accent-blue-600" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 truncate">{d.numeroCuenta} — {d.deudor?.nombreCompleto}</div>
                          <div className="text-xs text-slate-500">Contrato TDC moroso · saldo {formatearDinero(d.saldoPendiente)}</div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full uppercase ${mora.clase}`}>{mora.label}</span>
                        <span className="shrink-0 font-black text-slate-700">{formatearDinero(d.saldoPendiente)}</span>
                      </label>
                    </li>
                  );
                })}
                {deudasFiltradas.length > 10 && <li className="text-center text-[11px] font-semibold text-slate-400 pt-1">· desliza ⬇</li>}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 mt-6 bg-slate-800 text-white rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="text-sm">
          <span className="font-bold">Gestor:</span> {gestorSel?.nombreCompleto || 'Sin gestor'} ·{' '}
          <span className="font-bold">Seleccionadas:</span> <span className="text-emerald-400 font-black">{seleccionadas.size}</span> cuentas
        </div>
        <button
          onClick={asignar}
          disabled={!gestorSel || seleccionadas.size === 0 || asignando}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg transition-colors"
        >
          {asignando ? 'Asignando...' : `📤 Asignar ${seleccionadas.size} cuenta(s)`}
        </button>
      </div>
    </div>
  );
}