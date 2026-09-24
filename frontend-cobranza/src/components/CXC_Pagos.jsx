import { useState, useMemo } from 'react';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const hoyISO = () => aISO(new Date());

const sumarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return aISO(d);
};

export default function CXC_Pagos({ deuda, pagos, deudasDelDeudor, onCambiarDeuda }) {
  const [fechaCorte, setFechaCorte] = useState(hoyISO);

  const esBanco = deuda.deudor?.campana?.empresa?.tipo === 'BANCO';

  const pagosDelProducto = useMemo(
    () => pagos
      .filter(p => p.deuda?.idDeuda === deuda.idDeuda)
      .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro)),
    [pagos, deuda.idDeuda]
  );

  const saldoBase = Number(deuda.saldoPendiente || 0);
  const tasaAnual = Number(deuda.tipoProducto?.tasaInteres || 0);
  const tasaMoratoria = tasaAnual / 100;

  const calcularMoratorios = () => {
    if (!deuda.fechaVencimiento) {
      return { diasMora: 0, interes: 0 };
    }
    const vencimiento = new Date(deuda.fechaVencimiento + 'T00:00:00');
    const corte = new Date(fechaCorte + 'T00:00:00');
    const diasMora = Math.max(0, Math.floor((corte - vencimiento) / (1000 * 60 * 60 * 24)));
    const interes = saldoBase * tasaMoratoria * (diasMora / 365);
    return { diasMora, interes };
  };

  const { diasMora, interes } = calcularMoratorios();
  const totalAPagar = saldoBase + interes;

  // Desglose bancario (solo para bancos)
  const saldoCapital = saldoBase;
  const pagoMorosidad = interes;
  const pagoMinimo = Math.max(totalAPagar * 0.05, 300);

  const ultimoPago = pagosDelProducto[0];

  const fechasRapidas = [
    { label: '+15 días', dias: 15 },
    { label: '+30 días', dias: 30 },
    { label: '+60 días', dias: 60 },
    { label: '+90 días', dias: 90 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* IZQUIERDA: ÚLTIMOS PAGOS RECIBIDOS */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>💸</span> Últimos Pagos Recibidos
          <span className="text-xs font-bold text-slate-400">({pagosDelProducto.length})</span>
        </h3>

        {deudasDelDeudor.length > 1 && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Producto</label>
            <select
              value={String(deuda.idDeuda)}
              onChange={(e) => onCambiarDeuda(Number(e.target.value))}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {deudasDelDeudor.map(d => (
                <option key={d.idDeuda} value={String(d.idDeuda)}>
                  {d.numeroCuenta} — {d.tipoProducto?.nombreProducto || 'Sin tipo'}
                </option>
              ))}
            </select>
          </div>
        )}

        {pagosDelProducto.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            <div className="text-4xl mb-2">🫥</div>
            <p className="text-sm font-semibold">No se han registrado pagos sobre este producto.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {pagosDelProducto.map(p => (
                <li key={p.idPago} className="flex justify-between items-center px-5 py-4 hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-green-700 text-lg">{formatearDinero(p.monto)}</div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(p.fechaRegistro).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} · {new Date(p.fechaRegistro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 uppercase">
                    {p.metodoPago || 'Sin método'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="bg-green-50 px-5 py-3 border-t border-green-100 flex justify-between items-center">
              <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Total abonado</span>
              <span className="text-lg font-black text-green-700">{formatearDinero(pagosDelProducto.reduce((a, p) => a + Number(p.monto || 0), 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* DERECHA: CANTIDAD QUE LE FALTA PAGAR (CXC + proyección de intereses moratorios) */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>🧾</span> Cantidad que le Falta Pagar
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Saldo del producto</span>
            <span className="text-2xl font-black text-slate-800">{formatearDinero(saldoBase)}</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Fecha de corte (hoy o futura para proyectar)
            </label>
            <input
              type="date"
              value={fechaCorte}
              min={deuda.fechaVencimiento || undefined}
              max={sumarDias(365)}
              onChange={(e) => setFechaCorte(e.target.value || hoyISO())}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {fechasRapidas.map(f => (
                <button
                  key={f.dias}
                  type="button"
                  onClick={() => setFechaCorte(sumarDias(f.dias))}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFechaCorte(hoyISO())}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Hoy
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Puedes elegir una fecha futura para predecir cuánto deberá pagar el cliente y cuánto interés se le sumará.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border border-slate-200 rounded-lg p-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Interés moratorio (anual)</span>
              <span className="font-black text-red-600">{tasaAnual.toFixed(2)}%</span>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Días de mora</span>
              <span className="font-black text-slate-800">{diasMora} día{diasMora === 1 ? '' : 's'}</span>
              <span className="block text-[10px] text-slate-400">desde {deuda.fechaVencimiento || '—'}</span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-red-700 font-semibold">Interés moratorio acumulado</span>
              <span className="text-red-700 font-bold">{formatearDinero(interes)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-red-100">
              <span className="font-bold text-red-800 uppercase tracking-wider text-sm">Total a pagar</span>
              <span className="text-3xl font-black text-red-700">{formatearDinero(totalAPagar)}</span>
            </div>
            <p className="text-[10px] text-red-500 mt-1">Calculado al {fechaCorte}. Si cambia el saldo, el monto se ajusta según el interés moratorio.</p>
          </div>

          {/* DESGLOSE BANCARIO */}
          {esBanco && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">🏦 Desglose Bancario (tarjeta)</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Pago Total</span>
                  <span className="text-lg font-black text-red-700">{formatearDinero(totalAPagar)}</span>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Saldo Capital</span>
                  <span className="text-lg font-black text-slate-800">{formatearDinero(saldoCapital)}</span>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Pago Mínimo (5%)</span>
                  <span className="text-lg font-black text-blue-700">{formatearDinero(pagoMinimo)}</span>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Pago de Morosidad</span>
                  <span className="text-lg font-black text-orange-600">{formatearDinero(pagoMorosidad)}</span>
                </div>
              </div>
              <p className="text-[10px] text-blue-500 mt-2">Pago mínimo sugerido si el cliente no quiere seguir acumulando mora (5% del total a pagar).</p>
            </div>
          )}

          {ultimoPago && (
            <p className="text-[11px] text-slate-500 text-center">
              Último abono: <span className="font-bold text-green-700">{formatearDinero(ultimoPago.monto)}</span> el {new Date(ultimoPago.fechaRegistro).toLocaleDateString('es-MX')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}