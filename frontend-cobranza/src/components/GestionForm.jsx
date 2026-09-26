import { useState } from 'react';
import axios from 'axios';

export default function GestionForm({ deuda, deudor, conceptos, motivos, onGestionAgregada, diasMaximos, empleadoActual, promesaVigente, tiposPromesa }) {
  const [conceptoId, setConceptoId] = useState('');
  const [motivoId, setMotivoId] = useState('');
  const [montoPromesa, setMontoPromesa] = useState('');
  const [fechaPromesa, setFechaPromesa] = useState('');
  const [tipoPromesaId, setTipoPromesaId] = useState('');
  const [montoPagadoPromesa, setMontoPagadoPromesa] = useState('');
  const [telefonoMarcado, setTelefonoMarcado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertaFecha, setAlertaFecha] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const idCampana = deudor.campana?.idCampana;
  const conceptosCampaña = conceptos.filter(c => c.campana?.idCampana === idCampana);
  const motivosCampaña = motivos.filter(m => m.campana?.idCampana === idCampana);
  const tiposPromesaCampaña = tiposPromesa && tiposPromesa.filter(t => t.campana?.idCampana === idCampana);

  const conceptoSeleccionado = conceptos.find(c => Number(c.idConcepto) === Number(conceptoId));
  const esPromesa = /promes/i.test(conceptoSeleccionado?.categoria || '') || /promes/i.test(conceptoSeleccionado?.nombreConcepto || '');
  const esBloquePromesa = esPromesa;

  const tipoPromesaSel = tiposPromesaCampaña?.find(t => Number(t.idTipoPromesa) === Number(tipoPromesaId));
  const esTipoPromocionConvenio = /promoci|conveni/i.test(tipoPromesaSel?.nombre || '');

  const telefonos = deudor.telefonos && deudor.telefonos.length > 0
    ? deudor.telefonos
    : (deudor.telefonoPrincipal ? [{ numeroTelefono: deudor.telefonoPrincipal, tipoTelefono: 'Celular', estatus: 'Sin marcar' }] : []);

  const bloqueadaPorVigente = esPromesa && promesaVigente;

  const handleFechaChange = (e) => {
    const seleccionada = e.target.value;
    setFechaPromesa(seleccionada);

    if (seleccionada && diasMaximos) {
      const hoy = new Date();
      const limite = new Date();
      limite.setDate(hoy.getDate() + diasMaximos);

      const fechaComparar = new Date(seleccionada + 'T00:00:00');
      setAlertaFecha(fechaComparar > limite);
    } else {
      setAlertaFecha(false);
    }
  };

  const handleTelefonoChange = (e) => {
    const num = e.target.value;
    setTelefonoMarcado(num);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (bloqueadaPorVigente) {
      setErrorMsg('Ya existe una promesa vigente para este producto. No se puede registrar otra promesa hasta que venza.');
      return;
    }

    setLoading(true);

    const telefonoSeleccionado = telefonos.find(t => t.numeroTelefono === telefonoMarcado);

    const nuevaGestion = {
      deuda: { idDeuda: deuda.idDeuda },
      empleado: { idEmpleado: empleadoActual.idEmpleado },
      concepto: { idConcepto: Number(conceptoId) },
      motivoNoPago: { idMotivo: Number(motivoId) },
      codigoResultado: conceptoSeleccionado.nombreConcepto,
      comentarios: observaciones
    };

    if (esPromesa) {
      nuevaGestion.montoPromesa = parseFloat(montoPromesa);
      nuevaGestion.fechaPromesa = fechaPromesa;
      nuevaGestion.numeroMarcado = telefonoMarcado;
      nuevaGestion.tipoTelefonoMarcado = telefonoSeleccionado?.tipoTelefono || '';
      if (tipoPromesaId) {
        nuevaGestion.tipoPromesa = { idTipoPromesa: Number(tipoPromesaId) };
      }
      if (montoPagadoPromesa && montoPagadoPromesa !== '') {
        nuevaGestion.montoPagado = parseFloat(montoPagadoPromesa) || 0;
      }
      if (esTipoPromocionConvenio) {
        nuevaGestion.estadoBonificacion = 'PENDIENTE';
      }
    }

    axios.post('/api/gestiones', nuevaGestion)
      .then(() => {
        setConceptoId('');
        setMotivoId('');
        setMontoPromesa('');
        setFechaPromesa('');
        setTipoPromesaId('');
        setMontoPagadoPromesa('');
        setTelefonoMarcado('');
        setObservaciones('');
        setAlertaFecha(false);
        if (onGestionAgregada) onGestionAgregada();
      })
      .catch(error => {
        console.error("Error guardando la gestión:", error);
        const msg = error.response?.data;
        setErrorMsg(typeof msg === 'string' ? msg : 'Error al guardar. Revisa la consola para más detalles.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Concepto de la Gestión *</label>
          <select
            value={conceptoId}
            onChange={(e) => setConceptoId(e.target.value)}
            required
            className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Selecciona el concepto --</option>
            {conceptosCampaña.map(c => (
              <option key={c.idConcepto} value={String(c.idConcepto)}>{c.nombreConcepto}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Motivo de No Pago *</label>
          <select
            value={motivoId}
            onChange={(e) => setMotivoId(e.target.value)}
            required
            className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Selecciona el motivo --</option>
            {motivosCampaña.map(m => (
              <option key={m.idMotivo} value={String(m.idMotivo)}>{m.descripcion}</option>
            ))}
          </select>
        </div>
      </div>

      {esBloquePromesa && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
          {bloqueadaPorVigente && (
            <div className="mb-3 bg-red-100 border border-red-300 text-red-800 text-xs font-bold p-2.5 rounded">
              ⛔ Este producto ya tiene una promesa vigente. No se permite registrar otra hasta su vencimiento.
            </div>
          )}
          <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">
            💵 Datos de la Promesa de Pago
          </h5>

          {esTipoPromocionConvenio && (
            <div className="mb-3 bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold p-2.5 rounded flex items-start gap-2">
              <span>🎁</span>
              <span>
                Estás capturando una <b>Promoción/Convenio</b> (promesa con beneficio extra, ej. descuento). Quedará en{' '}
                <b>PENDIENTE</b>. Cuando el cliente pague, <b>escala a Auditoría</b> subiendo el ticket{' '}
                <b>118 (Aprobación de Promoción)</b> desde la pestaña Tickets.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Monto a Pagar ($) *</label>
              <input
                type="number" step="0.01" value={montoPromesa} onChange={(e) => setMontoPromesa(e.target.value)}
                required placeholder="Ej. 1500.00"
                className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Promesa *</label>
              <select
                value={tipoPromesaId}
                onChange={(e) => setTipoPromesaId(e.target.value)}
                required
                className={`w-full p-2 text-sm border rounded focus:ring-2 focus:outline-none bg-white ${esTipoPromocionConvenio ? 'border-purple-400 ring-purple-200 bg-purple-50' : 'border-slate-300 focus:ring-blue-500'}`}
              >
                <option value="">-- Elige el tipo --</option>
                {tiposPromesaCampaña && tiposPromesaCampaña.map(t => (
                  <option key={t.idTipoPromesa} value={String(t.idTipoPromesa)}>{t.nombre}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Si es <b>Promoción</b> o <b>Convenio</b>, se trata de una promesa con beneficio extra que se escala a Auditoría (ticket 118) al recibir el pago. Solo puede haber <b>una vigente a la vez</b>.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha de la Promesa *</label>
              <input
                type="date" value={fechaPromesa} onChange={handleFechaChange}
                required
                className={`w-full p-2 text-sm border rounded focus:ring-2 focus:outline-none bg-white ${alertaFecha ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Número que marcó el cliente *</label>
              <select
                value={telefonoMarcado}
                onChange={handleTelefonoChange}
                required
                className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- Elige el teléfono --</option>
                {telefonos.map((t, i) => (
                  <option key={i} value={t.numeroTelefono}>{t.numeroTelefono} ({t.tipoTelefono}) — {t.estatus}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">El número elegido se marca como "Efectivo" en la ficha del cliente.</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de teléfono</label>
              <div className="w-full p-2 text-sm border border-slate-200 rounded bg-slate-50 text-slate-700 font-bold">
                {telefonos.find(t => t.numeroTelefono === telefonoMarcado)?.tipoTelefono || '—'}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cantidad Pagada ($)</label>
              <input
                type="number" step="0.01" min="0" value={montoPagadoPromesa} onChange={(e) => setMontoPagadoPromesa(e.target.value)}
                placeholder="Ej. 500.00 (opcional, 0 si aún no paga)"
                className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Puede actualizarse después desde la pestaña Promesas. Al registrar el pago de una Promoción/Convenio, no olvides subir el ticket 118 a Auditoría.</p>
            </div>
          </div>
          {alertaFecha && (
            <p className="text-xs text-red-600 font-bold mt-2 bg-red-100 p-1.5 rounded">
              ⚠️ Aviso: La fecha seleccionada supera los lineamientos permitidos por la campaña.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Observaciones (qué pasó en la llamada) *</label>
        <textarea
          value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
          required rows="3" placeholder={esTipoPromocionConvenio ? 'Ej. Se le ofreció descuento del 20% sobre mora. Se compromete a pagar el viernes; se escalará a Auditoría al recibir el pago.' : 'Ej. Contestó el titular. Se compromete a liquidar el saldo el viernes...'}
          className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        ></textarea>
      </div>

      {errorMsg && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold p-3 rounded">{errorMsg}</div>}

      <button
        type="submit" disabled={loading || bloqueadaPorVigente}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded text-sm transition-colors shadow-sm disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {loading ? 'Guardando...' : 'Registrar Gestión'}
      </button>
    </form>
  );
}