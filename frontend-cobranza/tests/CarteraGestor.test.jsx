import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CarteraGestor from '../src/components/CarteraGestor';

const DIA = 1000 * 60 * 60 * 24;
const hace = (dias) => new Date(Date.now() - dias * DIA).toISOString();

const asignacion = (id, numeroCuenta, nombreCompleto, saldoPendiente, fechaAsignacion, extra = {}) => ({
  idAsignacion: id,
  fechaAsignacion,
  estatusActiva: true,
  deuda: {
    idDeuda: 1000 + id,
    numeroCuenta,
    saldoPendiente,
    deudor: nombreCompleto === null ? null : { nombreCompleto, documentoIdentidad: '0801-1990-1234' },
    tipoProducto: { nombreProducto: 'Credito Rotativo' },
  },
  ...extra,
});

const A1 = asignacion(1, 'CU-001', 'Verónica Castillo', 1500, hace(5));
const A2 = asignacion(2, 'CU-002', 'Carlos Mendoza', 2500.5, hace(1));
const A3 = asignacion(3, 'CU-003', 'Ana Torres', 0, hace(3));

const seleccionar = jest.fn();

beforeEach(() => jest.clearAllMocks());

const tarjetaDe = (numeroCuenta) => screen.getByText(numeroCuenta).closest('.bg-white.rounded-xl');

describe('CarteraGestor: resumen', () => {
  it('cuenta cuentas, filtrado y saldo total', () => {
    render(<CarteraGestor asignaciones={[A1, A2, A3]} onSeleccionar={seleccionar} />);

    expect(screen.getByRole('heading', { name: 'Mi Cartera' })).toBeInTheDocument();
    expect(screen.getByText('Cuentas Asignadas').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Cuentas en Pantalla').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Saldo Total (en pantalla)').nextSibling).toHaveTextContent('$4,000.50');
  });

  it('excluye asignaciones inactivas o sin deuda', () => {
    render(
      <CarteraGestor
        asignaciones={[A1, { ...A2, estatusActiva: false }, { ...A3, deuda: null }]}
        onSeleccionar={seleccionar}
      />,
    );

    expect(screen.getByText('Cuentas Asignadas').nextSibling).toHaveTextContent('1');
    expect(screen.queryByText('CU-002')).toBeNull();
    expect(screen.queryByText('CU-003')).toBeNull();
  });

  it('trata un saldo no numerico como cero', () => {
    render(
      <CarteraGestor
        asignaciones={[asignacion(4, 'CU-004', 'Luis Paz', 'mucho', hace(2))]}
        onSeleccionar={seleccionar}
      />,
    );

    expect(screen.getByText('Saldo Total (en pantalla)').nextSibling).toHaveTextContent('$0.00');
  });
});

describe('CarteraGestor: filtrado', () => {
  it('filtra por numero de cuenta, cliente o tipo de producto', async () => {
    const usuario = userEvent.setup();
    render(<CarteraGestor asignaciones={[A1, A2, A3]} onSeleccionar={seleccionar} />);

    const filtro = screen.getByPlaceholderText(/Filtrar por número de cuenta/);

    await usuario.type(filtro, 'CU-002');
    expect(screen.queryByText('CU-001')).toBeNull();
    expect(screen.getByText('CU-002')).toBeInTheDocument();

    await usuario.clear(filtro);
    await usuario.type(filtro, 'mendoza');
    expect(screen.getByText('CU-002')).toBeInTheDocument();
    expect(screen.queryByText('CU-003')).toBeNull();

    await usuario.clear(filtro);
    await usuario.type(filtro, 'rotativo');
    expect(screen.getByText('Cuentas en Pantalla').nextSibling).toHaveTextContent('3');
  });

  it('avisa cuando nada coincide con el filtro', async () => {
    const usuario = userEvent.setup();
    render(<CarteraGestor asignaciones={[A1]} onSeleccionar={seleccionar} />);

    await usuario.type(screen.getByPlaceholderText(/Filtrar por número de cuenta/), 'zzz');

    expect(screen.getByText('Ninguna cuenta coincide con el filtro.')).toBeInTheDocument();
  });

  it('avisa cuando no hay cuentas asignadas', () => {
    render(<CarteraGestor asignaciones={[]} onSeleccionar={seleccionar} />);

    expect(screen.getByText('Aún no tienes cuentas asignadas.')).toBeInTheDocument();
  });
});

describe('CarteraGestor: tarjetas', () => {
  it('ordena por fecha de asignacion descendente', () => {
    render(<CarteraGestor asignaciones={[A1, A2, A3]} onSeleccionar={seleccionar} />);

    const cuentas = screen.getAllByText(/^CU-\d{3}$/).map(n => n.textContent);
    expect(cuentas).toEqual(['CU-002', 'CU-003', 'CU-001']);
  });

  it('cae a textos por defecto cuando faltan deudor y tipo', () => {
    const sinDatos = asignacion(7, 'CU-007', null, 0, hace(2));
    sinDatos.deuda.tipoProducto = null;
    render(<CarteraGestor asignaciones={[sinDatos]} onSeleccionar={seleccionar} />);

    const tarjeta = tarjetaDe('CU-007');
    expect(within(tarjeta).getByText('Sin cliente')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Sin tipo')).toBeInTheDocument();
    expect(tarjeta).toHaveTextContent('Sin identificación');
  });

  it('pinta el saldo en verde cuando esta liquidado y en rojo cuando no', () => {
    render(<CarteraGestor asignaciones={[A1, A3]} onSeleccionar={seleccionar} />);

    expect(within(tarjetaDe('CU-003')).getByText('$0.00')).toHaveClass('text-green-600');
    expect(within(tarjetaDe('CU-001')).getByText('$1,500.00')).toHaveClass('text-red-600');
  });

  it('calcula los dias desde la asignacion', () => {
    render(
      <CarteraGestor
        asignaciones={[
          asignacion(5, 'CU-005', 'Rosa Paz', 100, hace(1)),
          asignacion(6, 'CU-006', 'Luis Diaz', 100, hace(4)),
          asignacion(8, 'CU-008', 'Ana Sol', 100, 'invalida'),
        ]}
        onSeleccionar={seleccionar}
      />,
    );

    expect(tarjetaDe('CU-005')).toHaveTextContent('Asignada hace 1 día');
    expect(tarjetaDe('CU-006')).toHaveTextContent('Asignada hace 4 días');
    expect(tarjetaDe('CU-008')).toHaveTextContent('Asignada hace —');
  });

  it('entrega el deudor y la deuda al pulsar Gestionar Ahora', async () => {
    const usuario = userEvent.setup();
    render(<CarteraGestor asignaciones={[A1, A2]} onSeleccionar={seleccionar} />);

    await usuario.click(within(tarjetaDe('CU-002')).getByRole('button', { name: /Gestionar Ahora/ }));

    expect(seleccionar).toHaveBeenCalledTimes(1);
    expect(seleccionar).toHaveBeenCalledWith(A2.deuda.deudor, A2.deuda.idDeuda);
  });
});
