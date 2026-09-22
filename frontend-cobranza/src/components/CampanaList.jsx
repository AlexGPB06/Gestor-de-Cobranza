export default function CampanaList({ campanas }) {
  if (campanas.length === 0) {
    return <p className="text-slate-500 italic">Cargando datos desde Java...</p>;
  }

  return (
    <div className="grid gap-4">
      {campanas.map(campana => (
        <div 
          key={campana.idCampana} 
          className="bg-white border-l-4 border-blue-600 shadow-sm rounded-r-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-800">{campana.nombreEmpresa}</h3>
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold">Días máximos para promesa:</span> {campana.diasMaximosPromesa} días
            </p>
          </div>
          <span className={`mt-3 sm:mt-0 px-3 py-1 text-xs font-bold rounded-full ${campana.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {campana.activo ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      ))}
    </div>
  );
}