import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoGestion from '../src/components/InfoGestion';

jest.mock('../src/components/ClienteInfo', () => ({
  __esModule: true,
  default: ({ deudor }) => <div data-testid="panel-info">Info de {deudor.nombreCompleto}</div>,
}));
jest.mock('../src/components/GestionPanel', () => ({
  __esModule: true,
  default: ({ deudaSeleccionadaId }) => <div data-testid="panel-gestion">Gestion {deudaSeleccionadaId}</div>,
}));
jest.mock('../src/components/CXC_Pagos', () => ({
  __esModule: true,
  default: ({ deuda }) => <div data-testid="panel-pagos">Pagos de {deuda.numeroCuenta}</div>,
}));
jest.mock('../src/components/PromesasTab', () => ({
  __esModule: true,
  default: ({ onSubirTicket118 }) => (
    <button type="button" onClick={() => onSubirTicket118({ deuda: { idDeuda: 55 } })}>
      Escalar a Auditoria
    </button>
  ),
}));
jest.mock('../src/components/BonificacionesTab', () => ({
  __esModule: true,
  default: () => <div data-testid="panel-bonificaciones">Bonificaciones</div>,
}));
jest.mock('../src/components/TicketsTab', () => ({
  __esModule: true,
  default: ({ prefill, deudaSeleccionadaId }) => (
    <div data-testid="panel-tickets">
      Tickets {deudaSeleccionadaId} {prefill ? `prefill-${prefill.numero}-${prefill.idDeuda}` : 'sin-prefill'}
    </div>
  ),
}));

const DEUDOR = { idDeudor: 7, nombreCompleto: 'Verónica Castillo' };
const DEUDAS = [
  { idDeuda: 55, numeroCuenta: 'CU-055', deudor: { idDeudor: 7 } },
  { idDeuda: 56, numeroCuenta: 'CU-056', deudor: null, idDeudor: 7 },
  { idDeuda: 99, numeroCuenta: 'CU-099', deudor: { idDeudor: 8 } },
];

const onTerminoChange = jest.fn();
const onBuscar = jest.fn();
const limpiarSeleccion = jest.fn();
const onCambiarDeuda = jest.fn();
const setTab = jest.fn();

const base = (over = {}) => ({
  terminoBusqueda: '',
  onTerminoChange,
  onBuscar,
  mensajeBusqueda: '',
  deudorBuscado: null,
  limpiarSeleccion,
  deudas: DEUDAS,
  deudaSeleccionadaId: 55,
  onCambiarDeuda,
  gestos: undefined,
  conceptos: [],
  motivos: [],
  empleadoActual: { idEmpleado: 3 },
  onGestionAgregada: jest.fn(),
  pagos: [],
  tab: 'info',
  setTab,
  tiposPromesa: [],
  tickets: [],
  tiposTicket: [],
  onDatosActualizados: jest.fn(),
  ...over,
});

const renderizar = (over = {}) => render(<InfoGestion {...base(over)} />);
const pestana = (nombre) => screen.getByRole('button', { name: new RegExp(nombre) });

beforeEach(() => jest.clearAllMocks());

describe('InfoGestion: sin cliente', () => {
  it('invita a buscar una cuenta', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: 'Info/Gestión' })).toBeInTheDocument();
    expect(screen.getByText(/Introduce el número de cuenta/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tickets/ })).toBeNull();
  });
});

describe('InfoGestion: busqueda', () => {
  it('propaga la escritura y el envio del formulario', async () => {
    const usuario = userEvent.setup();
    const cambios = jest.fn();

    // Wrapper con estado real: el input es controlado y sin esto React
    // revierte el valor en cada tecla.
    const Envoltorio = () => {
      const [termino, setTermino] = useState('');
      return (
        <InfoGestion
          {...base({
            terminoBusqueda: termino,
            onTerminoChange: valor => {
              cambios(valor);
              setTermino(valor);
            },
          })}
        />
      );
    };

    render(<Envoltorio />);

    const campo = screen.getByPlaceholderText('Ej. TDC-456789');
    await usuario.type(campo, 'CU-055');

    expect(campo).toHaveValue('CU-055');
    expect(cambios).toHaveBeenLastCalledWith('CU-055');

    await usuario.click(screen.getByRole('button', { name: 'Buscar Expediente' }));
    expect(onBuscar).toHaveBeenCalled();
  });

  it('muestra el mensaje de error del backend', () => {
    renderizar({ mensajeBusqueda: 'No se encontró el expediente' });

    expect(screen.getByText('No se encontró el expediente')).toBeInTheDocument();
  });
});

describe('InfoGestion: cliente seleccionado', () => {
  it('muestra el banner y permite cambiar de cliente', async () => {
    const usuario = userEvent.setup();
    renderizar({ deudorBuscado: DEUDOR });

    expect(screen.getByText(/Cliente seleccionado: Verónica Castillo/)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Cambiar cliente' }));
    expect(limpiarSeleccion).toHaveBeenCalled();
  });

  it('ofrece las seis pestanas y avisa el cambio', async () => {
    const usuario = userEvent.setup();
    renderizar({ deudorBuscado: DEUDOR });

    for (const nombre of ['Info', 'Gestión', 'CXC/PAGOS', 'Promesas', 'Bonificaciones', 'Tickets']) {
      expect(pestana(nombre)).toBeInTheDocument();
    }

    await usuario.click(pestana('Bonificaciones'));
    expect(setTab).toHaveBeenCalledWith('bonificaciones');
  });
});

describe('InfoGestion: navegacion por pestanas', () => {
  it('resalta la pestana activa', () => {
    renderizar({ deudorBuscado: DEUDOR, tab: 'pagos' });

    expect(pestana('CXC/PAGOS')).toHaveClass('bg-blue-600', 'text-white');
    expect(pestana('Info')).toHaveClass('bg-slate-200');
  });

  it('monta ClienteInfo en la pestana info', () => {
    renderizar({ deudorBuscado: DEUDOR, tab: 'info' });

    expect(screen.getByTestId('panel-info')).toHaveTextContent('Info de Verónica Castillo');
  });

  it.each([
    ['gestion', 'panel-gestion'],
    ['pagos', 'panel-pagos'],
    ['bonificaciones', 'panel-bonificaciones'],
  ])('monta su panel en la pestana %s', (tab, testid) => {
    renderizar({ deudorBuscado: DEUDOR, tab });

    expect(screen.getByTestId(testid)).toBeInTheDocument();
  });

  it('elige la deuda seleccionada entre las del deudor', () => {
    renderizar({ deudorBuscado: DEUDOR, tab: 'pagos', deudaSeleccionadaId: 56 });

    expect(screen.getByTestId('panel-pagos')).toHaveTextContent('Pagos de CU-056');
  });

  it('cae a la primera deuda cuando la seleccionada no pertenece al deudor', () => {
    renderizar({ deudorBuscado: DEUDOR, tab: 'pagos', deudaSeleccionadaId: 99 });

    expect(screen.getByTestId('panel-pagos')).toHaveTextContent('Pagos de CU-055');
  });

  it('omite el panel de gestion si el deudor no tiene deudas', () => {
    renderizar({ deudorBuscado: { idDeudor: 42, nombreCompleto: 'Sin Deudas' }, tab: 'gestion', deudas: [] });

    expect(screen.queryByTestId('panel-gestion')).toBeNull();
  });
});

describe('InfoGestion: escalamiento a Auditoria', () => {
  it('prepara el ticket 118 y salta a la pestana de tickets', async () => {
    const usuario = userEvent.setup();
    renderizar({ deudorBuscado: DEUDOR, tab: 'promesas' });

    await usuario.click(screen.getByRole('button', { name: 'Escalar a Auditoria' }));

    expect(setTab).toHaveBeenCalledWith('tickets');
  });

  it('entrega el prefill a TicketsTab cuando ya se esta en esa pestana', () => {
    renderizar({ deudorBuscado: DEUDOR, tab: 'tickets' });

    expect(screen.getByTestId('panel-tickets')).toHaveTextContent('sin-prefill');
  });

  it('monta TicketsTab con el prefill 118 tras escalar', async () => {
    const usuario = userEvent.setup();
    const { rerender } = renderizar({ deudorBuscado: DEUDOR, tab: 'promesas' });

    await usuario.click(screen.getByRole('button', { name: 'Escalar a Auditoria' }));

    // setTab es un mock, asi que el cambio de pestana se simula a mano.
    rerender(<InfoGestion {...base({ deudorBuscado: DEUDOR, tab: 'tickets' })} />);

    expect(screen.getByTestId('panel-tickets')).toHaveTextContent('prefill-118-55');
  });
});
