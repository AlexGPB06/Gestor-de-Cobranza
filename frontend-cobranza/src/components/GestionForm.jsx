import { useState } from 'react';
import axios from 'axios';

export default function GestionForm({ deudaId, onGestionAgregada, diasMaximos, empleadoActual }) {
  const [comentarios, setComentarios] = useState('');
  const [codigoResultado, setCodigoResultado] = useState('Promesa de Pago');
  const [montoPromesa, setMontoPromesa] = useState('');
  const [fechaPromesa, setFechaPromesa] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertaFecha, setAlertaFecha] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const nuevaGestion = {
      comentarios: comentarios,
      codigoResultado: codigoResultado,
      deuda: { idDeuda: deudaId },
      // ¡Aquí está la magia! Ya no es un 1 fijo, es el ID del agente logueado.
      empleado: { idEmpleado: empleadoActual.idEmpleado } 
    };

    if (codigoResultado === 'Promesa de Pago') {
      nuevaGestion.montoPromesa = parseFloat(montoPromesa);
      nuevaGestion.fechaPromesa = fechaPromesa;
    }

    axios.post('http://localhost:8080/api/gestiones', nuevaGestion)
      .then(() => {
        setComentarios('');
        setMontoPromesa('');
        setFechaPromesa('');
        setAlertaFecha(false);
        if(onGestionAgregada) onGestionAgregada();
      })
      .catch(error => {
        console.error("Error guardando la gestión:", error);
        alert('Error al guardar. Revisa la consola para más detalles.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Resultado del Contacto</label>
        <select 
          value={codigoResultado} 
          onChange={(e) => setCodigoResultado(e.target.value)}
          className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="Promesa de Pago">Contacto Efectivo (Promesa)</option>
          <option value="Mensaje a Tercero">Mensaje a Tercero</option>
          <option value="No Contesta">Buzón / No Contesta</option>
          <option value="Negativa">Negativa Rotunda</option>
        </select>
      </div>

      {codigoResultado === 'Promesa de Pago' && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <div className="flex gap-3 mb-1">
            <div className="w-1/2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Monto a Pagar ($)</label>
              <input 
                type="number" step="0.01" value={montoPromesa} onChange={(e) => setMontoPromesa(e.target.value)}
                required placeholder="Ej. 1500.00"
                className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha Promesa</label>
              <input 
                type="date" value={fechaPromesa} onChange={handleFechaChange}
                required
                className={`w-full p-2 text-sm border rounded focus:ring-2 focus:outline-none ${alertaFecha ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-slate-300 focus:ring-blue-500'}`}
              />
            </div>
          </div>
          {alertaFecha && (
            <p className="text-xs text-red-600 font-bold mt-1 bg-red-100 p-1.5 rounded">
              ⚠️ Aviso: La fecha seleccionada supera los lineamientos permitidos por la campaña.
            </p>
          )}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Notas del Agente</label>
        <textarea 
          value={comentarios} onChange={(e) => setComentarios(e.target.value)}
          required rows="2" placeholder="Ej. El titular se compromete a liquidar..."
          className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        ></textarea>
      </div>

      <button 
        type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm disabled:bg-blue-300"
      >
        {loading ? 'Guardando...' : 'Registrar Gestión'}
      </button>
    </form>
  );
}