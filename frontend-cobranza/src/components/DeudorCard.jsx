export default function DeudorCard({ deudor, deudas }) {
  const deudasDelDeudor = deudas.filter(d => d.deudor.idDeudor === deudor.idDeudor);

  return (
    <div style={{ background: '#2c3e50', padding: '15px', borderRadius: '8px', color: '#ecf0f1' }}>
      <h3 style={{ margin: '0 0 10px 0' }}>{deudor.nombreCompleto}</h3>
      <p style={{ margin: '5px 0' }}><strong>Campaña:</strong> {deudor.campana.nombreEmpresa}</p>
      <p style={{ margin: '5px 0' }}><strong>Teléfono Principal:</strong> {deudor.telefonoPrincipal}</p>
      
      <h4 style={{ marginTop: '15px', borderBottom: '1px solid #7f8c8d', paddingBottom: '5px' }}>
        Productos en Mora
      </h4>
      
      {deudasDelDeudor.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#bdc3c7' }}>Sin deudas registradas.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {deudasDelDeudor.map(deuda => (
            <li 
              key={deuda.idDeuda} 
              style={{ background: '#34495e', margin: '5px 0', padding: '10px', borderRadius: '4px' }}
            >
              <strong>Cuenta:</strong> {deuda.numeroCuenta} <br/>
              <strong style={{ color: '#e74c3c' }}>
                Saldo Pendiente: 
              </strong> ${deuda.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}