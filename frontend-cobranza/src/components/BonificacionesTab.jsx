import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import DetalleVista from './DetalleVista';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const esPromocionConvenio = (gestion) => {
  const tipo = (gestion?.tipoPromesa?.nombre || '').toLowerCase();
  if (/promoci|conveni/.test(tipo)) return true;
  const cat = (gestion?.concepto?.categoria || '').toLowerCase();
  const nom = (gestion?.concepto?.nombreConcepto || gestion?.codigoResultado || '').toLowerCase();
  return /promoci|conveni/.test(cat) || /promoci|conveni/.test(nom);
};

const colorEstado = (estado) => {
  if (estado === 'APLICADA') return 'bg-green-100 text-green-800';
  if (estado === 'APROBADA') return 'bg-blue-100 text-blue-800';
  if (estado === 'RECHAZADA') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
};

export default function BonificacionesTab({ deudor, deudas, gestiones, onDatosActualizados }) {
  const [guardandoId, setGuardandoId] = useState(null);
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

  const abrirDetalle = (g) => {
    ultimaGestion.current = g;
    setDetalle(g);
  };

  const deudasDelDeudor = deudas.filter(d => d.deudor?.idDeudor === deudor.idDeudor || d.idDeudor === deudor.idDeudor);
  const idsDeuda = deudasDelDeudor.map(d => d.idDeuda);

  const listado = gestiones
    .filter(g => g.deuda && idsDeuda.includes(g.deuda.idDeuda) && esPromocionConvenio(g))
    .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

  const tipoProducto = deudasDelDeudor[0]?.tipoProducto?.nombreProducto || '';
  const esTDC = /tarjeta|tdc|credito|crédito/i.test(tipoProducto);
  const esAuto = /auto|automovil|vehiculo|carro/i.test(tipoProducto);

  const cambiarEstado = (idGestion, estado) => {
    setGuardandoId(idGestion);
    axios.put(`http://localhost:8080/api/gestiones/${idGestion}/estado-bonificacion`, { estado })
      .then(() => {
        if (onDatosActualizados) onDatosActualizados();
      })
      .catch(err => {
        const msg = err.response?.data;
        alert(typeof msg === 'string' ? msg : 'Error al actualizar el estado.');
      })
      .finally(() => setGuardandoId(null));
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800">🎁 Bonificaciones</h2>
        <p className="text-sm text-slate-500">
          Historial de promociones y convenios del cliente registrados desde 📞 Gestión ({listado.length}).
        </p>
      </div>

      {/* AVISO SEGÚN PRODUCTO */}
      <div className="rounded-lg p-3 text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-800">
        {esTDC
          ? '💳 Tarjeta de crédito: aplican reestructuras o promociones con descuento para ponerse al corriente (solo mora de 1 a 3 meses en TDC).'
          : esAuto
            ? '🚗 Automóvil: aplican convenios o promociones para adelantar mensualidades.'
            : 'Las bonificaciones dependen del producto del cliente (TDC, automóvil, etc.).'}
      </div>

      {/* AVISO DE FLUJO */}
      <div className="rounded-lg p-3 text-xs font-semibold border bg-slate-100 border-slate-200 text-slate-600 flex items-start gap-2">
        <span>📌</span>
        <span>
          Cuando el gestor registra una promesa con tipo <b>Promoción</b> o <b>Convenio</b>, queda en <b>PENDIENTE</b>.
          Al recibir el pago, el gestor sube el ticket <b>118 (Aprobación de Promoción)</b> a Auditoría; cuando el área la
          aprueba y aplica, se marca como <b>APLICADA</b> y se muestra automáticamente aquí como <b>bonificación aplicada</b>.
        </span>
      </div>

      {listado.length === 0 && (
        <p className="text-sm text-slate-400 italic bg-white rounded-xl border border-slate-200 p-6">El cliente no tiene promociones o convenios gestionados.</p>
      )}

      {listado.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-left text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cuenta</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Descripción de cómo se aplicó</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {listado.map(g => (
                <tr key={g.idGestion} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(g.fechaRegistro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{g.deuda?.numeroCuenta}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-[11px] font-black px-2 py-1 rounded-full bg-purple-100 text-purple-800 uppercase">
                      {g.tipoPromesa?.nombre || g.concepto?.nombreConcepto || 'Sin tipo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-green-700">{formatearDinero(g.montoPromesa)}</td>
                  <td className="px-4 py-3">
                    <p
                      className="text-[15px] leading-relaxed text-slate-700 italic cursor-pointer hover:text-blue-700 hover:underline whitespace-pre-wrap"
                      onClick={() => abrirDetalle(g)}
                      tabIndex={0}
                      role="button"
                      title="Clic para ver el comentario completo (Ctrl+F2)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          abrirDetalle(g);
                        }
                      }}
                    >
                      {g.comentarios || '— Sin comentario —'}
                      <span className="block text-[10px] font-bold text-blue-400 mt-0.5">👁 Ver completo (Ctrl+F2)</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">👤 {g.empleado?.nombreCompleto || `ID ${g.empleado?.idEmpleado}`}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={g.estadoBonificacion || 'PENDIENTE'}
                        disabled={guardandoId === g.idGestion}
                        onChange={(e) => cambiarEstado(g.idGestion, e.target.value)}
                        className="text-[11px] font-bold border border-slate-300 rounded p-1 bg-white"
                      >
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="APROBADA">APROBADA</option>
                        <option value="APLICADA">APLICADA</option>
                        <option value="RECHAZADA">RECHAZADA</option>
                      </select>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${colorEstado(g.estadoBonificacion || 'PENDIENTE')}`}>
                        {g.estadoBonificacion === 'APLICADA' ? '✅ Bonificación aplicada' : (g.estadoBonificacion || 'PENDIENTE')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetalleVista item={detalle} tipo="gestion" onCerrar={() => setDetalle(null)} />
    </div>
  );
}