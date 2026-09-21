import { useState, useEffect } from 'react';
import axios from 'axios';
import DeudorCard from './components/DeudorCard';
import CampanaList from './components/CampanaList';

function App() {
  const [campanas, setCampanas] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [deudas, setDeudas] = useState([]);

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
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Sistema de Cobranza BPO</h1>
      
      <h2>Portafolios Asignados</h2>
      <CampanaList campanas={campanas} />

      <h2>Cartera Activa</h2>
      {deudores.length === 0 ? (
        <p>Cargando deudores...</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {deudores.map(deudor => (
            <DeudorCard key={deudor.idDeudor} deudor={deudor} deudas={deudas} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;