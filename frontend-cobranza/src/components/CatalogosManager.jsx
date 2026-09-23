import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CatalogosManager() {
  const catalogosConfig = [
    { id: 'motivos', titulo: 'Motivos de No Pago', endpoint: 'motivos-no-pago', campoTexto: 'descripcion' },
    { id: 'productos', titulo: 'Tipos de Producto', endpoint: 'tipos-producto', campoTexto: 'nombre' },
    { id: 'rubros', titulo: 'Rubros de Cobro', endpoint: 'rubros-cobro', campoTexto: 'nombre' },
    { id: 'conceptos', titulo: 'Conceptos', endpoint: 'conceptos', campoTexto: 'nombre' }
  ];

  const [tabActiva, setTabActiva] = useState(catalogosConfig[0].id);
  const [datos, setDatos] = useState([]);
  const [nuevoValor, setNuevoValor] = useState('');
  const [notificacion, setNotificacion] = useState({ tipo: '', mensaje: '' });

  // Nuevos estados para el modo Edición (Update)
  const [editandoId, setEditandoId] = useState(null);
  const [valorEdicion, setValorEdicion] = useState('');

  const catalogoActual = catalogosConfig.find(c => c.id === tabActiva);

  useEffect(() => {
    cargarDatosCatalogo();
    setNotificacion({ tipo: '', mensaje: '' });
    setNuevoValor('');
    setEditandoId(null);
  }, [tabActiva]);

  const cargarDatosCatalogo = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/${catalogoActual.endpoint}`);
      setDatos(response.data);
    } catch (error) {
      console.error("Error al cargar catálogo:", error);
      setNotificacion({ tipo: 'error', mensaje: 'Error al obtener los datos del servidor.' });
    }
  };

  const handleCrearRegistro = async (e) => {
    e.preventDefault();
    if (!nuevoValor.trim()) return;

    try {
      const payload = { [catalogoActual.campoTexto]: nuevoValor };
      await axios.post(`http://localhost:8080/api/${catalogoActual.endpoint}`, payload);
      
      setNuevoValor('');
      setNotificacion({ tipo: 'exito', mensaje: 'Registro creado exitosamente.' });
      cargarDatosCatalogo();
    } catch (error) {
      console.error("Error al crear registro:", error);
      setNotificacion({ tipo: 'error', mensaje: 'No se pudo guardar el registro.' });
    }
  };

  // Función para eliminar (Delete)
  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
      await axios.delete(`http://localhost:8080/api/${catalogoActual.endpoint}/${id}`);
      setNotificacion({ tipo: 'exito', mensaje: 'Registro eliminado correctamente.' });
      cargarDatosCatalogo();
    } catch (error) {
      console.error("Error al eliminar registro:", error);
      setNotificacion({ tipo: 'error', mensaje: 'Error al eliminar. Puede que esté en uso por otra tabla.' });
    }
  };

  // Funciones para actualizar (Update)
  const iniciarEdicion = (id, textoActual) => {
    setEditandoId(id);
    setValorEdicion(textoActual);
  };

  const guardarEdicion = async (id) => {
    if (!valorEdicion.trim()) return;

    try {
      const payload = { [catalogoActual.campoTexto]: valorEdicion };
      await axios.put(`http://localhost:8080/api/${catalogoActual.endpoint}/${id}`, payload);
      
      setEditandoId(null);
      setNotificacion({ tipo: 'exito', mensaje: 'Registro actualizado exitosamente.' });
      cargarDatosCatalogo();
    } catch (error) {
      console.error("Error al actualizar registro:", error);
      setNotificacion({ tipo: 'error', mensaje: 'No se pudo actualizar el registro.' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Catálogos Operativos</h2>
      
      <div className="flex space-x-2 border-b border-slate-200 mb-6">
        {catalogosConfig.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setTabActiva(cat.id)}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
              tabActiva === cat.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {cat.titulo}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Crear Registro */}
        <div className="md:col-span-1 bg-slate-50 p-4 rounded-lg border border-slate-100 h-fit">
          <h3 className="font-bold text-slate-700 mb-4">Añadir a {catalogoActual.titulo}</h3>
          
          <form onSubmit={handleCrearRegistro} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {catalogoActual.campoTexto}
              </label>
              <input 
                type="text" 
                value={nuevoValor}
                onChange={(e) => setNuevoValor(e.target.value)}
                placeholder="Ingresa el nuevo valor..."
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded transition-colors">
              Guardar Registro
            </button>
          </form>

          {notificacion.mensaje && (
            <div className={`mt-4 p-3 rounded text-sm font-semibold ${
              notificacion.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {notificacion.mensaje}
            </div>
          )}
        </div>

        {/* Panel Derecho: Leer, Actualizar, Eliminar */}
        <div className="md:col-span-2">
          <h3 className="font-bold text-slate-700 mb-4">Registros Actuales</h3>
          {datos.length === 0 ? (
            <p className="text-slate-500 italic">No hay registros en este catálogo.</p>
          ) : (
            <div className="overflow-hidden border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-24">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {catalogoActual.campoTexto}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {datos.map((item, index) => {
                    const idValor = item.id || Object.values(item)[0];
                    const textoValor = item[catalogoActual.campoTexto];
                    const enEdicion = editandoId === idValor;
                    
                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                          #{idValor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                          {enEdicion ? (
                            <input 
                              type="text" 
                              value={valorEdicion} 
                              onChange={(e) => setValorEdicion(e.target.value)}
                              className="w-full p-1 border border-blue-400 rounded focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            textoValor
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          {enEdicion ? (
                            <>
                              <button onClick={() => guardarEdicion(idValor)} className="text-green-600 hover:text-green-900">Guardar</button>
                              <button onClick={() => setEditandoId(null)} className="text-slate-500 hover:text-slate-700">Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => iniciarEdicion(idValor, textoValor)} className="text-blue-600 hover:text-blue-900">Editar</button>
                              <button onClick={() => handleEliminar(idValor)} className="text-red-600 hover:text-red-900">Eliminar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}