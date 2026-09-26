import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import PromesasSupervisor from '../src/components/PromesasSupervisor';

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

const TIPOS = [
  { idTipoPromesa: 1, nombre: 'Parcial' },
  { idTipoPromesa: 2, nombre: 'Promoción 20%' },
];

const promesa = (over = {}) => ({
  idGestion: 1,
  fechaRegistro: '2026-03-05T10:00:00Z',
  montoPromesa: 2000,
  fechaPromesa: '2026-03-20',
  estadoBonificacion: 'PENDIENTE',
  deuda: { idDeuda: 55, numeroCuenta: 'CU-055', deudor: { idDeudor: 7, nombreCompleto: 'Verónica Castillo' } },
  empleado: { idEmpleado: 3, nombreCompleto: 'Verónica Castillo' },
  concepto: { nombreConcepto: 'Promesa de pago' },
  tipoPromesa: { idTipoPromesa: 1, nombre: 'Parcial' },
  ...over,
});

const P1 = promesa({ idGestion: 1 });
const P2 = promesa({
  idGestion: 2,
  estadoBonificacion: 'APROBADA',
  deuda: { idDeuda: 55, numeroCuenta: 'CU-055', deudor: { idDeudor: 7, nombreCompleto: 'Verónica Castillo' } },
});
const P3 = promesa({
  idGestion: 3,
  estadoBonificacion: null,
  montoPromesa: null,
  fechaPromesa: null,
  tipoPromesa: null,
  deuda: { idDeuda: 56, numeroCuenta: 'CU-056', deudor: { idDeudor: 8, nombreCompleto: 'Carlos Mendoza' } },
  empleado: { idEmpleado: 4 },
});

const responder = (promesas = [P1, P2, P3], tipos = TIPOS) => {
  axios.get.mockImplementation((url) => {
    if (url.includes('/tipos-promesa')) return Promise.resolve({ data: tipos });
    return Promise.resolve({ data: promesas });
  });
};

const renderizar = () => render(<PromesasSupervisor supervisorId={9} empresaId={2} />);
const buscar = () => screen.getByPlaceholderText(/Buscar cliente por nombre/);

const grupoDe = (nombre) => screen.getByText(nombre).closest('.border-slate-200.rounded-xl');

beforeEach(() => jest.clearAllMocks());

describe('PromesasSupervisor: carga', () => {
  it('muestra el estado de carga y pide ambos endpoints', async () => {
    responder();
    renderizar();

    expect(screen.getByText('Cargando promesas...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    expect(axios.get).toHaveBeenCalledWith('/api/supervision/promesas', {
      params: { supervisorId: 9 },
    });
    expect(axios.get).toHaveBeenCalledWith('/api/tipos-promesa', {
      params: { empresaId: 2 },
    });
  });

  it('avisa cuando el servidor no responde', async () => {
    axios.get.mockRejectedValue(new Error('network down'));
    renderizar();

    expect(await screen.findByText('No se pudieron cargar las promesas del equipo.')).toBeInTheDocument();
  });

  it('no actualiza si se desmonta antes del error', async () => {
    let rechazar;
    axios.get.mockReturnValue(new Promise((_, rej) => { rechazar = rej; }));
    const { unmount } = renderizar();
    unmount();

    rechazar(new Error('tardío'));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.queryByRole('heading', { name: 'Promesas del Equipo' })).toBeNull();
  });

  it('recarga al refrescar', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    await usuario.click(screen.getByRole('button', { name: /Refrescar/ }));

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4));
  });
});

describe('PromesasSupervisor: contadores', () => {
  it('cuenta promesas, aprobadas y por autorizar', async () => {
    responder([P1, P2, P3, promesa({ idGestion: 4, estadoBonificacion: 'RECHAZADA' })]);
    renderizar();

    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    expect(screen.getByText('Promesas').previousSibling).toHaveTextContent('4');
    expect(screen.getByText('Aprobadas').previousSibling).toHaveTextContent('1');
    // PENDIENTE + null cuentan como por autorizar.
    expect(screen.getByText('Por autorizar').previousSibling).toHaveTextContent('2');
  });
});

describe('PromesasSupervisor: busqueda', () => {
  it('filtra por nombre y por cuenta', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.type(buscar(), 'mendoza');
    expect(screen.queryByText('Verónica Castillo')).toBeNull();
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();
    expect(screen.getByText(/1 cliente\(s\) con 1 promesa\(s\)/)).toBeInTheDocument();

    await usuario.clear(buscar());
    await usuario.type(buscar(), 'cu-055');
    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Mendoza')).toBeNull();
  });

  it('filtra aunque haya promesas sin deuda', async () => {
    const usuario = userEvent.setup();
    responder([P1, promesa({ idGestion: 9, deuda: null })]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.type(buscar(), 'castillo');

    // El conteo parte el texto en varios nodos, asi que se localiza por
    // subcadena y se verifica el contenido completo.
    expect(screen.getByText(/cliente\(s\) con/)).toHaveTextContent('1 cliente(s) con 1 promesa(s)');
  });

  it('avisa cuando nada coincide y cuando no hay promesas', async () => {
    const usuario = userEvent.setup();
    responder();
    const { unmount } = renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.type(buscar(), 'zzz');
    expect(screen.getByText('Ningún cliente coincide con la búsqueda.')).toBeInTheDocument();
    unmount();

    responder([]);
    renderizar();
    await waitFor(() =>
      expect(screen.getByText('Aún no hay promesas registradas por tus gestores.')).toBeInTheDocument(),
    );
  });
});

describe('PromesasSupervisor: grupos', () => {
  it('agrupa por deudor y ordena por cantidad', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    // Verónica tiene 2 promesas, Carlos 1: Verónica va primero.
    const grupos = screen.getAllByText(/promesa\(s\)$/);
    expect(grupos[0]).toHaveTextContent('2 promesa(s)');
    expect(grupoDe('Verónica Castillo')).toHaveTextContent('CU-055');
    expect(grupoDe('Carlos Mendoza')).toHaveTextContent('CU-056');
  });

  it('agrupa por cuenta cuando no hay deudor y por id cuando no hay deuda', async () => {
    responder([
      promesa({ idGestion: 10, deuda: { idDeuda: 60, numeroCuenta: 'CU-060', deudor: null } }),
      promesa({ idGestion: 11, deuda: null }),
    ]);
    renderizar();

    await waitFor(() => expect(screen.getAllByText('Cliente sin nombre')).toHaveLength(2));
  });

  it('cae a $0.00 cuando el monto no es numerico', async () => {
    responder([promesa({ montoPromesa: 'mucho' })]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    expect(grupoDe('Verónica Castillo')).toHaveTextContent('$0.00');
  });

  it('adapta filas con campos ausentes', async () => {
    responder([P3]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument());

    const fila = grupoDe('Carlos Mendoza');
    expect(fila).toHaveTextContent('—');
    expect(fila).toHaveTextContent('Sin estado');
  });

  it.each([
    ['APLICADA', 'bg-green-100'],
    ['APROBADA', 'bg-blue-100'],
    ['RECHAZADA', 'bg-red-100'],
    ['PENDIENTE', 'bg-amber-100'],
    [null, 'bg-amber-100'],
  ])('colorea el estado %s', async (estado, clase) => {
    responder([promesa({ estadoBonificacion: estado })]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    const insignia = screen.getByText(estado || 'Sin estado');
    expect(insignia).toHaveClass(clase);
  });
});

describe('PromesasSupervisor: aprobar y dar de baja', () => {
  it('muestra Aprobar solo para pendientes y Dar de baja salvo cerradas', async () => {
    responder([
      P1,
      P2,
      promesa({ idGestion: 4, estadoBonificacion: 'RECHAZADA' }),
      promesa({ idGestion: 5, estadoBonificacion: 'APLICADA' }),
    ]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    // Aprobar: P1 (PENDIENTE) sí; P2 (APROBADA), RECHAZADA y APLICADA no.
    expect(screen.getAllByRole('button', { name: /Aprobar/ })).toHaveLength(1);
    // Dar de baja: P1 y P2 sí; RECHAZADA y APLICADA no.
    expect(screen.getAllByRole('button', { name: /Dar de baja/ })).toHaveLength(2);
  });

  it('aprueba y confirma con mensaje', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByRole('button', { name: /Aprobar/ })[0]);

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('/api/gestiones/1/estado-bonificacion', {
        estado: 'APROBADA',
      }),
    );
    expect(await screen.findByText('✅ Promesa de CU-055 aprobada.')).toBeInTheDocument();
  });

  it('da de baja y confirma con mensaje', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByRole('button', { name: /Dar de baja/ })[0]);

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('/api/gestiones/1/estado-bonificacion', {
        estado: 'RECHAZADA',
      }),
    );
    expect(await screen.findByText('🗑️ Promesa de CU-055 dada de baja.')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend cuando falla el cambio', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: 'No autorizado' } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByRole('button', { name: /Aprobar/ })[0]);

    expect(await screen.findByText('⚠️ No autorizado')).toBeInTheDocument();
  });

  it('cae a un mensaje generico cuando el error no es texto', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: { codigo: 1 } } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByRole('button', { name: /Aprobar/ })[0]);

    expect(await screen.findByText('⚠️ No se pudo actualizar el estado de la promesa.')).toBeInTheDocument();
  });
});

describe('PromesasSupervisor: modificar', () => {
  const abrirModal = async (usuario, indice = 0) => {
    await usuario.click(screen.getAllByRole('button', { name: /Modificar/ })[indice]);
    expect(await screen.findByText('✏️ Modificar Promesa')).toBeInTheDocument();
  };

  it('precarga el formulario con los datos actuales', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);

    expect(screen.getByText('CU-055 — Verónica Castillo')).toBeInTheDocument();
    const selects = screen.getAllByRole('combobox');
    expect(selects[0]).toHaveValue('1');
  });

  it('deja vacio el formulario cuando la promesa no trae datos', async () => {
    const usuario = userEvent.setup();
    responder([promesa({ tipoPromesa: null, montoPromesa: null, fechaPromesa: null })]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('');
  });

  it('guarda los cambios y refresca la lista', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);
    await usuario.selectOptions(screen.getAllByRole('combobox')[0], '2');
    const monto = screen.getByPlaceholderText('0.00');
    await usuario.clear(monto);
    await usuario.type(monto, '2500');
    fireEvent.change(screen.getByDisplayValue('2026-03-20'), { target: { value: '2026-04-01' } });
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('/api/gestiones/1/promesa', {
        tipoPromesaId: 2,
        montoPromesa: 2500,
        fechaPromesa: '2026-04-01',
      }),
    );
    expect(await screen.findByText('✅ Promesa de CU-055 modificada.')).toBeInTheDocument();
    expect(screen.queryByText('✏️ Modificar Promesa')).toBeNull();
    // El refresco vuelve a pedir la lista.
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(4));
  });

  it('omite el tipo cuando no se elige ninguno', async () => {
    axios.put.mockResolvedValue({ data: {} });
    responder([promesa({ tipoPromesa: null, montoPromesa: null, fechaPromesa: null })]);
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    const usuario = userEvent.setup();
    await usuario.click(screen.getAllByRole('button', { name: /Modificar/ })[0]);
    await screen.findByText('✏️ Modificar Promesa');

    await usuario.type(screen.getByPlaceholderText('0.00'), '1000');
    const fecha = document.querySelector('input[type="date"]');
    fireEvent.change(fecha, { target: { value: '2026-04-01' } });
    fireEvent.submit(screen.getByText('✏️ Modificar Promesa').closest('.bg-white').querySelector('form'));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1]).toEqual({ montoPromesa: 1000, fechaPromesa: '2026-04-01' });
  });

  it('omite los campos vacios del cuerpo', async () => {
    axios.put.mockResolvedValue({ data: {} });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    const usuario = userEvent.setup();
    await abrirModal(usuario);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('2026-03-20'), { target: { value: '' } });
    fireEvent.submit(screen.getByText('✏️ Modificar Promesa').closest('.bg-white').querySelector('form'));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    // Sin tipo (no se eligió de nuevo: el select conserva '1'... se omite solo si está vacío).
    expect(axios.put.mock.calls[0][1]).toEqual({ tipoPromesaId: 1 });
  });

  it('muestra Guardando mientras la peticion sigue abierta', async () => {
    const usuario = userEvent.setup();
    let resolver;
    axios.put.mockReturnValue(new Promise(r => { resolver = r; }));
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    const guardando = await screen.findByRole('button', { name: 'Guardando...' });
    expect(guardando).toBeDisabled();

    resolver({ data: {} });
    await waitFor(() => expect(screen.queryByText('✏️ Modificar Promesa')).toBeNull());
  });

  it('muestra el mensaje del backend cuando falla el guardado', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: 'Monto inválido' } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    expect(await screen.findByText('⚠️ Monto inválido')).toBeInTheDocument();
    expect(screen.getByText('✏️ Modificar Promesa')).toBeInTheDocument();
  });

  it('cae a un mensaje generico cuando el error no es texto', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({});
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    expect(await screen.findByText('⚠️ No se pudo modificar la promesa.')).toBeInTheDocument();
  });

  it('cierra con la equis, con Cancelar y con el fondo', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);
    await usuario.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('✏️ Modificar Promesa')).toBeNull();

    await abrirModal(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('✏️ Modificar Promesa')).toBeNull();

    await abrirModal(usuario);
    const fondo = screen.getByText('✏️ Modificar Promesa').closest('.fixed');
    fireEvent.click(fondo);
    expect(screen.queryByText('✏️ Modificar Promesa')).toBeNull();
  });

  it('no cierra al pulsar dentro del recuadro', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await abrirModal(usuario);
    await usuario.click(screen.getByText('✏️ Modificar Promesa'));

    expect(screen.getByText('✏️ Modificar Promesa')).toBeInTheDocument();
  });
});

describe('PromesasSupervisor: detalle', () => {
  it('abre la promesa al pulsar la cuenta', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByTitle('Clic para ver detalle (Ctrl+F2)')[0]);
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('abre con Enter e ignora otras teclas', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    const boton = screen.getAllByTitle('Clic para ver detalle (Ctrl+F2)')[0];
    fireEvent.keyDown(boton, { key: 'Tab' });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(boton, { key: 'Enter' });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');
  });

  it('detecta F2 por code cuando la tecla no coincide', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByTitle('Clic para ver detalle (Ctrl+F2)')[0]);
    fireEvent.keyDown(window, { key: 'Unidentified', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('Ctrl+F2 reabre la ultima promesa vista', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Verónica Castillo')).toBeInTheDocument());

    await usuario.click(screen.getAllByTitle('Clic para ver detalle (Ctrl+F2)')[0]);
    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });
});
