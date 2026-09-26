import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import TicketsTab from '../src/components/TicketsTab';

jest.mock('axios');
jest.mock('../src/components/DetalleVista', () => ({
  __esModule: true,
  default: ({ item, onCerrar }) =>
    item ? (
      <div data-testid="detalle">
        Ticket {item.numero}
        <button type="button" onClick={onCerrar}>
          Cerrar detalle
        </button>
      </div>
    ) : null,
}));

const DEUDOR = { idDeudor: 7, nombreCompleto: 'Verónica Castillo' };
const DEUDAS = [
  { idDeuda: 55, numeroCuenta: 'CU-055', saldoPendiente: 2500.5, tipoProducto: { nombreProducto: 'TDC' }, deudor: { idDeudor: 7, nombreCompleto: 'Verónica Castillo' } },
  { idDeuda: 56, numeroCuenta: 'CU-056', deudor: null, idDeudor: 7 },
];
const TIPOS = [
  {
    numero: '118',
    nombre: 'Aprobación de Promoción',
    plantilla: 'Hola [CLIENTE] de cuenta [CUENTA] con saldo [SALDO] monto [MONTO]',
    departamento: { idDepartamento: 5, nombre: 'Auditoría' },
  },
  {
    numero: '253',
    nombre: 'Liquidación',
    plantilla: 'Liquidar [CUENTA]',
    departamento: { idDepartamento: 6, nombre: 'CXC' },
  },
  {
    numero: '777',
    nombre: 'Sin Plantilla',
    plantilla: null,
    departamento: { idDepartamento: 7, nombre: 'Operaciones' },
  },
];
const EMPLEADO = { idEmpleado: 3 };

const ticket = (over = {}) => ({
  idTicket: 1,
  numero: 'TK-1',
  asunto: 'Revisión de cargo',
  fechaCreacion: '2026-03-02T09:00:00Z',
  departamento: { nombre: 'Cobranza' },
  estado: 'ABIERTO',
  empleadoOrigen: { idEmpleado: 9, nombreCompleto: 'María Teresa Gil' },
  deuda: { idDeuda: 55, numeroCuenta: 'CU-055' },
  descripcion: 'El cliente disputa el cargo',
  ...over,
});

const actualizados = jest.fn();

const renderizar = (over = {}) =>
  render(
    <TicketsTab
      deudor={DEUDOR}
      deudas={DEUDAS}
      tiposTicket={TIPOS}
      tickets={[]}
      empleadoActual={EMPLEADO}
      deudaSeleccionadaId={55}
      onDatosActualizados={actualizados}
      prefill={null}
      {...over}
    />,
  );

const numeroInput = () => screen.getByPlaceholderText('Ej. 253, 110, 301, 450...');
const textoArea = () => screen.getByPlaceholderText(/Escribe aquí el número/);
const enviar = () => screen.getByRole('button', { name: /Enviar Ticket/ });

beforeEach(() => jest.clearAllMocks());

describe('TicketsTab: formulario', () => {
  it('ofrece las deudas del cliente en el selector de producto', () => {
    renderizar();

    const opciones = within(screen.getByRole('combobox')).getAllByRole('option').map(o => o.textContent);
    expect(opciones).toEqual(['CU-055 — TDC', 'CU-056 — Sin tipo']);
  });

  it('detecta el tipo y rellena la plantilla al escribir el numero', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '118');

    const formulario = enviar().closest('form');
    expect(formulario).toHaveTextContent('118');
    // El uppercase de nombre y departamento es solo CSS; el textContent
    // conserva el caso original del catalogo.
    expect(formulario).toHaveTextContent('Aprobación de Promoción');
    expect(formulario).toHaveTextContent('Auditoría');
    expect(textoArea()).toHaveValue(
      'Hola Verónica Castillo de cuenta CU-055 con saldo $2,500.50 monto $2,500.50',
    );
  });

  it('cambia de producto y recalcula la plantilla con la deuda elegida', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.selectOptions(screen.getByRole('combobox'), '56');
    expect(screen.getByRole('combobox')).toHaveValue('56');

    await usuario.type(numeroInput(), '253');
    // La deuda 56 trae cuenta pero no deudor: usa la cuenta y el fallback de cliente.
    expect(textoArea()).toHaveValue('Liquidar CU-056');
  });

  it('acepta un tipo sin plantilla y deja el texto vacio', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '777');

    expect(textoArea()).toHaveValue('');
    expect(enviar().closest('form')).toHaveTextContent('777');
  });

  it('no toca el texto cuando el numero no existe', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '9');
    expect(textoArea()).toHaveValue('');
    await usuario.type(numeroInput(), '99');
    expect(
      screen.getByText('Escribe el número del ticket para llenar automáticamente el departamento, asunto y plantilla.'),
    ).toBeInTheDocument();
  });

  it('limpia el error al seguir escribiendo', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '999');
    fireEvent.submit(screen.getByRole('button', { name: /Enviar Ticket/ }).closest('form'));
    expect(await screen.findByText(/no corresponde a ningún tipo/)).toBeInTheDocument();

    await usuario.type(numeroInput(), '8');
    expect(screen.queryByText(/no corresponde a ningún tipo/)).toBeNull();
  });

  it('no rebusca la plantilla cuando el campo queda vacio', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '118');
    await usuario.clear(numeroInput());
    await usuario.clear(textoArea());
    await usuario.type(textoArea(), 'Texto manual');

    expect(textoArea()).toHaveValue('Texto manual');
  });
});

describe('TicketsTab: prefill 118', () => {
  it('precarga numero, deuda y plantilla', () => {
    renderizar({ prefill: { numero: '118', idDeuda: 55 } });

    expect(numeroInput()).toHaveValue('118');
    expect(screen.getByRole('combobox')).toHaveValue('55');
    expect(textoArea()).toHaveValue(
      'Hola Verónica Castillo de cuenta CU-055 con saldo $2,500.50 monto $2,500.50',
    );
  });

  it('usa la primera deuda cuando el prefill no trae id', () => {
    renderizar({ prefill: { numero: '253' } });

    expect(textoArea()).toHaveValue('Liquidar CU-055');
  });

  it('deja el texto vacio cuando el numero no existe en catalogo', () => {
    renderizar({ prefill: { numero: '999', idDeuda: 55 } });

    expect(numeroInput()).toHaveValue('999');
    expect(textoArea()).toHaveValue('');
  });

  it('rellena con valores por defecto cuando la deuda no trae datos', async () => {
    const usuario = userEvent.setup();
    renderizar({ deudas: [], deudaSeleccionadaId: undefined, tickets: [] });

    await usuario.type(numeroInput(), '118');

    expect(textoArea()).toHaveValue('Hola el cliente de cuenta la cuenta con saldo $0.00 monto $0.00');
  });

  it('cae a $0.00 cuando el saldo no es numerico', async () => {
    const usuario = userEvent.setup();
    renderizar({
      deudas: [{ idDeuda: 60, numeroCuenta: 'CU-060', saldoPendiente: 'mucho', deudor: { idDeudor: 7 } }],
      deudaSeleccionadaId: 60,
    });

    await usuario.type(numeroInput(), '118');

    expect(textoArea()).toHaveValue('Hola el cliente de cuenta CU-060 con saldo $0.00 monto $0.00');
  });
});

describe('TicketsTab: envio', () => {
  it('rechaza un numero que no existe', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '999');
    fireEvent.submit(enviar().closest('form'));

    expect(await screen.findByText(/"999" no corresponde a ningún tipo/)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('pide el texto cuando viene vacio', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(numeroInput(), '118');
    fireEvent.change(textoArea(), { target: { value: '   ' } });
    fireEvent.submit(enviar().closest('form'));

    expect(await screen.findByText('Escribe el texto de lo que solicitas (ya viene la plantilla del ticket).')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('envia el ticket y confirma con el mensaje de exito', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    renderizar();

    await usuario.type(numeroInput(), '118');
    await usuario.click(enviar());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/api/tickets', {
      numero: '118',
      asunto: 'Aprobación de Promoción',
      idDeuda: 55,
      idDepartamento: 5,
      idEmpleadoOrigen: 3,
      descripcion: 'Hola Verónica Castillo de cuenta CU-055 con saldo $2,500.50 monto $2,500.50',
    });
    expect(await screen.findByText('Ticket 118 (Aprobación de Promoción) enviado a Auditoría.')).toBeInTheDocument();
    expect(numeroInput()).toHaveValue('');
    expect(textoArea()).toHaveValue('');
    expect(actualizados).toHaveBeenCalledTimes(1);
  });

  it('manda idDeuda nulo cuando no hay deuda elegida', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    renderizar({ deudas: [], deudaSeleccionadaId: undefined });

    await usuario.type(numeroInput(), '118');
    await usuario.click(enviar());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].idDeuda).toBeNull();
  });

  it('no rompe cuando no recibe callback de actualizacion', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    renderizar({ onDatosActualizados: undefined });

    await usuario.type(numeroInput(), '118');
    await usuario.click(enviar());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });

  it('muestra Enviando mientras la peticion sigue abierta', async () => {
    const usuario = userEvent.setup();
    let resolver;
    axios.post.mockReturnValue(new Promise(r => { resolver = r; }));
    renderizar();

    await usuario.type(numeroInput(), '118');
    await usuario.click(enviar());

    const enviando = await screen.findByRole('button', { name: 'Enviando...' });
    expect(enviando).toBeDisabled();

    resolver({ data: {} });
    await waitFor(() => expect(screen.getByRole('button', { name: /Enviar Ticket/ })).toBeEnabled());
  });

  it('muestra el mensaje del backend cuando responde con texto', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue({ response: { data: 'El departamento está cerrado' } });
    renderizar();

    await usuario.type(numeroInput(), '118');
    await usuario.click(enviar());

    expect(await screen.findByText('El departamento está cerrado')).toBeInTheDocument();
  });

  it('cae a un mensaje generico cuando la respuesta no es texto', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue({ response: { data: { codigo: 1 } } });
    renderizar();

    await usuario.type(numeroInput(), '118');
    await usuario.click(enviar());

    expect(await screen.findByText('Error al enviar el ticket.')).toBeInTheDocument();
  });
});

describe('TicketsTab: listado', () => {
  it('avisa cuando no hay tickets', () => {
    renderizar({ tickets: [] });

    expect(screen.getByText('No hay tickets enviados para este cliente.')).toBeInTheDocument();
    expect(screen.getByText('Tickets del cliente (0)')).toBeInTheDocument();
  });

  it('filtra por deuda del cliente y ordena del mas reciente', () => {
    renderizar({
      tickets: [
        ticket({ idTicket: 1, numero: 'TK-1', fechaCreacion: '2026-01-01T09:00:00Z' }),
        ticket({ idTicket: 2, numero: 'TK-2', fechaCreacion: '2026-05-01T09:00:00Z' }),
        ticket({ idTicket: 3, numero: 'TK-3', deuda: { idDeuda: 99, numeroCuenta: 'CU-099' } }),
        ticket({ idTicket: 4, numero: 'TK-4', deuda: null }),
      ],
    });

    expect(screen.getByText('Tickets del cliente (2)')).toBeInTheDocument();
    const numeros = screen.getAllByText(/^TK-\d$/).map(n => n.textContent);
    expect(numeros).toEqual(['TK-2', 'TK-1']);
  });

  it.each([
    ['RESUELTO', 'bg-green-100'],
    ['EN PROGRESO', 'bg-amber-100'],
    ['EN_PROGRESO', 'bg-amber-100'],
    ['ABIERTO', 'bg-red-100'],
    [undefined, 'bg-red-100'],
  ])('colorea el estado %s', (estado, clase) => {
    renderizar({ tickets: [ticket({ estado })] });

    const tarjeta = screen.getByText('TK-1').closest('[role="button"]');
    if (estado) expect(tarjeta).toHaveTextContent(estado);
    // La insignia de estado es la única con bg-green/amber/red; las otras
    // (asunto, departamento) usan morado y slate-800.
    const insignia = Array.from(tarjeta.querySelectorAll('span')).find(s =>
      /bg-(green|amber|red)-100/.test(s.className),
    );
    expect(insignia.className).toContain(clase);
  });

  it('adapta tarjetas con campos ausentes', () => {
    renderizar({
      tickets: [
        ticket({
          asunto: null,
          departamento: null,
          empleadoOrigen: { idEmpleado: 42 },
          // Sin numeroCuenta: el filtro exige deuda, asi que la tarjeta
          // existe pero la cuenta sale vacia.
          deuda: { idDeuda: 55 },
        }),
      ],
    });

    const tarjeta = screen.getByText('TK-1').closest('[role="button"]');
    expect(tarjeta).toHaveTextContent('ID 42');
    expect(tarjeta).toHaveTextContent('Cuenta:');
    expect(tarjeta).not.toHaveTextContent('Revisión de cargo');
  });

  it('sugiere deslizar cuando hay mas de diez tickets', () => {
    const muchos = Array.from({ length: 11 }, (_, i) =>
      ticket({ idTicket: 100 + i, numero: `TK-${100 + i}`, fechaCreacion: `2026-03-${String(i + 1).padStart(2, '0')}T09:00:00Z` }),
    );
    renderizar({ tickets: muchos });

    expect(screen.getByText(/desliza/)).toBeInTheDocument();
    expect(screen.getByText('TK-100').closest('[role="button"]').parentElement.className).toContain('max-h-[440px]');
  });
});

describe('TicketsTab: detalle', () => {
  it('abre el ticket al pulsar la tarjeta y lo cierra', async () => {
    const usuario = userEvent.setup();
    renderizar({ tickets: [ticket()] });

    await usuario.click(screen.getByText('TK-1').closest('[role="button"]'));
    expect(screen.getByTestId('detalle')).toHaveTextContent('Ticket TK-1');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('abre con Enter e ignora otras teclas', async () => {
    renderizar({ tickets: [ticket()] });
    const tarjeta = screen.getByText('TK-1').closest('[role="button"]');

    fireEvent.keyDown(tarjeta, { key: 'Tab' });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(tarjeta, { key: 'Enter' });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Ticket TK-1');
  });

  it('Ctrl+F2 reabre el ultimo ticket visto', async () => {
    const usuario = userEvent.setup();
    renderizar({ tickets: [ticket()] });

    await usuario.click(screen.getByText('TK-1').closest('[role="button"]'));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Ticket TK-1');

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('detecta F2 por code cuando la tecla no coincide', async () => {
    const usuario = userEvent.setup();
    renderizar({ tickets: [ticket()] });

    await usuario.click(screen.getByText('TK-1').closest('[role="button"]'));
    fireEvent.keyDown(window, { key: 'Unidentified', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('Ctrl+F2 no hace nada sin ticket previo', () => {
    renderizar({ tickets: [ticket()] });

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });
});
