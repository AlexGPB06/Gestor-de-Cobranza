import { useState } from 'react';
import axios from 'axios';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const esPromesaDe = (gestion) => {
  const cat = (gestion.concepto?.categoria || '').toLowerCase();
  const nom = (gestion.concepto?.nombreConcepto || gestion.codigoResultado || '').toLowerCase();
  return cat.includes('promesa') || nom.includes('promesa');
};

const esPromoConvenio = (gestion) => /promoci|conveni/i.test(gestion?.tipoPromesa?.nombre || '');

const colorEstado = (estado) => {
  if (estado === 'APLICADA') return 'bg-green-100 text-green-800';
  if (estado === 'APROBADA') return 'bg-blue-100 text-blue-800';
  if (estado === 'RECHAZADA') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

export default function PromesasTab({ deudor, deudas, gestiones, onDatosActualizados, onSubirTicket118 }) {
  const [editandoId, setEditandoId] = useState(null);
  const [montoEdicion, setMontoEdicion] = useState('');

  const idsDeuda = deudas.filter(d => d.deudor?.idDeudor === deudor.idDeudor || d.idDeudor === deudor.idDeudor).map(d => d.idDeuda);

  const promesas = gestiones
    .filter(g => g.deuda && idsDeuda.includes(g.deuda.idDeuda) && esPromesaDe(g))
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  const guardarMonto = (idGestion) => {
    axios.put(`http://localhost:8080/api/gestiones/${idGestion}/monto-pagado`, { montoPagado: parseFloat(montoEdicion) || 0 })
      .then(() => {
        setEditandoId(null);
        setMontoEdicion('');
        if (onDatosActualizados) onDatosActualizados();
      })
      .catch(err => {
        const msg = err.response?.data;
        alert(typeof msg === 'string' ? msg : 'Error al guardar el monto pagado.');
      });
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">📅 Promesas de Pago</h2>
          <p className="text-sm text-slate-500">Historial de todas las promesas de pago del cliente ({promesas.length}). Las de tipo Promoción/Convenio quedan PENDIENTE hasta que Auditoría las aplique.</p>
        </div>
      </div>

      {promesas.length === 0 && (
        <p className="text-sm text-slate-400 italic bg-white rounded-xl border border-slate-200 p-6">Este cliente aún no tiene promesas de pago registradas.</p>
      )}

      {promesas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-left text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Cuenta</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Fecha de la Promesa</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Cantidad Pagada</th>
                <th className="px-4 py-3">Tipo de Promesa</th>
                <th className="px-4 py-3">Escalar a Auditoría</th>
              </tr>
            </thead>
            <tbody>
              {promesas.map(p => {
                const promo = esPromoConvenio(p);
                const pagado = Number(p.montoPagado) > 0;
                return (
                  <tr key={p.idGestion} className={`border-t border-slate-100 hover:bg-slate-50 ${promo ? 'bg-purple-50/40' : ''}`}>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{p.deuda?.numeroCuenta}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(p.fechaRegistro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">👤 {p.empleado?.nombreCompleto || `ID ${p.empleado?.idEmpleado}`}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{p.fechaPromesa}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{formatearDinero(p.montoPromesa)}</td>
                    <td className="px-4 py-3">
                      {editandoId === p.idGestion ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" step="0.01" min="0" value={montoEdicion}
                            onChange={(e) => setMontoEdicion(e.target.value)}
                            autoFocus
                            className="w-28 p-1 text-sm border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button onClick={() => guardarMonto(p.idGestion)} className="text-xs font-bold bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">OK</button>
                          <button onClick={() => setEditandoId(null)} className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditandoId(p.idGestion); setMontoEdicion(p.montoPagado || ''); }}
                          className={`font-bold px-2 py-1 rounded ${pagado ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}
                          title="Clic para editar la cantidad pagada"
                        >
                          {formatearDinero(p.montoPagado)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-block text-[11px] font-black px-2 py-1 rounded-full uppercase ${promo ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {p.tipoPromesa?.nombre || p.concepto?.nombreConcepto || 'Sin tipo'}
                        </span>
                        {promo && (
                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${colorEstado(p.estadoBonificacion)}`}>
                            {p.estadoBonificacion === 'APLICADA' ? '✅ Bonificación aplicada' : (p.estadoBonificacion || 'PENDIENTE')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {promo ? (
                        pagado ? (
                          <button
                            onClick={() => onSubirTicket118 && onSubirTicket118(p)}
                            className="text-[11px] font-black bg-purple-600 text-white px-2.5 py-1.5 rounded hover:bg-purple-700"
                          >
                            📬 Subir ticket 118
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500" title="Al registrar la cantidad pagada podrás escalar a Auditoría">
                            ⏳ Al recibir el pago, sube el ticket 118
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold rounded-lg p-3">
        🎁 <b>Promoción/Convenio:</b> al registrar el pago de este tipo de promesa, escalalo a Auditoría subiendo el
        ticket <b>118 (Aprobación de Promoción)</b> desde la pestaña Tickets. El estado avanza a APROBADA y APLICADA en
        Bonificaciones cuando el área correspondiente lo procesa.
      </div>

      <p className="text-[11px] text-slate-400">💡 Haz clic sobre la cantidad pagada para actualizarla cuando el cliente abone contra su promesa.</p>
    </div>
  );
}