const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const mesesDeMora = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  const venc = new Date(fechaVencimiento + 'T00:00:00');
  if (Number.isNaN(venc.getTime())) return 0;
  const hoy = new Date();
  if (venc > hoy) return 0;
  let meses = (hoy.getFullYear() - venc.getFullYear()) * 12 + (hoy.getMonth() - venc.getMonth());
  if (hoy.getDate() < venc.getDate()) meses = Math.max(0, meses - 1);
  return meses;
};

export default function ClienteInfo({ deudor, deudas }) {
  const deudasDelDeudor = deudas.filter(d => d.deudor?.idDeudor === deudor.idDeudor || d.idDeudor === deudor.idDeudor);
  const telefonos = deudor.telefonos && deudor.telefonos.length > 0
    ? deudor.telefonos
    : (deudor.telefonoPrincipal ? [{ numeroTelefono: deudor.telefonoPrincipal, tipoTelefono: 'Celular', estatus: 'Sin marcar' }] : []);

  const colorEstatus = (estatus) => {
    if (estatus === 'Efectivo') return 'bg-green-100 text-green-800';
    if (estatus === 'Equivocado') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* DATOS ESENCIALES DEL CLIENTE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>👤</span> Datos Esenciales del Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</span>
            <span className="text-xl font-black text-slate-800">{deudor.nombreCompleto}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Identificación</span>
            <span className="text-sm font-bold text-slate-700 font-mono">{deudor.documentoIdentidad || 'N/D'}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</span>
            <span className="text-sm text-slate-700">{deudor.correoElectronico || 'N/D'}</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Campaña</span>
            <span className="text-sm text-slate-700">{deudor.campana?.nombreEmpresa || 'N/D'}</span>
          </div>
        </div>

        {telefonos.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Teléfonos de Contacto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {telefonos.map((t, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono font-black text-slate-800">{t.numeroTelefono}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorEstatus(t.estatus)}`}>{t.estatus}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t.tipoTelefono}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PRODUCTOS / DEUDAS */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>💳</span> Productos con Adeudo
        </h3>
        {deudasDelDeudor.length === 0 ? (
          <p className="text-sm text-slate-400 italic bg-white rounded-xl border border-slate-200 p-6">El cliente no tiene productos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deudasDelDeudor.map(deuda => {
              const moraMeses = mesesDeMora(deuda.fechaVencimiento);
              return (
                <div key={deuda.idDeuda} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm font-black text-slate-800">{deuda.numeroCuenta}</div>
                      <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${deuda.tipoProducto ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        {deuda.tipoProducto?.nombreProducto || 'Sin tipo'}
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded ${deuda.saldoPendiente > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {deuda.saldoPendiente > 0 ? 'EN MORA' : 'LIQUIDADO'}
                    </span>
                  </div>

                  {/* MONTO QUE DEBE + MESES DE MORA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Monto que Debe</span>
                      <span className={`text-xl font-black ${deuda.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatearDinero(deuda.saldoPendiente)}</span>
                    </div>
                    <div className={`rounded-lg p-3 ${moraMeses > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Mes de Mora</span>
                      {moraMeses > 0 ? (
                        <span className="text-xl font-black text-red-600">{moraMeses} mes{moraMeses === 1 ? '' : 'es'}</span>
                      ) : (
                        <span className="text-xl font-black text-green-600">Al corriente</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Monto Original</span>
                      <span className="font-semibold text-slate-700">{formatearDinero(deuda.montoOriginal)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Vencimiento</span>
                      <span className="font-semibold text-slate-700">{deuda.fechaVencimiento}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}