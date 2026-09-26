import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AuditoriaViewer() {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarLogs = async () => {
    setCargando(true);
    setError('');
    try {
      const response = await axios.get('/api/logs-auditoria');
      // Ordenamos los registros para que los más recientes aparezcan arriba
      const logsOrdenados = response.data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setLogs(logsOrdenados);
    } catch (err) {
      console.error("Error al cargar la bitácora:", err);
      setError('No se pudo conectar con el servidor para obtener los registros de auditoría.');
    } finally {
      setCargando(false);
    }
  };

  // Carga inicial de la bitacora: sincronizacion con el servidor, con el setState
  // dentro del async tras la respuesta.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarLogs();
  }, []);

  // Función para darle color a la etiqueta según la acción
  const getBadgeColor = (accion = '') => {
    const act = accion.toUpperCase();
    if (act.includes('CREAT') || act.includes('INSERT') || act.includes('LOGIN')) return 'bg-green-100 text-green-800';
    if (act.includes('UPDAT') || act.includes('EDIT')) return 'bg-blue-100 text-blue-800';
    if (act.includes('DELET') || act.includes('REMOV')) return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bitácora de Auditoría</h2>
          <p className="text-sm text-slate-500 mt-1">Registro inalterable de movimientos de seguridad en la plataforma.</p>
        </div>
        <button 
          onClick={cargarLogs}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded transition-colors flex items-center gap-2"
        >
          🔄 Refrescar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded text-red-800 font-semibold">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="text-center py-10 text-slate-500 font-medium animate-pulse">
          Cargando registros de seguridad...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-lg border border-slate-100">
          No hay registros de auditoría disponibles en este momento.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">ID / Fecha</th>
                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                <th className="px-6 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Módulo / Detalles</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-xs text-slate-400">#{log.idLog || log.id}</div>
                    <div className="font-medium text-slate-700">
                      {/* Adaptable a si tu backend devuelve 'fecha' o 'fechaHora' */}
                      {new Date(log.fecha || log.fechaHora).toLocaleString('es-MX')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">
                      {/* Adaptable según cómo venga el objeto de Empleado en tu JSON */}
                      {log.empleado?.nombreCompleto || log.usuario || `ID Empleado: ${log.idEmpleado}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getBadgeColor(log.accion)}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-800 font-medium">{log.entidadAfectada || log.modulo}</div>
                    <div className="text-slate-500 text-xs mt-1 break-words">
                      {log.detalles || log.descripcion}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}