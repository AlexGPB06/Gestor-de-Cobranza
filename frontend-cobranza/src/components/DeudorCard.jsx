import GestionForm from './GestionForm';

export default function DeudorCard({ deudor, deudas, gestiones, onGestionAgregada }) {
  const deudasDelDeudor = deudas.filter(d => d.deudor.idDeudor === deudor.idDeudor);

  return (
    <div className="bg-white shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl overflow-hidden border border-slate-200 flex flex-col">
      <div className="bg-slate-800 p-5 text-white">
        <h3 className="text-xl font-bold truncate">{deudor.nombreCompleto}</h3>
        <div className="mt-2 text-sm text-slate-300 space-y-1">
          <p><span className="font-semibold text-slate-400">Campaña:</span> {deudor.campana.nombreEmpresa}</p>
          <p><span className="font-semibold text-slate-400">Teléfono:</span> {deudor.telefonoPrincipal}</p>
        </div>
      </div>
      
      <div className="p-5 flex-grow bg-slate-50">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          Productos en Mora
        </h4>
        
        {deudasDelDeudor.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Sin deudas registradas.</p>
        ) : (
          <ul className="space-y-4">
            {deudasDelDeudor.map(deuda => {
              const gestionesDeLaDeuda = gestiones.filter(g => g.deuda && g.deuda.idDeuda === deuda.idDeuda);

              return (
                <li key={deuda.idDeuda} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm block">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-500">Cuenta:</span>
                    <span className="text-sm font-mono text-slate-700">{deuda.numeroCuenta}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                    <span className="text-sm font-bold text-slate-800">Saldo:</span>
                    <span className="text-base font-black text-red-600">
                      ${deuda.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {/* Pasamos el puente al formulario */}
                  <GestionForm deudaId={deuda.idDeuda} onGestionAgregada={onGestionAgregada} />

                  {gestionesDeLaDeuda.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Historial de Contacto</h5>
                      <ul className="space-y-2">
                        {gestionesDeLaDeuda.map(gestion => (
                          <li key={gestion.idGestion} className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
                            <div className="flex justify-between font-semibold text-slate-700 mb-1">
                              <span>{gestion.codigoResultado}</span>
                              <span className="text-slate-400">
                                {new Date(gestion.fechaRegistro).toLocaleDateString('es-MX')}
                              </span>
                            </div>
                            <p className="text-slate-600 italic">"{gestion.comentarios}"</p>
                            
                            {/* Si hay monto de promesa, lo mostramos en verde */}
                            {gestion.montoPromesa && (
                              <div className="mt-1 inline-block bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                Promesa: ${gestion.montoPromesa.toLocaleString('es-MX')} para el {gestion.fechaPromesa}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}