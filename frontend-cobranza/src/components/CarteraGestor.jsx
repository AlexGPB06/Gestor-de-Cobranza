import { useState } from 'react';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CarteraGestor({ asignaciones, onSeleccionar }) {
  const [filtro, setFiltro] = useState('');

  const cuentas = asignaciones
    .filter(a => a.estatusActiva !== false && a.deuda)
    .sort((a, b) => new Date(b.fechaAsignacion) - new Date(a.fechaAsignacion));

  const filtradas = cuentas.filter(a => {
    const texto = (a.deuda.numeroCuenta + ' ' + (a.deuda.deudor?.nombreCompleto || '') + ' ' + (a.deuda.tipoProducto?.nombreProducto || '')).toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  const saldoTotal = filtradas.reduce((acc, a) => acc + Number(a.deuda.saldoPendiente || 0), 0);

  const diasDesde = (fechaAsignacion) => {
    const d = new Date(fechaAsignacion);
    if (Number.isNaN(d.getTime())) return '—';
    const dias = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
    return `${dias} día${dias === 1 ? '' : 's'}`;
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-1">Mi Cartera</h2>
      <p className="text-sm text-slate-500 mb-6">Cuentas asignadas a ti para gestión. Selecciona una para iniciar la llamada.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas Asignadas</span>
          <span className="text-3xl font-black text-slate-800">{cuentas.length}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuentas en Pantalla</span>
          <span className="text-3xl font-black text-slate-800">{filtradas.length}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Total (en pantalla)</span>
          <span className="text-3xl font-black text-red-600">{formatearDinero(saldoTotal)}</span>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-sm p-4 text-white">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estatus</span>
          <span className="text-lg font-black">🎧 Listo para gestionar</span>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="🔍 Filtrar por número de cuenta, cliente o tipo de producto..."
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        />
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400">
          <div className="text-6xl mb-4">🗂️</div>
          <p className="text-lg font-semibold">{asignaciones.length === 0 ? 'Aún no tienes cuentas asignadas.' : 'Ninguna cuenta coincide con el filtro.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map(a => (
            <div key={a.idAsignacion} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3 hover:border-blue-400 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-sm font-black text-slate-800">{a.deuda.numeroCuenta}</div>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {a.deuda.tipoProducto?.nombreProducto || 'Sin tipo'}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`block text-[10px] font-bold text-slate-400 uppercase`}>Saldo</span>
                  <span className={`text-xl font-black ${a.deuda.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatearDinero(a.deuda.saldoPendiente)}</span>
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-800">{a.deuda.deudor?.nombreCompleto || 'Sin cliente'}</div>
                <div className="text-[11px] text-slate-500">
                  {a.deuda.deudor?.documentoIdentidad || 'Sin identificación'} · <span className="font-semibold">Asignada hace {diasDesde(a.fechaAsignacion)}</span>
                </div>
              </div>
              <button
                onClick={() => onSeleccionar(a.deuda.deudor, a.deuda.idDeuda)}
                className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                📞 Gestionar Ahora
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}