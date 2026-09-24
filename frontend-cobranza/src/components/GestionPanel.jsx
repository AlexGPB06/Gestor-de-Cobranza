import { useEffect, useRef, useState } from 'react';
import GestionForm from './GestionForm';
import DetalleVista from './DetalleVista';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function GestionPanel({ deudor, deudas, deudaSeleccionadaId, onCambiarDeuda, gestiones, conceptos, motivos, empleadoActual, onGestionAgregada, tiposPromesa }) {
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

  const abrirDetalle = (gestion) => {
    ultimaGestion.current = gestion;
    setDetalle(gestion);
  };

  if (!deudor) {
    return (
      <div className="animate-fade-in text-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="text-6xl mb-4">📞</div>
        <h2 className="text-2xl font-extrabold text-slate-700 mb-2">Selecciona un cliente</h2>
        <p className="text-slate-500">Busca el número de cuenta en "Info Esencial del Cliente" o elige un producto de tu cartera.</p>
      </div>
    );
  }

  const deudasDelDeudor = deudas.filter(d => d.deudor?.idDeudor === deudor.idDeudor || d.idDeudor === deudor.idDeudor);
  const idsDeuda = deudasDelDeudor.map(d => d.idDeuda);
  const deudaSeleccionada = deudasDelDeudor.find(d => Number(d.idDeuda) === Number(deudaSeleccionadaId)) || deudasDelDeudor[0];

  // Gestions del cliente: las que pertenecen a cualquiera de sus deudas (más reciente primero)
  const gestionesDelDeudor = gestiones
    .filter(g => g.deuda && idsDeuda.includes(g.deuda.idDeuda))
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  // Gestiones de la cuenta seleccionada (más reciente primero)
  const gestionesDeEstaDeuda = gestiones
    .filter(g => g.deuda && Number(g.deuda.idDeuda) === Number(deudaSeleccionada?.idDeuda))
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  // ¿Hay una promesa vigente en esta deuda? (fecha de promesa >= hoy)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const promesaVigente = gestionesDeEstaDeuda.some(g => {
    const esPromesa =
      (g.concepto?.categoria || '').toLowerCase().includes('promesa') ||
      (g.concepto?.nombreConcepto || '').toLowerCase().includes('promesa');
    return esPromesa && g.fechaPromesa && new Date(g.fechaPromesa + 'T00:00:00') >= hoy;
  });

  const telefonos = deudor.telefonos && deudor.telefonos.length > 0
    ? deudor.telefonos
    : (deudor.telefonoPrincipal ? [{ numeroTelefono: deudor.telefonoPrincipal, tipoTelefono: 'Celular', estatus: 'Sin marcar' }] : []);

  const colorEstatusEstatus = (estatus) => {
    if (estatus === 'Efectivo') return 'bg-green-100 text-green-800';
    if (estatus === 'Equivocado') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-600';
  };

  const colorConcepto = (gestion) => {
    const concepto = gestion.concepto?.nombreConcepto || gestion.codigoResultado || '';
    if (/promesa|pago/i.test(concepto)) return 'bg-green-100 text-green-800';
    if (/negativa/i.test(concepto)) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const renderGestion = (gestion, mostrarCuenta) => (
    <li
      key={gestion.idGestion}
      onClick={() => abrirDetalle(gestion)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          abrirDetalle(gestion);
        }
      }}
      tabIndex={0}
      role="button"
      title="Clic para ver la gestión completa (Ctrl+F2)"
      className="bg-slate-50 p-4 rounded-lg border border-slate-100 cursor-pointer hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all group"
    >
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full uppercase ${colorConcepto(gestion)}`}>
            {gestion.concepto?.nombreConcepto || gestion.codigoResultado || 'Gestión'}
          </span>
          {mostrarCuenta && (
            <span className="text-[11px] font-mono font-bold text-slate-500">{gestion.deuda?.numeroCuenta}</span>
          )}
          {gestion.motivoNoPago && (
            <span className="text-[11px] font-semibold text-slate-500">Motivo: {gestion.motivoNoPago.descripcion}</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400">
            {new Date(gestion.fechaRegistro).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} · {new Date(gestion.fechaRegistro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-[11px] font-bold text-slate-600">👤 {gestion.empleado?.nombreCompleto || `ID ${gestion.empleado?.idEmpleado}`}</p>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-slate-700 italic whitespace-pre-wrap">"{gestion.comentarios}"</p>

      {gestion.montoPromesa != null && (
        <div className="mt-2 inline-block bg-green-100 text-green-800 text-[11px] font-bold px-2 py-1 rounded">
          {gestion.estadoBonificacion
            ? <>🎁 Promoción/Convenio de {formatearDinero(gestion.montoPromesa)}</>
            : <>💵 Promesa de {formatearDinero(gestion.montoPromesa)} para el {gestion.fechaPromesa}</>}
          {gestion.tipoPromesa?.nombre && <> · Tipo: {gestion.tipoPromesa.nombre}</>}
          {gestion.montoPagado > 0 && <> · Pagó: {formatearDinero(gestion.montoPagado)}</>}
          {gestion.numeroMarcado && <> · marcó {gestion.numeroMarcado} ({gestion.tipoTelefonoMarcado})</>}
          {gestion.estadoBonificacion && <> · Estado: {gestion.estadoBonificacion}</>}
        </div>
      )}

      <span className="mt-2 block text-[10px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
        👁 Ver gestion completa (Ctrl+F2)
      </span>
    </li>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-3xl font-extrabold text-slate-800">Gestión del Cliente</h2>

      {/* CABECERA: INFO DE LA GESTIÓN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h3 className="text-2xl font-black text-slate-800">{deudor.nombreCompleto}</h3>
            <p className="text-sm text-slate-500">
              {deudor.documentoIdentidad || 'Sin identificación'} · {deudor.correoElectronico || 'Sin correo'}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Producto en adeudo</span>
            <span className="text-sm font-black text-slate-800">{deudaSeleccionada?.tipoProducto?.nombreProducto || 'Sin tipo'}</span>
            <span className="block text-xs font-mono font-bold text-blue-700">{deudaSeleccionada?.numeroCuenta}</span>
          </div>
        </div>

        {telefonos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {telefonos.map((t, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-mono font-black text-slate-800">{t.numeroTelefono}</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.tipoTelefono}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${colorEstatusEstatus(t.estatus)}`}>{t.estatus}</span>
              </div>
            ))}
          </div>
        )}

        {deudasDelDeudor.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cuenta / Producto a gestionar</label>
              <select
                value={String(deudaSeleccionada?.idDeuda)}
                onChange={(e) => onCambiarDeuda(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {deudasDelDeudor.map(d => (
                  <option key={d.idDeuda} value={String(d.idDeuda)}>
                    {d.numeroCuenta} — {d.tipoProducto?.nombreProducto || 'Sin tipo'} — {formatearDinero(d.saldoPendiente)}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-right sm:pb-1">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Saldo de la cuenta seleccionada</span>
              <span className={`text-2xl font-black ${deudaSeleccionada?.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatearDinero(deudaSeleccionada?.saldoPendiente)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO DE GESTIÓN */}
      {deudaSeleccionada && (
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-3">Captura de la Llamada</h3>
          <GestionForm
            deuda={deudaSeleccionada}
            deudor={deudor}
            conceptos={conceptos}
            motivos={motivos}
            onGestionAgregada={onGestionAgregada}
            diasMaximos={deudor.campana?.diasMaximosPromesa}
            empleadoActual={empleadoActual}
            promesaVigente={promesaVigente}
            tiposPromesa={tiposPromesa}
          />
        </div>
      )}

      {/* HISTORIAL DE GESTIONES (última primero) */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>🕘</span> Historial de Gestiones del Cliente
          <span className="text-xs font-bold text-slate-400">({gestionesDelDeudor.length}) — última gestión primero</span>
        </h3>

        {gestionesDelDeudor.length === 0 && (
          <p className="text-sm text-slate-400 italic bg-white rounded-xl border border-slate-200 p-6">Aún no hay gestiones registradas para este cliente.</p>
        )}

        {/* CUENTA SELECCIONADA */}
        {gestionesDeEstaDeuda.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Cuenta {deudaSeleccionada?.numeroCuenta} ({deudaSeleccionada?.tipoProducto?.nombreProducto || 'Sin tipo'})
              {gestionesDeEstaDeuda.length > 10 && (
                <span className="text-[10px] font-bold text-blue-500 normal-case ml-1">· desliza ⬇ para ver las {gestionesDeEstaDeuda.length}</span>
              )}
            </h4>
            <ul className={`space-y-3 ${gestionesDeEstaDeuda.length > 10 ? 'max-h-[440px] overflow-y-auto overscroll-contain pr-2' : ''}`}>
              {gestionesDeEstaDeuda.map(gestion => renderGestion(gestion, false))}
            </ul>
          </div>
        )}

        {/* OTRAS CUENTAS DEL CLIENTE */}
        {gestionesDeEstaDeuda.length === 0 && gestionesDelDeudor.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Otras cuentas del cliente
              {gestionesDelDeudor.length > 10 && (
                <span className="text-[10px] font-bold text-blue-500 normal-case ml-1">· desliza ⬇ para ver las {gestionesDelDeudor.length}</span>
              )}
            </h4>
            <ul className={`space-y-3 ${gestionesDelDeudor.length > 10 ? 'max-h-[440px] overflow-y-auto overscroll-contain pr-2' : ''}`}>
              {gestionesDelDeudor.map(gestion => renderGestion(gestion, true))}
            </ul>
          </div>
        )}
      </div>

      <DetalleVista item={detalle} tipo="gestion" onCerrar={() => setDetalle(null)} />
    </div>
  );
}