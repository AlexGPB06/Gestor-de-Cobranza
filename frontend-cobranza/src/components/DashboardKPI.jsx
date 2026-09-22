export default function DashboardKPI({ deudas, gestiones }) {
  // Calculamos el total de la deuda exigible
  const saldoTotalCartera = deudas.reduce((suma, deuda) => suma + (deuda.saldoPendiente || 0), 0);

  // Calculamos el dinero total asegurado en promesas
  const totalPromesas = gestiones.reduce((suma, gestion) => suma + (gestion.montoPromesa || 0), 0);

  // Calculamos el porcentaje de avance
  const porcentajeRecuperacion = saldoTotalCartera > 0 
    ? ((totalPromesas / saldoTotalCartera) * 100).toFixed(1) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* KPI 1: Saldo Total */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Total Exigible</span>
        <span className="text-2xl font-black text-slate-800">
          ${saldoTotalCartera.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* KPI 2: Promesas de Pago */}
      <div className="bg-white p-5 rounded-xl border border-green-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -z-10"></div>
        <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total en Promesas</span>
        <span className="text-2xl font-black text-green-700">
          ${totalPromesas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* KPI 3: Avance de Recuperación */}
      <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10"></div>
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Avance de Campaña</span>
          <span className="text-xl font-black text-blue-700">{porcentajeRecuperacion}%</span>
        </div>
        {/* Barra de progreso */}
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${Math.min(porcentajeRecuperacion, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}