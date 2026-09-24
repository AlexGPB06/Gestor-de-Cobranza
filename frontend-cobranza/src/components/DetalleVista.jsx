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

const Fila = ({ etiqueta, valor }) =>
  valor ? (
    <div className="flex justify-between gap-4 py-1 border-b border-slate-100">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">{etiqueta}</span>
      <span className="text-sm font-semibold text-slate-700 text-right">{valor}</span>
    </div>
  ) : null;

export default function DetalleVista({ item, tipo, onCerrar }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onCerrar}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 bg-slate-800 text-white px-6 py-4">
          <div>
            <h3 className="text-lg font-black">
              {tipo === 'ticket' ? `🎫 Ticket #${item.numero} — ${item.asunto || ''}` : (item.concepto?.nombreConcepto || item.codigoResultado || 'Gestión')}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {tipo === 'ticket' ? (
                <>
                  <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-700 uppercase">{item.departamento?.nombre}</span>
                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${colorEstado(item.estado)}`}>{item.estado}</span>
                </>
              ) : (
                <>
                  <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600">{item.deuda?.numeroCuenta}</span>
                  {item.concepto?.nombreConcepto ? (
                    <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 uppercase">{item.concepto.nombreConcepto}</span>
                  ) : null}
                  {item.estadoBonificacion ? (
                    <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${item.estadoBonificacion === 'APLICADA' ? 'bg-green-500' : item.estadoBonificacion === 'APROBADA' ? 'bg-blue-500' : item.estadoBonificacion === 'RECHAZADA' ? 'bg-red-500' : 'bg-amber-500'}`}>
                      {item.estadoBonificacion === 'APLICADA' ? '✅ Bonificación aplicada' : item.estadoBonificacion}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <button onClick={onCerrar} className="shrink-0 text-2xl leading-none text-slate-300 hover:text-white font-bold" title="Cerrar (Ctrl+F2)">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {tipo === 'ticket' ? (
              <>
                <Fila etiqueta="Fecha" valor={new Date(item.fechaCreacion).toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <Fila etiqueta="Enviado por" valor={item.empleadoOrigen?.nombreCompleto || `ID ${item.empleadoOrigen?.idEmpleado}`} />
                <Fila etiqueta="Cuenta" valor={item.deuda?.numeroCuenta} />
              </>
            ) : (
              <>
                <Fila etiqueta="Fecha" valor={new Date(item.fechaRegistro).toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <Fila etiqueta="Empleado" valor={item.empleado?.nombreCompleto || `ID ${item.empleado?.idEmpleado}`} />
                <Fila etiqueta="Cuenta" valor={item.deuda?.numeroCuenta} />
                <Fila etiqueta="Motivo" valor={item.motivoNoPago?.descripcion} />
                <Fila etiqueta="Monto prometido" valor={item.montoPromesa != null ? formatearDinero(item.montoPromesa) : null} />
                <Fila etiqueta="Fecha de la promesa" valor={item.fechaPromesa} />
                <Fila etiqueta="Tipo de promesa" valor={item.tipoPromesa?.nombre} />
                <Fila etiqueta="Cantidad pagada" valor={item.montoPagado > 0 ? formatearDinero(item.montoPagado) : null} />
                <Fila etiqueta="Marcó" valor={item.numeroMarcado ? `${item.numeroMarcado} (${item.tipoTelefonoMarcado || ''})` : null} />
              </>
            )}
          </div>

          <div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Observaciones / Texto completo</h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                {item.comentarios || item.descripcion || '— Sin texto —'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] font-semibold text-slate-400">
          💡 Presiona Ctrl+F2 o clic fuera del recuadro para cerrar
        </div>
      </div>
    </div>
  );
}