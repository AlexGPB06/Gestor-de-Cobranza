import { useState, useEffect } from 'react';
import axios from 'axios';
import DeudorCard from './components/DeudorCard';
import CampanaList from './components/CampanaList';

function App() {
  const [campanas, setCampanas] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [gestiones, setGestiones] = useState([]);

  // Separamos esta función para poder llamarla cada vez que se guarde una nueva gestión
  const cargarGestiones = () => {
    axios.get('http://localhost:8080/api/gestiones')
      .then(response => setGestiones(response.data))
      .catch(error => console.error("Error en gestiones:", error));
  };

  useEffect(() => {
    axios.get('http://localhost:8080/api/campanas')
      .then(response => setCampanas(response.data))
      .catch(error => console.error("Error en campañas:", error));

    axios.get('http://localhost:8080/api/deudores')
      .then(response => setDeudores(response.data))
      .catch(error => console.error("Error en deudores:", error));

    axios.get('http://localhost:8080/api/deudas')
      .then(response => setDeudas(response.data))
      .catch(error => console.error("Error en deudas:", error));

    cargarGestiones(); // Carga inicial al abrir la página
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        <h1 className="text-4xl font-extrabold text-center text-slate-800 tracking-tight">
          Sistema de Cobranza BPO
        </h1>
        
        <section>
          <h2 className="text-2xl font-bold text-slate-700 mb-4 border-b-2 border-slate-200 pb-2">Portafolios Asignados</h2>
          <CampanaList campanas={campanas} />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-700 mb-4 border-b-2 border-slate-200 pb-2">Cartera Activa</h2>
          {deudores.length === 0 ? (
            <p className="text-slate-500 italic">Cargando deudores...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deudores.map(deudor => (
                <DeudorCard 
                  key={deudor.idDeudor} 
                  deudor={deudor} 
                  deudas={deudas} 
                  gestiones={gestiones}
                  onGestionAgregada={cargarGestiones} // Pasamos la función como puente
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;