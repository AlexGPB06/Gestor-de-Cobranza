import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AsignacionCartera({ empresaId }) {
  const [empleados, setEmpleados] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [gestorSeleccionado, setGestorSeleccionado] = useState('');
  const [deudoresSeleccionados, setDeudoresSeleccionados] = useState([]);
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });
  const [cargando, setCargando] = useState(false);

  async function cargarDatos() {
    try {
      const params = empresaId ? { params: { empresaId } } : {};
      const resEmpleados = await axios.get('http://localhost:8080/api/empleados', params);
      const resDeudores = await axios.get('http://localhost:8080/api/deudores', params);
      
      const gestores = resEmpleados.data.filter(emp => emp.activo === true); 
      
      setEmpleados(gestores);
      setDeudores(resDeudores.data);
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

  const handleCheckboxChange = (idDeudor) => {
    if (deudoresSeleccionados.includes(idDeudor)) {
      setDeudoresSeleccionados(deudoresSeleccionados.filter(id => id !== idDeudor));
    } else {
      setDeudoresSeleccionados([...deudoresSeleccionados, idDeudor]);
    }
  };

  const seleccionarTodos = () => {
    if (deudoresSeleccionados.length === deudores.length) {
      setDeudoresSeleccionados([]); // Deseleccionar todos
    } else {
      setDeudoresSeleccionados(deudores.map(d => d.idDeudor || d.id)); // Seleccionar todos
    }
  };

  const asignarCartera = async (e) => {
    e.preventDefault();
    if (!gestorSeleccionado) {
      setNotificacion({ tipo: 'error', mensaje: 'Por favor, selecciona un gestor.' });
      return;
    }
    if (deudoresSeleccionados.length === 0) {
      setNotificacion({ tipo: 'error', mensaje: 'Debes seleccionar al menos un cliente para asignar.' });
      return;
    }

    setCargando(true);
    setNotificacion({ tipo: '', mensaje: '' });

    try {
      // Enviar la asignación registro por registro (o puedes usar un endpoint bulk si tu backend lo soporta)
      const promesas = deudoresSeleccionados.map(idDeudor => 
        axios.post('http://localhost:8080/api/asignaciones-cartera', {
          empleado: { idEmpleado: gestorSeleccionado },
          deudor: { idDeudor: idDeudor },
          fechaAsignacion: new Date().toISOString().split('T')[0],
          estatusActiva: true
        })
      );

      await Promise.all(promesas);
      
      setNotificacion({ tipo: 'exito', mensaje: `¡Se asignaron ${deudoresSeleccionados.length} clientes al gestor exitosamente!` });
      setDeudoresSeleccionados([]); // Limpiar selección
      setGestorSeleccionado('');
    } catch (error) {
      console.error("Error al asignar cartera:", error);
      setNotificacion({ tipo: 'error', mensaje: 'Ocurrió un error al guardar las asignaciones. Revisa la consola.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Asignación de Cartera</h2>
        <p className="text-sm text-slate-500 mt-1">Distribuye los clientes disponibles a los gestores operativos.</p>
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
            <span className="font-bold text-slate-700">Cartera de Clientes ({deudores.length})</span>
            <button type="button" onClick={seleccionarTodos} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              {deudoresSeleccionados.length === deudores.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase w-12">Sel.</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase">ID / Cliente</th>
                  <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase">Contacto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {deudores.length === 0 ? (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500 italic">No hay clientes registrados en el sistema.</td></tr>
                ) : (
                  deudores.map((deudor) => {
                    const id = deudor.idDeudor || deudor.id;
                    const isChecked = deudoresSeleccionados.includes(id);
                    return (
                      <tr key={id} className={isChecked ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => handleCheckboxChange(id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-slate-400">#{id}</div>
                          <div className="font-bold text-slate-800">{deudor.nombreCompleto}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {deudor.telefonoPrincipal || 'Sin teléfono'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}