import { useState } from 'react';
import axios from 'axios';

export default function PagoForm({ deudaId, saldoRestante, onPagoExitoso }) {
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia SPEI');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const monto = parseFloat(montoPago);

    // Validamos que no se intente pagar más de lo que se debe
    if (monto > saldoRestante) {
      alert(`El monto ingresado ($${monto}) supera el saldo actual de la deuda ($${saldoRestante}). Por favor, ajusta la cantidad.`);
      return;
    }

    setLoading(true);

    const nuevoPago = {
      monto: monto,
      metodoPago: metodoPago,
      deuda: { idDeuda: deudaId }
    };

    axios.post('http://localhost:8080/api/pagos', nuevoPago)
      .then(() => {
        alert('Pago aplicado exitosamente. El saldo de la deuda se ha actualizado.');
        setMontoPago('');
        // Avisamos a la tarjeta para que vuelva a descargar los saldos frescos desde Java
        if (onPagoExitoso) onPagoExitoso(); 
      })
      .catch(error => {
        console.error("Error registrando el pago:", error);
        alert('Hubo un error al aplicar el pago. Revisa la consola.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Si la deuda ya está en ceros, no mostramos el formulario de pago
  if (saldoRestante <= 0) {
    return (
      <div className="bg-green-50 p-4 border border-green-200 rounded-lg text-center mt-4">
        <span className="text-2xl block mb-2">🎉</span>
        <h4 className="text-green-800 font-bold text-sm uppercase">Cuenta Liquidada</h4>
        <p className="text-green-600 text-xs">Esta deuda tiene un saldo de $0.00</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-inner">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
        Terminal de Pagos (CXC)
      </h4>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Monto a Abonar ($)</label>
          <input 
            type="number" 
            step="0.01" 
            max={saldoRestante} // HTML5 previene que escriban de más
            value={montoPago} 
            onChange={(e) => setMontoPago(e.target.value)}
            required 
            placeholder="Ej. 500.00"
            className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Método de Pago</label>
          <select 
            value={metodoPago} 
            onChange={(e) => setMetodoPago(e.target.value)}
            className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="Transferencia SPEI">Transferencia SPEI</option>
            <option value="Depósito OXXO">Depósito OXXO</option>
            <option value="Tarjeta de Débito/Crédito">Tarjeta en Portal</option>
            <option value="Pago en Ventanilla">Ventanilla Bancaria</option>
          </select>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading || !montoPago}
        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm disabled:bg-slate-300"
      >
        {loading ? 'Procesando Transacción...' : 'Aplicar Abono a la Deuda'}
      </button>
    </form>
  );
}