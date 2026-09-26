import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AsignacionSupervisor from '../src/components/AsignacionSupervisor';

jest.mock('axios');

const haceISO = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
};

const EMPLEADOS = [
  { idEmpleado: 10, nombreCompleto: 'Ana Torres', usuario: 'ana.t', numeroEmpleado: 'S1G01', rol: 'GESTOR', supervisor: { idEmpleado: 9 } },
  { idEmpleado: 11, nombreCompleto: 'Luis Paz', usuario: 'luis.p', numeroEmpleado: 'S1G02', rol: 'gestor', supervisor: { idEmpleado: 9 } },
  { idEmpleado: 12, nombreCompleto: 'Jefe Zone', usuario: 'jefe.z', numeroEmpleado: 'S1S01', rol: 'SUPERVISOR', supervisor: { idEmpleado: 9 } },
  { idEmpleado: 13, nombreCompleto: 'Otro Equipo', usuario: 'otro.e', numeroEmpleado: 'S2G01', rol: 'GESTOR', supervisor: { idEmpleado: 99 } },
  { idEmpleado: 14, nombreCompleto: 'Sin Jefazo', usuario: 'sin.j', numeroEmpleado: 'S1G03', rol: 'GESTOR' },
  { idEmpleado: 15, nombreCompleto: 'Sin Rol', usuario: 'sin.r', numeroEmpleado: 'S1G04', supervisor: { idEmpleado: 9 } },
];

const DEUDAS = [
  { idDeuda: 1, numeroCuenta: 'CU-001', saldoPendiente: 5000, fechaVencimiento: haceISO(200), estado: 'PENDIENTE', deudor: { nombreCompleto: 'Verónica Castillo' } },
  { idDeuda: 2, numeroCuenta: 'CU-002', saldoPendiente: 3000, fechaVencimiento: haceISO(100), estado: 'PENDIENTE', deudor: { nombreCompleto: 'Carlos Mendoza' } },
  { idDeuda: 3, numeroCuenta: 'CU-003', saldoPendiente: 1000, fechaVencimiento: haceISO(40), estado: null, deudor: { nombreCompleto: 'Ana Torres' } },
  { idDeuda: 4, numeroCuenta: 'CU-004', saldoPendiente: 2000, fechaVencimiento: haceISO(10), estado: 'PENDIENTE', deudor: null },
  { idDeuda: 5, numeroCuenta: 'CU-005', saldoPendiente: 4000, fechaVencimiento: haceISO(60), estado: 'LIQUIDADA', deudor: { nombreCompleto: 'Luis Paz' } },
  { idDeuda: 6, numeroCuenta: null, saldoPendiente: 'mucho', fechaVencimiento: null, estado: 'PENDIENTE' },
];

const ASIGNACIONES = [
  { idAsignacion: 1, estatusActiva: true, deuda: { idDeuda: 5 }, empleado: { idEmpleado: 10 } },
  { idAsignacion: 2, estatusActiva: false, deuda: { idDeuda: 2 }, empleado: { idEmpleado: 11 } },
  { idAsignacion: 3, estatusActiva: true, deuda: null, empleado: null },
];

const responder = (empleados = EMPLEADOS, deudas = DEUDAS, asignaciones = ASIGNACIONES) => {
  axios.get.mockImplementation((url) => {
    if (url.includes('/empleados')) return Promise.resolve({ data: empleados });
    if (url.includes('/deudas')) return Promise.resolve({ data: deudas });
    return Promise.resolve({ data: asignaciones });
  });
};

const renderizar = () => render(<AsignacionSupervisor supervisorId={9} empresaId={2} />);
const buscarCuenta = () => screen.getByPlaceholderText(/Buscar cuenta o cliente/);
const buscarGestor = () => screen.getByPlaceholderText(/Buscar gestor/);
// La fila pinta "CU-001 — Nombre" en un solo nodo, asi que no hay texto
// exacto 'CU-001'. Se localiza por el div truncate que empieza con la cuenta.
const tituloDe = (cuenta) =>
  screen
    .getAllByText(
      (_, el) => el?.className?.includes?.('truncate') && el?.textContent?.startsWith(cuenta),
    )
    .find((el) => el.textContent.startsWith(cuenta));
const filaDe = (cuenta) => tituloDe(cuenta).closest('li');
const casillaDe = (cuenta) => filaDe(cuenta).querySelector('input[type="checkbox"]');
const hayFila = (cuenta) =>
  screen.queryAllByText(
    (_, el) => el?.className?.includes?.('truncate') && el?.textContent?.startsWith(cuenta),
  ).length > 0;
// nextSibling cae en el nodo de texto del espacio; nextElementSibling salta al span.
const seleccionadas = () => screen.getByText(/Seleccionadas:/).nextElementSibling;

beforeEach(() => jest.clearAllMocks());

describe('AsignacionSupervisor: carga', () => {
  it('muestra el estado de carga y pide los tres endpoints', async () => {
    responder();
    renderizar();

    expect(screen.getByText('Cargando equipo y cartera disponible...')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    expect(axios.get).toHaveBeenCalledWith('/api/empleados', { params: { empresaId: 2 } });
    expect(axios.get).toHaveBeenCalledWith('/api/deudas', { params: { empresaId: 2 } });
    expect(axios.get).toHaveBeenCalledWith('/api/asignaciones-cartera', { params: { empresaId: 2 } });
  });

  it('filtra gestores del equipo y excluye otros roles', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    expect(screen.getByText('Luis Paz')).toBeInTheDocument();
    expect(screen.queryByText('Jefe Zone')).toBeNull();
    expect(screen.queryByText('Otro Equipo')).toBeNull();
    expect(screen.queryByText('Sin Jefazo')).toBeNull();
    expect(screen.queryByText('Sin Rol')).toBeNull();
  });

  it('ordena las libres por mora descendente y excluye liquidadas y asignadas', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    expect(screen.getByText(/Cuentas sin asignar \(5\)/)).toBeInTheDocument();
    const cuentas = screen
      .getAllByText(
        (_, el) => el?.className?.includes?.('truncate') && el?.textContent?.startsWith('CU-'),
      )
      .map(n => n.textContent);
    expect(cuentas).toEqual([
      'CU-001 — Verónica Castillo',
      'CU-002 — Carlos Mendoza',
      'CU-003 — Ana Torres',
      'CU-004 — ',
    ]);
    expect(hayFila('CU-005')).toBe(false);
  });

  it('cuenta las asignadas por gestor', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    const ana = screen.getByText('Ana Torres').closest('button');
    expect(ana).toHaveTextContent('1 cuentas');
    const luis = screen.getByText('Luis Paz').closest('button');
    expect(luis).toHaveTextContent('0 cuentas');
  });

  it('avisa cuando el servidor no responde', async () => {
    axios.get.mockRejectedValue(new Error('network down'));
    renderizar();

    expect(await screen.findByText('No se pudieron cargar los datos para asignar carteras.')).toBeInTheDocument();
  });

  it('no actualiza si se desmonta antes de la respuesta', async () => {
    let resolver;
    axios.get.mockReturnValue(new Promise(r => { resolver = r; }));
    const { unmount } = renderizar();
    unmount();

    resolver({ data: [] });
    await new Promise(r => setTimeout(r, 0));

    expect(screen.queryByRole('heading', { name: 'Asignar Carteras' })).toBeNull();
  });

  it('no muestra error si se desmonta antes del fallo', async () => {
    let rechazar;
    axios.get.mockReturnValue(new Promise((_, rej) => { rechazar = rej; }));
    const { unmount } = renderizar();
    unmount();

    rechazar(new Error('tardío'));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.queryByRole('heading', { name: 'Asignar Carteras' })).toBeNull();
  });

  it('recarga al refrescar', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(3));

    await usuario.click(screen.getByRole('button', { name: /Refrescar/ }));

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(6));
  });

  it('celebra cuando ya no hay cuentas por asignar', async () => {
    responder(EMPLEADOS, [DEUDAS[0]], [{ idAsignacion: 9, estatusActiva: true, deuda: { idDeuda: 1 }, empleado: { idEmpleado: 10 } }]);
    renderizar();

    await waitFor(() => expect(screen.getByText(/0 cuentas por asignar/)).toBeInTheDocument());
    expect(screen.getByText(/entre tus 2 gestores/)).toBeInTheDocument();
  });
});

describe('AsignacionSupervisor: mora', () => {
  it.each([
    ['CU-001', 'Mora 5-6 m', 'bg-rose-100'],
    ['CU-002', 'Mora 3-4 m', 'bg-amber-100'],
    ['CU-003', 'Mora 1-2 m', 'bg-emerald-100'],
    ['CU-004', 'Al día', 'bg-slate-100'],
  ])('etiqueta %s como %s', async (cuenta, etiqueta, clase) => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    const insignia = filaDe(cuenta).querySelector('span.rounded-full');
    expect(insignia).toHaveTextContent(etiqueta);
    expect(insignia.className).toContain(clase);
  });

  it('filtra por rango de mora', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(screen.getByRole('button', { name: 'Mora 1-2 m' }));
    expect(tituloDe('CU-003')).toBeInTheDocument();
    expect(hayFila('CU-001')).toBe(false);
    expect(hayFila('CU-004')).toBe(false);

    await usuario.click(screen.getByRole('button', { name: 'Mora 5-6 m' }));
    expect(tituloDe('CU-001')).toBeInTheDocument();
    expect(hayFila('CU-003')).toBe(false);

    await usuario.click(screen.getByRole('button', { name: 'Todas' }));
    expect(tituloDe('CU-001')).toBeInTheDocument();
    expect(tituloDe('CU-004')).toBeInTheDocument();
  });

  it('cae a $0.00 cuando el saldo no es numerico', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    const filas = screen.getAllByRole('listitem');
    expect(filas[filas.length - 1]).toHaveTextContent('$0.00');
  });
});

describe('AsignacionSupervisor: busqueda', () => {
  it('filtra cuentas por numero o cliente', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.type(buscarCuenta(), 'CU-002');
    expect(tituloDe('CU-002')).toBeInTheDocument();
    expect(hayFila('CU-001')).toBe(false);

    await usuario.clear(buscarCuenta());
    await usuario.type(buscarCuenta(), 'castillo');
    expect(tituloDe('CU-001')).toBeInTheDocument();
    expect(hayFila('CU-002')).toBe(false);
  });

  it('avisa cuando ningun filtro coincide', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.type(buscarCuenta(), 'zzz');
    expect(screen.getByText('No hay cuentas libres que coincidan con el filtro.')).toBeInTheDocument();
  });

  it('tolera gestores sin nombre, numero o usuario al buscar', async () => {
    const usuario = userEvent.setup();
    const raros = [
      ...EMPLEADOS,
      { idEmpleado: 20, nombreCompleto: null, numeroEmpleado: 'Q99', usuario: 'zz9', rol: 'GESTOR', supervisor: { idEmpleado: 9 } },
      { idEmpleado: 21, nombreCompleto: 'Xyz Abc', numeroEmpleado: null, usuario: 'zz8', rol: 'GESTOR', supervisor: { idEmpleado: 9 } },
      { idEmpleado: 22, nombreCompleto: 'Xyz Def', numeroEmpleado: 'Q98', usuario: null, rol: 'GESTOR', supervisor: { idEmpleado: 9 } },
    ];
    responder(raros);
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.type(buscarGestor(), 'zz9');
    expect(screen.getByText(/@zz9/)).toBeInTheDocument();
    expect(screen.queryByText('Ana Torres')).toBeNull();

    await usuario.clear(buscarGestor());
    await usuario.type(buscarGestor(), 'ana');
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
  });

  it('filtra gestores por nombre, numero o usuario', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.type(buscarGestor(), 'luis');
    expect(screen.queryByText('Ana Torres')).toBeNull();
    expect(screen.getByText('Luis Paz')).toBeInTheDocument();

    await usuario.clear(buscarGestor());
    await usuario.type(buscarGestor(), 'S1G01');
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();

    await usuario.clear(buscarGestor());
    await usuario.type(buscarGestor(), 'ana.t');
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    expect(screen.queryByText('Luis Paz')).toBeNull();

    await usuario.clear(buscarGestor());
    await usuario.type(buscarGestor(), 'zzz');
    expect(screen.getByText('No hay gestores que coincidan con la búsqueda.')).toBeInTheDocument();
  });
});

describe('AsignacionSupervisor: seleccion', () => {
  it('marca y desmarca con la casilla', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    expect(seleccionadas()).toHaveTextContent('1');
    expect(casillaDe('CU-001').closest('label').className).toContain('border-blue-500');

    await usuario.click(casillaDe('CU-001'));
    expect(seleccionadas()).toHaveTextContent('0');
  });

  it('selecciona todas las visibles de una vez', async () => {
    const usuario = userEvent.setup();
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(screen.getByRole('button', { name: /Seleccionar visibles \(5\)/ }));
    expect(seleccionadas()).toHaveTextContent('5');
    expect(screen.getByRole('button', { name: /Asignar 5 cuenta/ })).toBeEnabled();
  });

  it('cambia de gestor y limpia seleccion y mensaje', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: { asignadas: 1 } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    await usuario.click(screen.getByRole('button', { name: /Asignar 1 cuenta/ }));
    await waitFor(() => expect(screen.getByText(/Cartera asignada/)).toBeInTheDocument());

    await usuario.click(screen.getByText('Luis Paz'));
    expect(seleccionadas()).toHaveTextContent('0');
    expect(screen.queryByText(/Cartera asignada/)).toBeNull();
  });
});

describe('AsignacionSupervisor: asignar', () => {
  it('deshabilita el boton sin seleccion', async () => {
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    // Sin cuentas marcadas el boton no permite enviar; el guard interno
    // del handler es una segunda capa defensiva inalcanzable desde la UI.
    const boton = screen.getByRole('button', { name: /Asignar 0 cuenta/ });
    expect(boton).toBeDisabled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('asigna y confirma sin errores', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: { asignadas: 2 } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    await usuario.click(casillaDe('CU-002'));
    await usuario.click(screen.getByRole('button', { name: /Asignar 2 cuenta/ }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/asignaciones-cartera/por-lote', {
        empleadoId: 10,
        deudaIds: [1, 2],
      }),
    );
    expect(await screen.findByText('✅ Cartera asignada: 2 cuenta(s) a Ana Torres.')).toBeInTheDocument();
    expect(seleccionadas()).toHaveTextContent('0');
  });

  it('reporta cuantos fallaron cuando hay errores parciales', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: { asignadas: 1, errores: ['CU-002 duplicada'] } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    await usuario.click(screen.getByRole('button', { name: /Asignar 1 cuenta/ }));

    expect(await screen.findByText('✅ Cartera asignada: 1 cuenta(s) a Ana Torres (1 con error).')).toBeInTheDocument();
  });

  it('muestra Asignando mientras la peticion sigue abierta', async () => {
    const usuario = userEvent.setup();
    let resolver;
    axios.post.mockReturnValue(new Promise(r => { resolver = r; }));
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    await usuario.click(screen.getByRole('button', { name: /Asignar 1 cuenta/ }));

    const asignando = await screen.findByRole('button', { name: 'Asignando...' });
    expect(asignando).toBeDisabled();

    resolver({ data: { asignadas: 1 } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Asignar 0 cuenta/ })).toBeInTheDocument());
  });

  it('muestra el mensaje del backend cuando falla', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue({ response: { data: 'Sin permiso' } });
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    await usuario.click(screen.getByRole('button', { name: /Asignar 1 cuenta/ }));

    expect(await screen.findByText('⚠️ Sin permiso')).toBeInTheDocument();
  });

  it('cae a un mensaje generico cuando el error no es texto', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue({});
    responder();
    renderizar();
    await waitFor(() => expect(screen.getByText('Ana Torres')).toBeInTheDocument());

    await usuario.click(casillaDe('CU-001'));
    await usuario.click(screen.getByRole('button', { name: /Asignar 1 cuenta/ }));

    expect(await screen.findByText('⚠️ Ocurrió un error al asignar la cartera.')).toBeInTheDocument();
  });
});

describe('AsignacionSupervisor: pie y listas largas', () => {
  it('muestra Sin gestor cuando el equipo esta vacio', async () => {
    responder([], DEUDAS, []);
    renderizar();
    await waitFor(() => expect(screen.getByText(/Sin gestor/)).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /Asignar 0 cuenta/ })).toBeDisabled();
  });

  it('sugiere deslizar con mas de ocho gestores', async () => {
    const muchos = Array.from({ length: 9 }, (_, i) => ({
      idEmpleado: 100 + i,
      nombreCompleto: `Gestor ${i}`,
      usuario: `g${i}`,
      numeroEmpleado: `S9G0${i}`,
      rol: 'GESTOR',
      supervisor: { idEmpleado: 9 },
    }));
    responder(muchos);
    renderizar();
    await waitFor(() => expect(screen.getByText('Gestor 0')).toBeInTheDocument());

    expect(screen.getByText(/desliza/)).toBeInTheDocument();
  });

  it('sugiere deslizar con mas de diez cuentas', async () => {
    const muchas = Array.from({ length: 11 }, (_, i) => ({
      idDeuda: 100 + i,
      numeroCuenta: `CU-1${String(i).padStart(2, '0')}`,
      saldoPendiente: 100,
      fechaVencimiento: haceISO(50),
      estado: 'PENDIENTE',
      deudor: { nombreCompleto: 'Varios' },
    }));
    responder(EMPLEADOS, muchas, []);
    renderizar();
    await waitFor(() => expect(tituloDe('CU-100')).toBeInTheDocument());

    expect(screen.getByText('Seleccionar visibles (11)')).toBeInTheDocument();
    expect(screen.getAllByText(/desliza/)).toHaveLength(1);
  });
});
