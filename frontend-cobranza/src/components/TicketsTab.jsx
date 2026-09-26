import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import DetalleVista from './DetalleVista';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const rellenarPlantilla = (plantilla, deuda) => {
  return (plantilla || '')
    .replace(/\[CLIENTE\]/g, deuda?.deudor?.nombreCompleto || 'el cliente')
    .replace(/\[CUENTA\]/g, deuda?.numeroCuenta || 'la cuenta')
    .replace(/\[SALDO\]/g, formatearDinero(deuda?.saldoPendiente))
    .replace(/\[MONTO\]/g, formatearDinero(deuda?.saldoPendiente));
};

export default function TicketsTab({ deudor, deudas, tiposTicket, tickets, empleadoActual, deudaSeleccionadaId, onDatosActualizados, prefill }) {
  const [detalle, setDetalle] = useState(null);
  const ultimoTicket = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.ctrlKey && (e.key === 'F2' || e.code === 'F2')) {
        e.preventDefault();
        setDetalle(cur => (cur ? null : ultimoTicket.current));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const abrirDetalle = (ticket) => {
    ultimoTicket.current = ticket;
    setDetalle(ticket);
  };

  const deudasDelDeudor = deudas.filter(d => d.deudor?.idDeudor === deudor.idDeudor || d.idDeudor === deudor.idDeudor);
  const idsDeuda = deudasDelDeudor.map(d => d.idDeuda);

  const [numero, setNumero] = useState(prefill?.numero || '');
  const [texto, setTexto] = useState(() => {
    if (!prefill?.numero) return '';
    const tipo = tiposTicket.find(t => t.numero === prefill.numero.trim());
    if (!tipo) return '';
    const deudaPrefill = prefill.idDeuda
      ? deudasDelDeudor.find(d => Number(d.idDeuda) === Number(prefill.idDeuda))
      : deudasDelDeudor[0];
    return rellenarPlantilla(tipo.plantilla, deudaPrefill);
  });
  const [deudaId, setDeudaId] = useState(String(prefill?.idDeuda || deudaSeleccionadaId || deudasDelDeudor[0]?.idDeuda || ''));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  const deudaSel = deudasDelDeudor.find(d => String(d.idDeuda) === deudaId) || deudasDelDeudor[0];
  const tipoSeleccionado = tiposTicket.find(t => t.numero === numero.trim());

  const handleNumeroChange = (e) => {
    const valor = e.target.value;
    setNumero(valor);
    setErrorMsg('');
    if (valor.trim()) {
      const tipo = tiposTicket.find(t => t.numero === valor.trim());
      if (tipo) {
        setTexto(rellenarPlantilla(tipo.plantilla, deudaSel));
      }
    }
  };

  const listado = tickets
    .filter(t => t.deuda && idsDeuda.includes(t.deuda.idDeuda))
    .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

  const colorEstado = (estado) => {
    if (estado === 'RESUELTO') return 'bg-green-100 text-green-800';
    if (estado === 'EN PROGRESO' || estado === 'EN_PROGRESO') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const submit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExitoMsg('');
    if (!tipoSeleccionado) {
      setErrorMsg(`El número "${numero.trim()}" no corresponde a ningún tipo de ticket de la empresa. Revisa el número con el área.`);
      return;
    }
    if (!texto.trim()) {
      setErrorMsg('Escribe el texto de lo que solicitas (ya viene la plantilla del ticket).');
      return;
    }
    setLoading(true);
    axios.post('/api/tickets', {
      numero: tipoSeleccionado.numero,
      asunto: tipoSeleccionado.nombre,
      idDeuda: deudaId ? Number(deudaId) : null,
      idDepartamento: tipoSeleccionado.departamento.idDepartamento,
      idEmpleadoOrigen: empleadoActual.idEmpleado,
      descripcion: texto.trim()
    })
      .then(() => {
        setNumero('');
        setTexto('');
        setExitoMsg(`Ticket ${tipoSeleccionado.numero} (${tipoSeleccionado.nombre}) enviado a ${tipoSeleccionado.departamento.nombre}.`);
        if (onDatosActualizados) onDatosActualizados();
      })
      .catch(err => {
        const msg = err.response?.data;
        setErrorMsg(typeof msg === 'string' ? msg : 'Error al enviar el ticket.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800">🎫 Tickets a otros Departamentos</h2>
        <p className="text-sm text-slate-500">Solo escribe el número del ticket: se detecta el departamento, el asunto y se llena la plantilla. Agrega lo que quieres solicitar.</p>
      </div>

      {/* FORMULARIO DE TICKET */}
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Enviar Ticket</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Número de ticket *</label>
            <input
              type="text" value={numero} onChange={handleNumeroChange}
              required placeholder="Ej. 253, 110, 301, 450..."
              className="w-full p-2 text-sm border border-slate-300 rounded font-mono tracking-wide"
            />
            <p className="text-[10px] text-slate-500 mt-1">Ejemplos: 253 Liquidación, 110 Desglose de Saldo, 301 Validación de Póliza, 150 Condonación.</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Producto del cliente</label>
            <select value={deudaId} onChange={(e) => setDeudaId(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded bg-white">
              {deudasDelDeudor.map(d => (
                <option key={d.idDeuda} value={String(d.idDeuda)}>
                  {d.numeroCuenta} — {d.tipoProducto?.nombreProducto || 'Sin tipo'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TICKET DETECTADO */}
        <div className={`rounded-lg p-3 text-sm font-bold border ${tipoSeleccionado ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          {tipoSeleccionado
            ? <>📬 Ticket <span className="font-mono">{tipoSeleccionado.numero}</span> → <span className="uppercase">{tipoSeleccionado.nombre}</span> · va para <span className="uppercase">{tipoSeleccionado.departamento.nombre}</span></>
            : 'Escribe el número del ticket para llenar automáticamente el departamento, asunto y plantilla.'}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Texto del ticket (ya trae la plantilla) *</label>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required rows="5"
            placeholder="Escribe aquí el número y después el texto de lo que solicitas; la plantilla se llena automáticamente."
            className="w-full p-2 text-sm border border-slate-300 rounded font-sans" />
        </div>

        {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold p-3 rounded">{errorMsg}</div>}
        {exitoMsg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-bold p-3 rounded">{exitoMsg}</div>}

        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors disabled:bg-blue-300">
          {loading ? 'Enviando...' : 'Enviar Ticket'}
        </button>
      </form>

      {/* LISTADO DE TICKETS */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">
          Tickets del cliente ({listado.length})
          {listado.length > 10 && (
            <span className="text-[10px] font-bold text-blue-500 normal-case ml-1">· desliza ⬇ para ver todos</span>
          )}
        </h3>
        {listado.length === 0 && <p className="text-sm text-slate-400 italic bg-white rounded-xl border border-slate-200 p-6">No hay tickets enviados para este cliente.</p>}
        {listado.length > 0 && (
          <div className={`space-y-3 ${listado.length > 10 ? 'max-h-[440px] overflow-y-auto overscroll-contain pr-2' : ''}`}>
            {listado.map(t => (
              <div
                key={t.idTicket}
                onClick={() => abrirDetalle(t)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    abrirDetalle(t);
                  }
                }}
                tabIndex={0}
                role="button"
                title="Clic para ver el ticket completo (Ctrl+F2)"
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-blue-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all group"
              >
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-blue-700 text-sm">{t.numero}</span>
                    {t.asunto && <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase">{t.asunto}</span>}
                    <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-white uppercase">{t.departamento?.nombre}</span>
                    <span className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-full uppercase ${colorEstado(t.estado)}`}>{t.estado}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">
                      {new Date(t.fechaCreacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} · {new Date(t.fechaCreacion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] font-bold text-slate-600">Enviado por: {t.empleadoOrigen?.nombreCompleto || `ID ${t.empleadoOrigen?.idEmpleado}`}</p>
                  </div>
                </div>
                <p className="text-[15px] leading-relaxed text-slate-700 italic whitespace-pre-wrap">"{t.descripcion}"</p>
                {t.deuda && <p className="text-[11px] font-mono font-bold text-slate-400 mt-1">Cuenta: {t.deuda.numeroCuenta}</p>}
                <span className="mt-1 block text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  👁 Ver ticket completo (Ctrl+F2)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DetalleVista item={detalle} tipo="ticket" onCerrar={() => setDetalle(null)} />
    </div>
  );
}