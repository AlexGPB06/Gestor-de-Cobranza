export default function CampanaList({ campanas }) {
  if (campanas.length === 0) {
    return <p>Cargando datos desde Java...</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {campanas.map(campana => (
        <li 
          key={campana.idCampana} 
          style={{ background: '#f4f4f4', margin: '10px 0', padding: '15px', borderRadius: '5px', color: '#333' }}
        >
          <strong>Empresa: </strong> {campana.nombreEmpresa} <br/>
          <strong>Días máximos para promesa: </strong> {campana.diasMaximosPromesa} días <br/>
          <strong>Estado: </strong> {campana.activo ? 'Activa' : 'Inactiva'}
        </li>
      ))}
    </ul>
  );
}