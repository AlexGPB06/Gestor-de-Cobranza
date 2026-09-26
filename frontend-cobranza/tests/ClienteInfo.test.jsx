import { render, screen } from '@testing-library/react';
import ClienteInfo from '../src/components/ClienteInfo';

const DEUDOR = {
  idDeudor: 7,
  nombreCompleto: 'Verónica Castillo',
  documentoIdentidad: '0801-1990-1234',
  correoElectronico: 'veronica.castillo@correo.com',
  campana: { nombreEmpresa: 'Banco del Sur' },
  telefonos: [
    { numeroTelefono: '0991234567', tipoTelefono: 'Celular', estatus: 'Efectivo' },
    { numeroTelefono: '0997654321', tipoTelefono: 'Fijo', estatus: 'Equivocado' },
    { numeroTelefono: '0990000000', tipoTelefono: 'Trabajo', estatus: 'Sin marcar' },
  ],
};

const DEUDA = {
  idDeuda: 100,
  numeroCuenta: 'CU-100',
  saldoPendiente: 2500.5,
  montoOriginal: 3000,
  fechaVencimiento: '2025-09-15',
  tipoProducto: { nombreProducto: 'Credito Rotativo' },
  deudor: { idDeudor: 7 },
};

const renderizar = (deudor = DEUDOR, deudas = [DEUDA]) =>
  render(<ClienteInfo deudor={deudor} deudas={deudas} />);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ClienteInfo: datos esenciales', () => {
  it('muestra los datos del cliente y sus encabezados', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: /Datos Esenciales del Cliente/ })).toBeInTheDocument();
    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
    expect(screen.getByText('0801-1990-1234')).toBeInTheDocument();
    expect(screen.getByText('veronica.castillo@correo.com')).toBeInTheDocument();
    expect(screen.getByText('Banco del Sur')).toBeInTheDocument();
  });

  it('cae a N/D cuando faltan documento, correo y campana', () => {
    renderizar({ ...DEUDOR, documentoIdentidad: null, correoElectronico: null, campana: null });

    expect(screen.getAllByText('N/D')).toHaveLength(3);
  });
});

describe('ClienteInfo: telefonos', () => {
  it('lista los telefonos con su tipo y colorea el estatus', () => {
    renderizar();

    expect(screen.getByText('Teléfonos de Contacto')).toBeInTheDocument();
    expect(screen.getByText('0991234567')).toBeInTheDocument();
    expect(screen.getByText('0997654321')).toBeInTheDocument();

    expect(screen.getByText('Efectivo')).toHaveClass('bg-green-100', 'text-green-800');
    expect(screen.getByText('Equivocado')).toHaveClass('bg-red-100', 'text-red-800');
    expect(screen.getByText('Sin marcar')).toHaveClass('bg-slate-100', 'text-slate-600');
  });

  it('arma un telefono principal cuando no hay lista', () => {
    renderizar({ ...DEUDOR, telefonos: [], telefonoPrincipal: '0988776655' });

    expect(screen.getByText('0988776655')).toBeInTheDocument();
    expect(screen.getByText('Sin marcar')).toBeInTheDocument();
  });

  it('omite el bloque de telefonos cuando no hay ninguno', () => {
    renderizar({ ...DEUDOR, telefonos: [], telefonoPrincipal: null });

    expect(screen.queryByText('Teléfonos de Contacto')).toBeNull();
  });
});

describe('ClienteInfo: productos con adeudo', () => {
  it('avisa cuando el cliente no tiene productos', () => {
    renderizar(DEUDOR, []);

    expect(screen.getByText('El cliente no tiene productos registrados.')).toBeInTheDocument();
  });

  it('filtra las deudas por deudor anidado o por id plano', () => {
    renderizar(DEUDOR, [
      DEUDA,
      { ...DEUDA, idDeuda: 101, numeroCuenta: 'CU-101', deudor: null, idDeudor: 7 },
      { ...DEUDA, idDeuda: 102, numeroCuenta: 'CU-102', deudor: { idDeudor: 99 } },
    ]);

    expect(screen.getByText('CU-100')).toBeInTheDocument();
    expect(screen.getByText('CU-101')).toBeInTheDocument();
    expect(screen.queryByText('CU-102')).toBeNull();
  });

  it('muestra saldo, mora, monto original y vencimiento', () => {
    renderizar();

    expect(screen.getByText('CU-100')).toBeInTheDocument();
    expect(screen.getByText('Credito Rotativo')).toBeInTheDocument();
    expect(screen.getByText('EN MORA')).toBeInTheDocument();
    expect(screen.getByText('$2,500.50')).toBeInTheDocument();
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
    expect(screen.getByText('2025-09-15')).toBeInTheDocument();
    expect(screen.getByText('6 meses')).toBeInTheDocument();
  });

  it('marca como liquidado cuando no hay saldo pendiente', () => {
    renderizar(DEUDOR, [{ ...DEUDA, saldoPendiente: 0, fechaVencimiento: '2026-12-01' }]);

    expect(screen.getByText('LIQUIDADO')).toBeInTheDocument();
    expect(screen.getByText('Al corriente')).toBeInTheDocument();
  });

  it('usa Sin tipo cuando la deuda no trae tipo de producto', () => {
    renderizar(DEUDOR, [{ ...DEUDA, tipoProducto: null }]);

    expect(screen.getByText('Sin tipo')).toBeInTheDocument();
  });

  it('cae a $0.00 cuando el monto no es numerico', () => {
    renderizar(DEUDOR, [{ ...DEUDA, saldoPendiente: 'mucho', montoOriginal: 'poco' }]);

    expect(screen.getAllByText('$0.00')).toHaveLength(2);
  });
});

describe('ClienteInfo: meses de mora', () => {
  it('usa singular para un mes exacto', () => {
    renderizar(DEUDOR, [{ ...DEUDA, fechaVencimiento: '2026-02-15' }]);

    expect(screen.getByText('1 mes')).toBeInTheDocument();
  });

  it('descuenta un mes cuando el dia de vencimiento aun no cae', () => {
    renderizar(DEUDOR, [{ ...DEUDA, fechaVencimiento: '2025-12-20' }]);

    expect(screen.getByText('2 meses')).toBeInTheDocument();
  });

  it('nunca baja de cero en el mismo mes', () => {
    renderizar(DEUDOR, [{ ...DEUDA, fechaVencimiento: '2026-03-20' }]);

    expect(screen.getByText('Al corriente')).toBeInTheDocument();
  });

  it('devuelve cero sin fecha o con fecha invalida', () => {
    const { unmount } = renderizar(DEUDOR, [{ ...DEUDA, fechaVencimiento: null }]);
    expect(screen.getByText('Al corriente')).toBeInTheDocument();
    unmount();

    renderizar(DEUDOR, [{ ...DEUDA, fechaVencimiento: 'no-es-fecha' }]);
    expect(screen.getByText('Al corriente')).toBeInTheDocument();
  });
});
