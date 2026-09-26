import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DetalleVista from '../src/components/DetalleVista';

const GESTION = {
  idGestion: 1,
  fechaRegistro: '2026-03-01T10:30:00Z',
  empleado: { idEmpleado: 5, nombreCompleto: 'Verónica Castillo' },
  deuda: { numeroCuenta: 'CU-001' },
  concepto: { nombreConcepto: 'PROMESA' },
  motivoNoPago: { descripcion: 'Falta de fondos' },
  montoPromesa: 1500,
  fechaPromesa: '2026-03-05',
  tipoPromesa: { nombre: 'Parcial' },
  montoPagado: 500,
  numeroMarcado: 3,
  tipoTelefonoMarcado: 'Celular',
  estadoBonificacion: 'APLICADA',
  comentarios: 'Cliente paga por transferencia',
};

const TICKET = {
  numero: 'TK-9',
  asunto: 'No reconocen el cargo',
  fechaCreacion: '2026-03-02T09:00:00Z',
  departamento: { nombre: 'Cobranza' },
  estado: 'ABIERTO',
  empleadoOrigen: { idEmpleado: 9, nombreCompleto: 'María Teresa Gil' },
  deuda: { numeroCuenta: 'CU-002' },
  descripcion: 'El cliente disputa el cargo',
};

const cerrar = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe('DetalleVista: visibilidad', () => {
  it('no pinta nada si no hay item', () => {
    const { container } = render(<DetalleVista item={null} tipo="gestion" onCerrar={cerrar} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('DetalleVista: gestion', () => {
  it('muestra el encabezado con el concepto', () => {
    render(<DetalleVista item={GESTION} tipo="gestion" onCerrar={cerrar} />);

    expect(screen.getByRole('heading', { name: 'PROMESA' })).toBeInTheDocument();
    expect(screen.getAllByText('PROMESA')).toHaveLength(2);
    expect(screen.getAllByText('CU-001')).toHaveLength(2);
  });

  it('cae en el codigo de resultado cuando no hay concepto', () => {
    render(
      <DetalleVista
        item={{ ...GESTION, concepto: null, codigoResultado: 'NO_CONTACTO' }}
        tipo="gestion"
        onCerrar={cerrar}
      />,
    );

    expect(screen.getByRole('heading', { name: 'NO_CONTACTO' })).toBeInTheDocument();
  });

  it('usa el texto generico si no hay concepto ni codigo', () => {
    render(
      <DetalleVista item={{ ...GESTION, concepto: null }} tipo="gestion" onCerrar={cerrar} />,
    );

    expect(screen.getByRole('heading', { name: 'Gestión' })).toBeInTheDocument();
  });

  it('lista los campos de la gestion', () => {
    render(<DetalleVista item={GESTION} tipo="gestion" onCerrar={cerrar} />);

    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
    expect(screen.getByText('Falta de fondos')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('2026-03-05')).toBeInTheDocument();
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('3 (Celular)')).toBeInTheDocument();
  });

  it('usa el id del empleado cuando no viene el nombre', () => {
    render(
      <DetalleVista
        item={{ ...GESTION, empleado: { idEmpleado: 77 } }}
        tipo="gestion"
        onCerrar={cerrar}
      />,
    );

    expect(screen.getByText('ID 77')).toBeInTheDocument();
  });

  it('omite monto, fecha y marcado cuando la gestion no los tiene', () => {
    render(
      <DetalleVista
        item={{ ...GESTION, montoPromesa: null, fechaPromesa: null, montoPagado: 0, numeroMarcado: null }}
        tipo="gestion"
        onCerrar={cerrar}
      />,
    );

    expect(screen.queryByText('Monto prometido')).toBeNull();
    expect(screen.queryByText('Fecha de la promesa')).toBeNull();
    expect(screen.queryByText('Cantidad pagada')).toBeNull();
    expect(screen.queryByText('Marcó')).toBeNull();
  });

  it('traduce cada estado de bonificacion a su color', () => {
    const { rerender } = render(
      <DetalleVista item={{ ...GESTION, estadoBonificacion: 'APROBADA' }} tipo="gestion" onCerrar={cerrar} />,
    );
    expect(screen.getByText('APROBADA')).toHaveClass('bg-blue-500');

    rerender(
      <DetalleVista item={{ ...GESTION, estadoBonificacion: 'RECHAZADA' }} tipo="gestion" onCerrar={cerrar} />,
    );
    expect(screen.getByText('RECHAZADA')).toHaveClass('bg-red-500');

    rerender(
      <DetalleVista item={{ ...GESTION, estadoBonificacion: 'PENDIENTE' }} tipo="gestion" onCerrar={cerrar} />,
    );
    expect(screen.getByText('PENDIENTE')).toHaveClass('bg-amber-500');
  });

  it('no muestra insignia de bonificacion si la gestion no tiene estado', () => {
    render(
      <DetalleVista item={{ ...GESTION, estadoBonificacion: null }} tipo="gestion" onCerrar={cerrar} />,
    );

    expect(screen.queryByText(/Bonificación aplicada/)).toBeNull();
  });
});

describe('DetalleVista: ticket', () => {
  it('muestra el encabezado del ticket con su numero y asunto', () => {
    render(<DetalleVista item={TICKET} tipo="ticket" onCerrar={cerrar} />);

    expect(
      screen.getByRole('heading', { name: /Ticket #TK-9 — No reconocen el cargo/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cobranza')).toBeInTheDocument();
    expect(screen.getByText('ABIERTO')).toBeInTheDocument();
  });

  it('colorea el estado del ticket segun su valor', () => {
    const { rerender } = render(<DetalleVista item={TICKET} tipo="ticket" onCerrar={cerrar} />);
    expect(screen.getByText('ABIERTO')).toHaveClass('bg-amber-100', 'text-amber-800');

    rerender(<DetalleVista item={{ ...TICKET, estado: 'APLICADA' }} tipo="ticket" onCerrar={cerrar} />);
    expect(screen.getByText('APLICADA')).toHaveClass('bg-green-100', 'text-green-800');

    rerender(<DetalleVista item={{ ...TICKET, estado: 'APROBADA' }} tipo="ticket" onCerrar={cerrar} />);
    expect(screen.getByText('APROBADA')).toHaveClass('bg-blue-100', 'text-blue-800');

    rerender(<DetalleVista item={{ ...TICKET, estado: 'RECHAZADA' }} tipo="ticket" onCerrar={cerrar} />);
    expect(screen.getByText('RECHAZADA')).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('usa la descripcion del ticket como texto', () => {
    render(<DetalleVista item={TICKET} tipo="ticket" onCerrar={cerrar} />);

    expect(screen.getByText('El cliente disputa el cargo')).toBeInTheDocument();
  });

  it('usa el id del origen cuando no viene el nombre', () => {
    render(
      <DetalleVista
        item={{ ...TICKET, empleadoOrigen: { idEmpleado: 42 } }}
        tipo="ticket"
        onCerrar={cerrar}
      />,
    );

    expect(screen.getByText('ID 42')).toBeInTheDocument();
  });
});

describe('DetalleVista: texto y cierre', () => {
  it('prefiere comentarios y cae a la descripcion y luego al guion', () => {
    const { rerender } = render(<DetalleVista item={GESTION} tipo="gestion" onCerrar={cerrar} />);
    expect(screen.getByText('Cliente paga por transferencia')).toBeInTheDocument();

    rerender(
      <DetalleVista
        item={{ ...GESTION, comentarios: null, descripcion: 'Acordo por telefone' }}
        tipo="gestion"
        onCerrar={cerrar}
      />,
    );
    expect(screen.getByText('Acordo por telefone')).toBeInTheDocument();
    expect(screen.queryByText('Cliente paga por transferencia')).toBeNull();
  });

  it('muestra el guion cuando no hay texto de ningun tipo', () => {
    render(
      <DetalleVista
        item={{ ...GESTION, comentarios: null, descripcion: null }}
        tipo="gestion"
        onCerrar={cerrar}
      />,
    );

    expect(screen.getByText('— Sin texto —')).toBeInTheDocument();
  });

  it('cierra con la X y con el clic en el fondo', async () => {
    const usuario = userEvent.setup();
    const { container } = render(<DetalleVista item={GESTION} tipo="gestion" onCerrar={cerrar} />);

    await usuario.click(screen.getByTitle(/cerrar/i));
    expect(cerrar).toHaveBeenCalledTimes(1);

    const fondo = container.firstChild;
    await usuario.click(fondo);
    expect(cerrar).toHaveBeenCalledTimes(2);
  });

  it('no cierra al pulsar dentro del recuadro blanco', async () => {
    const usuario = userEvent.setup();
    render(<DetalleVista item={GESTION} tipo="gestion" onCerrar={cerrar} />);

    const tarjeta = screen.getByRole('heading', { name: 'PROMESA' }).closest('div.overflow-hidden');
    await usuario.click(within(tarjeta).getByText('Cliente paga por transferencia'));

    expect(cerrar).not.toHaveBeenCalled();
  });
});
