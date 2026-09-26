import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import SupervisionPanel from '../src/components/SupervisionPanel';

jest.mock('axios');
jest.mock('../src/components/DetalleVista', () => ({
  __esModule: true,
  default: ({ item }) =>
    item ? <div data-testid="detalle">{`Detalle de ${item.idGestion}`}</div> : null,
}));

const EQUIPO = [
  {
    empleado: { idEmpleado: 10, numeroEmpleado: 'S1G01', nombreCompleto: 'Verónica Castillo' },
    cuentasAsignadas: 12,
    saldoTotal: 40000.5,
    saldoMora1y2: 1000,
    saldoMora3y4: 2000,
    saldoMora5y6: 3000,
    gestiones: 5,
    promesas: 2,
    promocionesPendientes: 1,
    tickets: 3,
  },
  {
    empleado: { idEmpleado: 11, numeroEmpleado: 'S1G02', nombreCompleto: 'María Teresa Gil' },
    cuentasAsignadas: 8,
    saldoTotal: 15000,
    saldoMora1y2: 0,
    saldoMora3y4: 0,
    saldoMora5y6: 0,
    gestiones: 1,
    promesas: 0,
    promocionesPendientes: 0,
    tickets: 0,
  },
];

const GESTIONES = [
  {
    idGestion: 501,
    fechaRegistro: '2026-03-01T10:00:00Z',
    montoPromesa: 2500,
    estadoBonificacion: 'APLICADA',
    deuda: { numeroCuenta: 'CU-001', deudor: { nombreCompleto: 'Cliente Uno' } },
    concepto: { nombreConcepto: 'PROMESA' },
  },
  {
    idGestion: 502,
    fechaRegistro: '2026-03-02T10:00:00Z',
    montoPromesa: null,
    estadoBonificacion: 'RECHAZADA',
    deuda: { numeroCuenta: 'CU-002', deudor: { nombreCompleto: 'Cliente Dos' } },
    concepto: null,
    codigoResultado: 'NO_CONTACTO',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  axios.get.mockResolvedValue({ data: EQUIPO });
});

const filaDe = (nombre) => screen.getByText(nombre).closest('tr');

describe('SupervisionPanel: consulta', () => {
  it('pide el equipo del supervisor en el periodo mensual por defecto', async () => {
    render(<SupervisionPanel supervisorId={7} />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('/api/supervision/equipo', {
        params: { supervisorId: 7, periodo: 'MES' },
      }),
    );
  });

  it('vuelve a consultar al cambiar de periodo', async () => {
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    await usuario.click(screen.getByRole('button', { name: 'Hoy' }));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('/api/supervision/equipo', {
        params: { supervisorId: 7, periodo: 'HOY' },
      }),
    );
  });

  it('vuelve a consultar al refrescar a mano', async () => {
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    const llamadasIniciales = axios.get.mock.calls.length;

    await usuario.click(screen.getByRole('button', { name: /refrescar/i }));

    await waitFor(() => expect(axios.get.mock.calls.length).toBeGreaterThan(llamadasIniciales));
  });

  it('muestra el mensaje de error si el servidor no responde', async () => {
    axios.get.mockRejectedValue(new Error('500'));
    render(<SupervisionPanel supervisorId={7} />);

    expect(
      await screen.findByText('No se pudo consultar el equipo. Verifica la conexión con el servidor.'),
    ).toBeInTheDocument();
  });

  it('informa cuando el supervisor no tiene gestores', async () => {
    axios.get.mockResolvedValue({ data: [] });
    render(<SupervisionPanel supervisorId={7} />);

    expect(await screen.findByText('No tienes gestores asignados.')).toBeInTheDocument();
  });
});

describe('SupervisionPanel: indicadores', () => {
  it('consolida los totales del equipo', async () => {
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    // "Cuentas" tambien es un encabezado de la tabla, asi que se pide el <p> del indicador.
    const cuentas = screen.getByText('Cuentas', { selector: 'p' }).closest('div');
    const saldos = screen.getByText('Saldo total', { selector: 'p' }).closest('div');
    const gestiones = screen.getByText(/Gestiones · Mes/).closest('div');
    const promesas = screen.getByText(/Promesas · Mes/, { selector: 'p' }).closest('div');
    const pendientes = screen.getByText('Promos pend.').closest('div');
    const tickets = screen.getByText(/Tickets · Mes/).closest('div');

    expect(cuentas).toHaveTextContent('20');
    expect(saldos).toHaveTextContent('$55,000.50');
    expect(gestiones).toHaveTextContent('6');
    expect(promesas).toHaveTextContent('2');
    expect(pendientes).toHaveTextContent('1');
    expect(tickets).toHaveTextContent('3');
  });

  it('desglosa la mora por tramos en cada gestor', async () => {
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    const fila = filaDe('Verónica Castillo');
    expect(within(fila).getByText('$1,000.00')).toBeInTheDocument();
    expect(within(fila).getByText('$2,000.00')).toBeInTheDocument();
    expect(within(fila).getByText('$3,000.00')).toBeInTheDocument();
  });

  it('solo muestra el aviso de promociones pendientes cuando las hay', async () => {
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    expect(within(filaDe('Verónica Castillo')).getByText(/pend\./)).toBeInTheDocument();
    expect(within(filaDe('María Teresa Gil')).queryByText(/pend\./)).toBeNull();
  });
});

describe('SupervisionPanel: detalhe de gestiones', () => {
  it('abre el modal con las gestiones del gestor pulsado', async () => {
    axios.get
      .mockResolvedValueOnce({ data: EQUIPO })
      .mockResolvedValueOnce({ data: GESTIONES });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));

    expect(await screen.findByText('Gestiones de Verónica Castillo')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/gestiones', {
      params: { empleadoId: 10 },
    });
  });

  it('avisa cuando el gestor aun no tiene gestiones', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: [] });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));

    expect(await screen.findByText('Este gestor aún no registra gestiones.')).toBeInTheDocument();
  });

  it('muestra el monto de la promesa y el estado de la bonificacion', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: GESTIONES });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));
    await screen.findByText('Gestiones de Verónica Castillo');

    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('APLICADA')).toBeInTheDocument();
    expect(screen.getByText('RECHAZADA')).toBeInTheDocument();
  });

  it('usa el codigo de resultado cuando la gestion no tiene concepto', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: GESTIONES });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));

    expect(await screen.findByText(/NO_CONTACTO/)).toBeInTheDocument();
  });

  it('abre el detalle al pulsar una gestion y lo cierra con el atajo', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: GESTIONES });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));
    await screen.findByText('Gestiones de Verónica Castillo');

    const [primeraGestion] = await screen.findAllByTitle(/clic para ver la gesti/i);
    await usuario.click(primeraGestion);
    expect(await screen.findByTestId('detalle')).toHaveTextContent('Detalle de 501');

    // Ctrl+F2 alterna el detalle de la ultima gestion abierta.
    await usuario.keyboard('{Control>}{F2}{/Control}');
    await waitFor(() => expect(screen.queryByTestId('detalle')).toBeNull());

    await usuario.keyboard('{Control>}{F2}{/Control}');
    expect(await screen.findByTestId('detalle')).toBeInTheDocument();
  });

  it('abre el detalle tambien con la tecla Enter', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: GESTIONES });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));

    const [primeraGestion] = await screen.findAllByTitle(/clic para ver la gesti/i);
    primeraGestion.focus();
    await usuario.keyboard('{Enter}');

    expect(await screen.findByTestId('detalle')).toHaveTextContent('Detalle de 501');
  });

  it('cierra el modal con la X', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: GESTIONES });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));
    await screen.findByText('Gestiones de Verónica Castillo');

    await usuario.click(screen.getByRole('button', { name: '✕' }));

    expect(screen.queryByText('Gestiones de Verónica Castillo')).toBeNull();
  });

  it('cae en el texto generico cuando la gestion no tiene concepto ni codigo', async () => {
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({
      data: [{ idGestion: 900, fechaRegistro: '2026-03-03T10:00:00Z' }],
    });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));

    const [item] = await screen.findAllByTitle(/clic para ver la gesti/i);
    // El texto de la linea se parte en varios nodos, asi que se comprueba el contenedor.
    expect(item).toHaveTextContent('— Gestión');
  });

  it('avisa que hay que deslizar cuando el listado es largo', async () => {
    const muchas = Array.from({ length: 11 }, (_, i) => ({
      idGestion: 700 + i,
      fechaRegistro: '2026-03-01T10:00:00Z',
      deuda: { numeroCuenta: `CU-${i}`, deudor: { nombreCompleto: 'Cliente' } },
      concepto: { nombreConcepto: 'PROMESA' },
    }));
    axios.get.mockResolvedValueOnce({ data: EQUIPO }).mockResolvedValueOnce({ data: muchas });
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');
    await usuario.click(within(filaDe('Verónica Castillo')).getByRole('button', { name: /ver gestiones/i }));

    expect(await screen.findByText(/desliza/)).toBeInTheDocument();
  });

  it('no abre nada con Ctrl+F2 si nunca se abrio una gestion', async () => {
    const usuario = userEvent.setup();
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    await usuario.keyboard('{Control>}{F2}{/Control}');

    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('trata como cero los indicadores que el backend no envia', async () => {
    axios.get.mockResolvedValue({
      data: [{ empleado: { idEmpleado: 10, numeroEmpleado: 'S1G01', nombreCompleto: 'Verónica Castillo' } }],
    });
    render(<SupervisionPanel supervisorId={7} />);
    await screen.findByText('Verónica Castillo');

    expect(screen.getByText('Cuentas', { selector: 'p' }).closest('div')).toHaveTextContent('0');
    expect(screen.getByText('Saldo total', { selector: 'p' }).closest('div')).toHaveTextContent('$0.00');
    // Sin promesas no se muestra el badge de pendientes, y el de promesas va en gris.
    const fila = filaDe('Verónica Castillo');
    expect(within(fila).getByText(/promesas$/)).toHaveClass('text-slate-500');
  });
});
