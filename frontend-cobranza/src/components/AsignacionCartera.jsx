import { useState, useEffect } from 'react';
import axios from 'axios';

const formatearDinero = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AsignacionCartera({ empresaId }) {
  const [empleados, setEmpleados] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [asignacionesExistentes, setAsignacionesExistentes] = useState([]);
  const [gestorSeleccionado, setGestorSeleccionado] = useState('');
  const [deudasSeleccionadas, setDeudasSeleccionadas] = useState([]);
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });
  const [cargando, setCargando] = useState(false);

  async function cargarDatos() {
    try {
      const params = empresaId ? { params: { empresaId } } : {};
      const resEmpleados = await axios.get('http://localhost:8080/api/empleados', params);
      const resDeudas = await axios.get('http://localhost:8080/api/deudas', params);
      const resAsignaciones = await axios.get('http://localhost:8080/api/asignaciones-cartera', params);

      const gestores = resEmpleados.data.filter(emp => emp.activo === true);

      setEmpleados(gestores);
      setDeudas(resDeudas.data);
      setAsignacionesExistentes(resAsignaciones.data);
    } catch (error) {
      console.error("Error al cargar datos para asignación:", error);
      setNotificacion({ tipo: 'error', mensaje: 'Error al conectar con la base de datos.' });
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const deudaAsignadaA = (idDeuda) => {
    const asig = asignacionesExistentes.find(a => a.deuda?.idDeuda === idDeuda && a.estatusActiva === true);
    return asig ? asig.empleado : null;
  };

  const handleCheckboxChange = (idDeuda) => {
    if (deudasSeleccionadas.includes(idDeuda)) {
      setDeudasSeleccionadas(deudasSeleccionadas.filter(id => id !== idDeuda));
    } else {
      setDeudasSeleccionadas([...deudasSeleccionadas, idDeuda]);
    }
  };

  const seleccionarTodas = () => {
    const disponibles = deudas.filter(d => !deudaAsignadaA(d.idDeuda));
    if (deudasSeleccionadas.length === disponibles.length) {
      setDeudasSeleccionadas([]);
    } else {
      setDeudasSeleccionadas(disponibles.map(d => d.idDeuda));
    }
  };

  const asignarCartera = async (e) => {
    e.preventDefault();
    if (!gestorSeleccionado) {
      setNotificacion({ tipo: 'error', mensaje: 'Por favor, selecciona un gestor.' });
      return;
    }
    if (deudasSeleccionadas.length === 0) {
      setNotificacion({ tipo: 'error', mensaje: 'Debes seleccionar al menos una cuenta (producto) para asignar.' });
      return;
    }

    const yaAsignadas = deudasSeleccionadas.filter(id => deudaAsignadaA(id));
    if (yaAsignadas.length > 0) {
      setNotificacion({ tipo: 'error', mensaje: 'Alguna de las cuentas seleccionadas ya está asignada a un gestor.' });
      return;
    }

    setCargando(true);
    setNotificacion({ tipo: '', mensaje: '' });

    try {
      const promesas = deudasSeleccionadas.map(idDeuda =>
        axios.post('http://localhost:8080/api/asignaciones-cartera', {
          empleado: { idEmpleado: gestorSeleccionado },
          deuda: { idDeuda: idDeuda },
          fechaAsignacion: new Date().toISOString().split('T')[0],
          estatusActiva: true
        })
      );

      await Promise.all(promesas);

      setNotificacion({ tipo: 'exito', mensaje: `¡Se asignaron ${deudasSeleccionadas.length} cuentas al gestor exitosamente!` });
      setDeudasSeleccionadas([]);
      setGestorSeleccionado('');
      cargarDatos();
    } catch (error) {
      console.error("Error al asignar cartera:", error);
      setNotificacion({ tipo: 'error', mensaje: 'Ocurrió un error al guardar las asignaciones. Revisa la consola.' });
    } finally {
      setCargando(false);
    }
  };

  const disponibles = deudas.filter(d => !deudaAsignadaA(d.idDeuda));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Asignación de Cartera</h2>
        <p className="text-sm text-slate-500 mt-1">Distribuye las cuentas (productos) disponibles a los gestores operativos. Las cuentas ya asignadas se marcan con el gestor actual.</p>
      </div>

      {notificacion.mensaje && (
        <div className={`p-4 mb-6 rounded text-sm font-bold ${notificacion.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notificacion.mensaje}
        </div>
      )}

      <form onSubmit={asignarCartera}>
        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">1. Selecciona al Gestor</label>
            <select
              value={gestorSeleccionado}
              onChange={(e) => setGestorSeleccionado(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Elige un empleado --</option>
              {empleados.map(emp => (
                <option key={emp.idEmpleado || emp.id} value={emp.idEmpleado || emp.id}>
                  {emp.nombreCompleto || emp.nombre} (ID: {emp.idEmpleado || emp.id})
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-auto">
            <button
              type="submit"
              disabled={cargando}
              className={`w-full font-bold py-3 px-8 rounded-lg transition-colors ${cargando ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {cargando ? 'Asignando...' : '2. Guardar Asignación'}
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-700">Cuentas de la Cartera ({deudas.length})</span>
            <button type="button" onClick={seleccionarTodas} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              {deudasSeleccionadas.length === disponibles.length ? 'Deseleccionar Todas' : 'Seleccionar Todas (libres)'}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase w-12">Sel.</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase">Cuenta / Producto</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase">Saldo</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase">Asignación Actual</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {deudas.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 italic">No hay cuentas registradas para esta empresa.</td></tr>
                ) : (
                  deudas.map((deuda) => {
                    const id = deuda.idDeuda;
                    const isChecked = deudasSeleccionadas.includes(id);
                    const asignada = deudaAsignadaA(id);
                    const esActiva = deuda.saldoPendiente > 0;
                    return (
                      <tr key={id} className={`${isChecked ? 'bg-blue-50' : 'hover:bg-slate-50'} ${asignada ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-4">
                          {asignada ? (
                            <span className="text-slate-300">☑️</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm font-black text-slate-800">{deuda.numeroCuenta}</div>
                          <div className="text-[11px] text-slate-500">{deuda.tipoProducto?.nombreProducto || 'Sin tipo'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{deuda.deudor?.nombreCompleto || 'Sin cliente'}</div>
                          <div className="text-[11px] text-slate-500">{deuda.deudor?.documentoIdentidad || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${esActiva ? 'text-red-600' : 'text-green-600'}`}>{formatearDinero(deuda.saldoPendiente)}</span>
                        </td>
                        <td className="px-6 py-4">
                          {asignada ? (
                            <span className="inline-block text-[11px] font-black px-2 py-1 rounded bg-slate-200 text-slate-700">→ {asignada.nombreCompleto || `ID ${asignada.idEmpleado}`}</span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">Libre</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {disponibles.length < deudas.length && (
            <p className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">
              {deudas.length - disponibles.length} cuenta(s) ya asignadas (deshabilitadas).
            </p>
          )}
        </div>
      </form>
    </div>
  );
}