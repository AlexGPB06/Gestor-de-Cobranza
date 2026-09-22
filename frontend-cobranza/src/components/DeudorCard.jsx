import { useState } from 'react';
import GestionForm from './GestionForm';
import PagoForm from './PagoForm';

export default function DeudorCard({ deudor, deudas, gestiones, pagos, onDatosActualizados, empleadoActual }) {
  const [tabActiva, setTabActiva] = useState('info'); 
  
  const deudasDelDeudor = deudas.filter(d => d.deudor.idDeudor === deudor.idDeudor);
  const diasMaximosCampaña = deudor.campana.diasMaximosPromesa;

  const gestionesDelDeudor = gestiones.filter(g => 
    g.deuda && deudasDelDeudor.some(d => d.idDeuda === g.deuda.idDeuda)
  );
  
  const promesasDelDeudor = gestionesDelDeudor.filter(g => g.codigoResultado === 'Promesa de Pago');

  return (
    <div className="bg-white shadow-lg transition-shadow duration-200 rounded-xl overflow-hidden border border-slate-200 flex flex-col">
      <div className="bg-slate-800 p-5 text-white">
        <h3 className="text-2xl font-bold truncate">{deudor.nombreCompleto}</h3>
        <div className="mt-2 text-sm text-slate-300 flex justify-between">
          <p><span className="font-semibold text-slate-400">Teléfono:</span> {deudor.telefonoPrincipal}</p>
          <p><span className="font-semibold text-slate-400">Campaña:</span> {deudor.campana.nombreEmpresa}</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <button
          onClick={() => setTabActiva('info')}
          className={`flex-1 py-3 px-4 text-[11px] sm:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${tabActiva === 'info' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          Info y CXC
        </button>
        <button
          onClick={() => setTabActiva('gestion')}
          className={`flex-1 py-3 px-4 text-[11px] sm:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${tabActiva === 'gestion' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          Captura
        </button>
        <button
          onClick={() => setTabActiva('promesas')}
          className={`flex-1 py-3 px-4 text-[11px] sm:text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${tabActiva === 'promesas' ? 'border-b-2 border-blue-600 text-blue-700 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
        >
          Promesas ({promesasDelDeudor.length})
        </button>
      </div>
      
      <div className="p-5 flex-grow bg-white">
        
        {/* PESTAÑA 1: INFORMACIÓN FINANCIERA, PAGOS Y ESTADO DE CUENTA */}
        {tabActiva === 'info' && (
          <div className="animate-fade-in">
            {deudasDelDeudor.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin productos registrados.</p>
            ) : (
              <ul className="space-y-6">
                {deudasDelDeudor.map(deuda => {
                  // Filtramos los pagos reales que pertenecen a esta cuenta específica
                  const pagosDeLaDeuda = pagos ? pagos.filter(p => p.deuda && p.deuda.idDeuda === deuda.idDeuda) : [];

                  return (
                    <li key={deuda.idDeuda} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                      
                      <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-xs font-semibold text-slate-500 uppercase">Producto / Cuenta</span>
                            <span className="text-sm font-mono font-bold text-slate-800">{deuda.numeroCuenta}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-xs font-semibold text-slate-500 uppercase">Estado</span>
                            {deuda.saldoPendiente > 0 ? (
                              <span className="text-sm font-bold text-orange-600">En Mora</span> 
                            ) : (
                              <span className="text-sm font-bold text-green-600">Liquidado</span> 
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-white">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-bold text-slate-800">Saldo Pendiente Actual:</span>
                          <span className={`text-3xl font-black ${deuda.saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${deuda.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <PagoForm 
                          deudaId={deuda.idDeuda} 
                          saldoRestante={deuda.saldoPendiente} 
                          onPagoExitoso={onDatosActualizados} 
                        />

                        {/* MÓDULO NUEVO: HISTORIAL DE PAGOS REALES */}
                        <div className="mt-5 pt-4 border-t border-slate-200">
                          <h4 className="text-[11px] font-bold text-slate-500 uppercase mb-3 tracking-wider">Historial de Pagos Aplicados</h4>
                          {pagosDeLaDeuda.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">El cliente aún no ha registrado abonos en esta cuenta.</p>
                          ) : (
                            <ul className="space-y-2">
                              {pagosDeLaDeuda.map(pago => (
                                <li key={pago.idPago} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{pago.metodoPago}</span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      {new Date(pago.fechaRegistro).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                    </span>
                                  </div>
                                  <span className="text-sm font-black text-green-600">
                                    +${pago.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* PESTAÑA 2: CAPTURA DE GESTIÓN Y BITÁCORA */}
        {tabActiva === 'gestion' && (
          <div className="animate-fade-in">
             {deudasDelDeudor.map(deuda => {
              const gestionesDeLaDeuda = gestiones.filter(g => g.deuda && g.deuda.idDeuda === deuda.idDeuda);

              return (
                <div key={deuda.idDeuda} className="mb-6 last:mb-0">
                  <div className="bg-slate-800 text-white text-xs py-1.5 px-3 rounded-t-lg flex justify-between">
                    <span>Gestionando cuenta: {deuda.numeroCuenta}</span>
                  </div>
                  
                  <GestionForm 
                    deudaId={deuda.idDeuda} 
                    onGestionAgregada={onDatosActualizados} 
                    diasMaximos={diasMaximosCampaña}
                    empleadoActual={empleadoActual}
                  />

                  {gestionesDeLaDeuda.length > 0 && (
                    <div className="mt-5">
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">Bitácora Completa</h5>
                      <ul className="space-y-3">
                        {gestionesDeLaDeuda.map(gestion => (
                          <li key={gestion.idGestion} className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-black text-slate-700 uppercase">{gestion.codigoResultado}</span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(gestion.fechaRegistro).toLocaleDateString('es-MX')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 italic">"{gestion.comentarios}"</p>
                            
                            {gestion.montoPromesa && (
                              <div className="mt-2 inline-block bg-green-100 text-green-800 text-[11px] font-bold px-2 py-1 rounded">
                                💵 Promesa de ${gestion.montoPromesa.toLocaleString('es-MX')} para el {gestion.fechaPromesa}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PESTAÑA 3: HISTORIAL DE PROMESAS */}
        {tabActiva === 'promesas' && (
          <div className="animate-fade-in">
            {promesasDelDeudor.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <span className="text-3xl mb-2 block">📄</span>
                <p className="text-sm text-slate-500 font-semibold">El cliente no tiene promesas registradas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                      <th className="p-3 font-semibold rounded-tl-lg">Fecha Captura</th>
                      <th className="p-3 font-semibold">Tipo Promesa</th>
                      <th className="p-3 font-semibold">Empleado (Gestor)</th>
                      <th className="p-3 font-semibold">Fecha a Pagar</th>
                      <th className="p-3 font-semibold text-right rounded-tr-lg">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {promesasDelDeudor.map(promesa => (
                      <tr key={promesa.idGestion} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-500 text-xs">
                          {new Date(promesa.fechaRegistro).toLocaleDateString('es-MX')}
                        </td>
                        <td className="p-3 font-semibold text-slate-700">
                          {promesa.codigoResultado}
                        </td>
                        <td className="p-3 text-slate-600 text-xs flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {promesa.empleado ? promesa.empleado.idEmpleado : 'A'}
                          </div>
                          {promesa.empleado ? `ID: ${promesa.empleado.idEmpleado}` : 'Alex (Tú)'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {promesa.fechaPromesa}
                        </td>
                        <td className="p-3 text-right font-black text-green-600">
                          ${promesa.montoPromesa?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}