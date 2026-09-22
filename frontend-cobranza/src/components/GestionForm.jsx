import { useState } from 'react';
import axios from 'axios';

// Recibimos la función onGestionAgregada
export default function GestionForm({ deudaId, onGestionAgregada }) {
  const [comentarios, setComentarios] = useState('');
  const [codigoResultado, setCodigoResultado] = useState('Promesa de Pago');
  const [montoPromesa, setMontoPromesa] = useState('');
  const [fechaPromesa, setFechaPromesa] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const nuevaGestion = {
      comentarios: comentarios,
      codigoResultado: codigoResultado,
      deuda: { idDeuda: deudaId },
      empleado: { idEmpleado: 1 }
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
        
        // Ejecutamos el puente para recargar el historial sin usar F5
        if(onGestionAgregada) {
          onGestionAgregada();
        }
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
    <form onSubmit={handleSubmit} className="mt-3 bg-slate-100 p-3 rounded-lg border border-slate-200">
      <h5 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Capturar Gestión</h5>
      
      <div className="mb-2">
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Resultado del Contacto</label>
        <select 
          value={codigoResultado} 
          onChange={(e) => setCodigoResultado(e.target.value)}
          className="w-full p-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
        >
          <option value="Promesa de Pago">Contacto Efectivo (Promesa)</option>
          <option value="Mensaje a Tercero">Mensaje a Tercero</option>
          <option value="No Contesta">Buzón / No Contesta</option>
          <option value="Negativa">Negativa Rotunda</option>
        </select>
      </div>

      {codigoResultado === 'Promesa de Pago' && (
        <div className="flex gap-2 mb-2">
          <div className="w-1/2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Monto a Pagar ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={montoPromesa}
              onChange={(e) => setMontoPromesa(e.target.value)}
              required
              placeholder="Ej. 1500.00"
              className="w-full p-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <div className="w-1/2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fecha Promesa</label>
            <input 
              type="date" 
              value={fechaPromesa}
              onChange={(e) => setFechaPromesa(e.target.value)}
              required
              className="w-full p-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white text-slate-600"
            />
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Notas del Agente</label>
        <textarea 
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          required
          rows="2"
          className="w-full p-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
          placeholder="Ej. El titular se compromete a liquidar el viernes..."
        ></textarea>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-sm transition-colors disabled:bg-blue-300"
      >
        {loading ? 'Guardando...' : 'Guardar Gestión'}
      </button>
    </form>
  );
}