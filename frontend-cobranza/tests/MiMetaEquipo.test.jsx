import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MiMetaEquipo from '../src/components/MiMetaEquipo';

jest.mock('axios');
jest.mock('../src/components/DetalleVista', () => ({
  __esModule: true,
  default: ({ item, onCerrar }) =>
    item ? (
      <div data-testid="detalle">
        Detalle {item.idGestion}
        <button type="button" onClick={onCerrar}>
          Cerrar detalle
        </button>
      </div>
    ) : null,
}));

const ahoraISO = () => new Date().toISOString();
const enDiasFecha = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EQUIPO_TODO = [
  { cuentasAsignadas: 10, saldoTotal: 50000 },
  { cuentasAsignadas: 5, saldoTotal: 25000 },
  {},
];
const EQUIPO_MES = [
  { gestiones: 20, promesas: 5 },
  { gestiones: undefined, promesas: undefined },
];

const promesa = (over = {}) => ({
  idGestion: 1,
  fechaRegistro: ahoraISO(),
  montoPromesa: 1000,
  fechaPromesa: enDiasFecha(30),
  deuda: { numeroCuenta: 'CU-055', deudor: { nombreCompleto: 'Verónica Castillo' } },
  ...over,
});

const PROMESAS = [
  promesa({ idGestion: 1, montoPromesa: 1000, fechaPromesa: enDiasFecha(30) }),
  promesa({ idGestion: 2, montoPromesa: 2000, fechaPromesa: enDiasFecha(10) }),
  promesa({ idGestion: 3, montoPromesa: 3000, fechaPromesa: enDiasFecha(-5) }),
  promesa({ idGestion: 4, montoPromesa: undefined, fechaPromesa: enDiasFecha(-20) }),
  promesa({ idGestion: 5, montoPromesa: 5000, fechaPromesa: null }),
  promesa({ idGestion: 6, montoPromesa: 6000, fechaRegistro: '2020-01-15T10:00:00Z', fechaPromesa: enDiasFecha(40) }),
  promesa({ idGestion: 7, montoPromesa: 'mucho', fechaRegistro: 'no-es-fecha', fechaPromesa: enDiasFecha(50) }),
];

const responder = (todo = EQUIPO_TODO, mes = EQUIPO_MES, promesas = PROMESAS) => {
  axios.get.mockImplementation((url, { params } = {}) => {
    if (url.includes('/equipo') && params?.periodo === 'MES') return Promise.resolve({ data: mes });
    if (url.includes('/equipo')) return Promise.resolve({ data: todo });
    return Promise.resolve({ data: promesas });
  });
};

const renderizar = (supervisorId = 9) => render(<MiMetaEquipo supervisorId={supervisorId} />);

beforeEach(() => jest.clearAllMocks());

describe('MiMetaEquipo: carga', () => {
  it('muestra el estado de carga y pide los tres endpoints', async () => {
    responder();
    renderizar();

    expect(screen.getByText('Calculando la meta del equipo...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());

    expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/api/supervision/equipo', {
      params: { supervisorId: 9 },
    });
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/api/supervision/equipo', {
      params: { supervisorId: 9, periodo: 'MES' },
    });
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/api/supervision/promesas', {
      params: { supervisorId: 9 },
    });
  });

  it('avisa cuando el servidor no responde', async () => {
    axios.get.mockRejectedValue(new Error('network down'));
    renderizar();

    expect(await screen.findByText('No se pudo consultar la meta del equipo.')).toBeInTheDocument();
  });

  it('recarga al refrescar y limpia el error anterior', async () => {
    const usuario = userEvent.setup();
    axios.get.mockRejectedValueOnce(new Error('network down'));
    // Las dos llamadas restantes de la primera ronda tambien fallan.
    axios.get.mockRejectedValue(new Error('network down'));
    renderizar();
    await screen.findByText('No se pudo consultar la meta del equipo.');

    responder();
    await usuario.click(screen.getByRole('button', { name: /Refrescar/ }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    expect(screen.queryByText('No se pudo consultar la meta del equipo.')).toBeNull();
    expect(axios.get).toHaveBeenCalledTimes(6);
  });

  it('no actualiza el estado si se desmonta antes de la respuesta', async () => {
    let resolver;
    axios.get.mockReturnValue(new Promise(r => { resolver = r; }));
    const { unmount } = renderizar();
    unmount();

    resolver({ data: [] });
    // Se deja correr la microtask para que el finally vea activo=false.
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByRole('heading', { name: /Meta del Equipo/ })).toBeNull();
  });
});

describe('MiMetaEquipo: indicadores', () => {
  it('suma cuentas, meta y KPIs tratando el ausente como cero', async () => {
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());

    expect(screen.getByText(/15 contratos repartidos entre 3 gestores/)).toBeInTheDocument();
    expect(screen.getByText('$75,000.00')).toBeInTheDocument();
    expect(screen.getByText('Gestiones del Mes').nextSibling).toHaveTextContent('20');
    expect(screen.getByText('Promesas del Mes').nextSibling).toHaveTextContent('5');
  });

  it('suma lo prometido en el mes e ignora fechas invalidas', async () => {
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    // En el mes: 1000+2000+3000+0+5000. La de 6000 es de 2020 y la de 'mucho' trae fecha invalida.
    expect(screen.getByText('Prometido en el Mes').nextSibling).toHaveTextContent('$11,000.00');
  });

  it('cae a $0.00 cuando el monto no es numerico', async () => {
    responder(EQUIPO_TODO, EQUIPO_MES, [promesa({ montoPromesa: 'mucho' })]);
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    expect(screen.getByText('Prometido en el Mes').nextSibling).toHaveTextContent('$0.00');
  });
});

describe('MiMetaEquipo: pendientes y vencidas', () => {
  it('separa futuras de vencidas y las ordena por fecha', async () => {
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());

    expect(screen.getByText(/Promesas Pendientes \(4\)/)).toBeInTheDocument();
    expect(screen.getByText('Promesas Vencidas').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Promesas Vencidas').nextSibling.nextSibling).toHaveTextContent('= $3,000.00');
  });

  it('avisa cuando no hay pendientes y oculta la lista de vencidas', async () => {
    responder(EQUIPO_TODO, EQUIPO_MES, []);
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());

    expect(screen.getByText('El equipo no tiene promesas con fecha futura.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('MiMetaEquipo: detalle', () => {
  it('abre la vencida al pulsar y la cierra', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    const botones = screen.getAllByTitle('Clic para ver el detalle (Ctrl+F2)');
    expect(botones).toHaveLength(2);

    await usuario.click(botones[0]);
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 4');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('abre con Enter e ignora otras teclas', async () => {
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    const boton = screen.getAllByTitle('Clic para ver el detalle (Ctrl+F2)')[0];

    fireEvent.keyDown(boton, { key: 'Tab' });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(boton, { key: 'Enter' });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 4');
  });

  it('Ctrl+F2 reabre la ultima gestion vista', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    await usuario.click(screen.getAllByTitle('Clic para ver el detalle (Ctrl+F2)')[0]);
    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 4');

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('detecta F2 por code cuando la tecla no coincide', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();

    await waitFor(() => expect(screen.getByRole('heading', { name: /Meta del Equipo/ })).toBeInTheDocument());
    await usuario.click(screen.getAllByTitle('Clic para ver el detalle (Ctrl+F2)')[0]);

    fireEvent.keyDown(window, { key: 'Unidentified', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });
});
