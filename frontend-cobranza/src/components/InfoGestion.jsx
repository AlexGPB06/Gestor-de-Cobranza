import { useState } from 'react';
import ClienteInfo from './ClienteInfo';
import GestionPanel from './GestionPanel';
import CXC_Pagos from './CXC_Pagos';
import PromesasTab from './PromesasTab';
import BonificacionesTab from './BonificacionesTab';
import TicketsTab from './TicketsTab';

export default function InfoGestion({
  terminoBusqueda, onTerminoChange, onBuscar, mensajeBusqueda,
  deudorBuscado, limpiarSeleccion,
  deudas, deudaSeleccionadaId, onCambiarDeuda,
  gestiones, conceptos, motivos, empleadoActual, onGestionAgregada,
  pagos, tab, setTab,
  tiposPromesa, tickets, tiposTicket, onDatosActualizados
}) {
  const deudasDelDeudor = deudorBuscado
    ? deudas.filter(d => d.deudor?.idDeudor === deudorBuscado.idDeudor || d.idDeudor === deudorBuscado.idDeudor)
    : [];
  const deudaSeleccionada = deudasDelDeudor.find(d => Number(d.idDeuda) === Number(deudaSeleccionadaId)) || deudasDelDeudor[0];
  const [prefillTicket, setPrefillTicket] = useState(null);

  const pestañas = [
    { id: 'info', icono: '📋', nombre: 'Info' },
    { id: 'gestion', icono: '📞', nombre: 'Gestión' },
    { id: 'pagos', icono: '💰', nombre: 'CXC/PAGOS' },
    { id: 'promesas', icono: '📅', nombre: 'Promesas' },
    { id: 'bonificaciones', icono: '🎁', nombre: 'Bonificaciones' },
    { id: 'tickets', icono: '🎫', nombre: 'Tickets' },
  ];

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-6">Info/Gestión</h2>

      {deudorBuscado && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-semibold p-2 rounded mb-4 flex justify-between items-center">
          <span>Cliente seleccionado: {deudorBuscado.nombreCompleto}</span>
          <button onClick={limpiarSeleccion} className="text-blue-700 hover:underline font-bold">Cambiar cliente</button>
        </div>
      )}

      <form onSubmit={onBuscar} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número de identificador de la empresa (cuenta del producto)</label>
          <input type="text" value={terminoBusqueda} onChange={(e) => onTerminoChange(e.target.value)} placeholder="Ej. TDC-456789" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors h-[46px]">Buscar Expediente</button>
        </div>
      </form>

      {mensajeBusqueda && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100 mb-6 font-semibold text-center">{mensajeBusqueda}</div>}

      {deudorBuscado ? (
        <>
          {/* SUBMENÚ TIPO FOLDER: INFO | GESTIÓN | CXC/PAGOS */}
          <div className="flex gap-2 mb-6 border-b border-slate-300 pb-0">
            {pestañas.map(p => (
              <button
                key={p.id}
                onClick={() => setTab(p.id)}
                className={`px-6 py-3 text-base font-black rounded-t-xl border border-b-0 transition-all flex items-center gap-2 ${
                  tab === p.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md -mb-px'
                    : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                }`}
              >
                <span className="text-lg">{p.icono}</span> {p.nombre}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <ClienteInfo
              deudor={deudorBuscado}
              deudas={deudas}
            />
          )}

          {tab === 'gestion' && deudaSeleccionada && (
            <GestionPanel
              deudor={deudorBuscado}
              deudas={deudas}
              deudaSeleccionadaId={deudaSeleccionadaId}
              onCambiarDeuda={onCambiarDeuda}
              gestiones={gestiones}
              conceptos={conceptos}
              motivos={motivos}
              empleadoActual={empleadoActual}
              onGestionAgregada={onGestionAgregada}
              tiposPromesa={tiposPromesa}
            />
          )}

          {tab === 'pagos' && deudaSeleccionada && (
            <CXC_Pagos
              deuda={deudaSeleccionada}
              pagos={pagos}
              onCambiarDeuda={onCambiarDeuda}
              deudasDelDeudor={deudasDelDeudor}
            />
          )}

          {tab === 'promesas' && (
            <PromesasTab
              deudor={deudorBuscado}
              deudas={deudas}
              gestiones={gestiones}
              onDatosActualizados={onDatosActualizados}
              onSubirTicket118={(p) => {
                setPrefillTicket({
                  key: Date.now(),
                  numero: '118',
                  asunto: 'Aprobación de Promoción',
                  idDeuda: p.deuda?.idDeuda
                });
                setTab('tickets');
              }}
            />
          )}

          {tab === 'bonificaciones' && (
            <BonificacionesTab
              deudor={deudorBuscado}
              deudas={deudas}
              gestiones={gestiones}
              onDatosActualizados={onDatosActualizados}
            />
          )}

          {tab === 'tickets' && (
            <TicketsTab
              key={prefillTicket ? `prefill-${prefillTicket.key}` : 'tickets-vacio'}
              deudor={deudorBuscado}
              deudas={deudas}
              tiposTicket={tiposTicket}
              tickets={tickets}
              empleadoActual={empleadoActual}
              deudaSeleccionadaId={deudaSeleccionadaId}
              onDatosActualizados={onDatosActualizados}
              prefill={prefillTicket}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <div className="text-6xl mb-4">🎧</div>
          <p className="text-lg font-semibold">Introduce el número de cuenta para ver la información esencial del cliente y gestionar su adeudo.</p>
        </div>
      )}
    </div>
  );
}