import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import App from '../src/App';

/**
 * App coordina sesion, permisos por rol y navegacion entre vistas. Todas las
 * pantallas hijas se sustituyen por una marca para poder afirmar que la vista
 * correcta se monta, sin exercised el interior de cada componente.
 */
jest.mock('axios');

const marca = (nombre) => ({ __esModule: true, default: () => <div>{nombre}</div> });

/**
 * Las pantallas hijas se sustituyen por una marca, pero ademas se guardan sus
 * props en globalThis para poder invocar los manejadores que App les pasa
 * (buscar por cuenta, cambiar de deuda, seleccionar para gestion) sin montar
 * la interfaz real de cada componente.
 */
const propsDe = (nombre) => globalThis[`__props_${nombre}`];

jest.mock('../src/components/InfoGestion', () => ({
  __esModule: true,
  default: (props) => {
    globalThis.__props_info = props;
    return <div>VISTA_INFO</div>;
  },
}));
jest.mock('../src/components/CarteraGestor', () => ({
  __esModule: true,
  default: (props) => {
    globalThis.__props_cartera = props;
    return <div>VISTA_CARTERA</div>;
  },
}));
jest.mock('../src/components/MiMeta', () => marca('VISTA_META'));
jest.mock('../src/components/MiMetaEquipo', () => marca('VISTA_META_EQUIPO'));
jest.mock('../src/components/CampanaList', () => marca('VISTA_CAMPANAS'));
jest.mock('../src/components/CatalogosManager', () => marca('VISTA_CATALOGOS'));
jest.mock('../src/components/AuditoriaViewer', () => marca('VISTA_AUDITORIA'));
jest.mock('../src/components/AsignacionCartera', () => marca('VISTA_ASIGNACION'));
jest.mock('../src/components/EmpleadosManager', () => marca('VISTA_EMPLEADOS'));
jest.mock('../src/components/SupervisionPanel', () => marca('VISTA_SUPERVISION'));
jest.mock('../src/components/AsignacionSupervisor', () => marca('VISTA_ASIGNACION_SUP'));
jest.mock('../src/components/PromesasSupervisor', () => marca('VISTA_PROMESAS_SUP'));

const DEUDORES = [
  { idDeudor: 7, nombreCompleto: 'Cliente Uno', documentoIdentidad: 'ID-7' },
  { idDeudor: 8, nombreCompleto: 'Cliente Dos', documentoIdentidad: 'ID-8' },
];

const DEUDAS = [
  { idDeuda: 70, numeroCuenta: 'CU-070', saldoPendiente: 100, deudor: { idDeudor: 7 } },
  { idDeuda: 71, numeroCuenta: 'CU-071', saldoPendiente: 200, deudor: { idDeudor: 7 } },
  { idDeuda: 80, numeroCuenta: 'CU-080', saldoPendiente: 300, deudor: { idDeudor: 8 } },
];

/** Sirve las listas de cobranza del gestor; el resto de endpoints van vacios. */
function servirCartera() {
  axios.get.mockImplementation((url) => {
    if (url.includes('/api/deudores')) return Promise.resolve({ data: DEUDORES });
    if (url.includes('/api/deudas')) return Promise.resolve({ data: DEUDAS });
    return Promise.resolve({ data: [] });
  });
}



const sesion = (rol) => ({
  idEmpleado: 1,
  idEmpresa: 3,
  nombre: 'Persona',
  empresa: 'Acme',
  rol,
});

function iniciarSesion(rol) {
  localStorage.setItem('token', 'jwt-falso');
  localStorage.setItem('rol', rol);
  localStorage.setItem('empleado', JSON.stringify(sesion(rol)));
}

const urlPedida = (ruta) =>
  axios.get.mock.calls.some(([url]) => url.includes(ruta));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  axios.get.mockResolvedValue({ data: [] });
});

afterEach(() => {
  console.error.mockRestore();
});

describe('App: sesion', () => {
  it('pide el login cuando no hay sesion guardada', () => {
    render(<App />);

    expect(screen.getByText('Entrar al Sistema')).toBeInTheDocument();
  });

  it('recupera la sesion guardada sin pedir login de nuevo', async () => {
    iniciarSesion('ADMINISTRADOR');
    render(<App />);

    expect(screen.getByText('Sistema BPO')).toBeInTheDocument();
    expect(screen.queryByText('Entrar al Sistema')).toBeNull();
  });

  it('descarta una sesion corrupta y vuelve al login', () => {
    localStorage.setItem('empleado', '{esto no es json');
    render(<App />);

    expect(screen.getByText('Entrar al Sistema')).toBeInTheDocument();
    expect(localStorage.getItem('empleado')).toBeNull();
  });

  it('avisa que la sesion expiro y limpia el aviso', () => {
    sessionStorage.setItem('sesionExpirada', '1');
    render(<App />);

    expect(screen.getByText(/Tu sesión expiró/)).toBeInTheDocument();
    expect(sessionStorage.getItem('sesionExpirada')).toBeNull();
  });

  it('inicia sesion y guarda lo que devuelve el backend', async () => {
    axios.post.mockResolvedValue({
      status: 200,
      data: { token: 'jwt', rol: 'GESTOR', idEmpleado: 1, idEmpresa: 3, nombre: 'Gestor' },
    });
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.type(screen.getByPlaceholderText(/juan\.perez/i), 'gestor.s1');
    await usuario.type(screen.getByPlaceholderText(/contraseña/i), 'Secreto123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar al Sistema' }));

    await screen.findByText('Sistema BPO');
    expect(localStorage.getItem('token')).toBe('jwt');
  });

  it('muestra el error del backend al fallar el login', async () => {
    axios.post.mockRejectedValue({ response: { data: 'Usuario no encontrado' } });
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.type(screen.getByPlaceholderText(/juan\.perez/i), 'nadie');
    await usuario.type(screen.getByPlaceholderText(/contraseña/i), 'x');
    await usuario.click(screen.getByRole('button', { name: 'Entrar al Sistema' }));

    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument();
  });
});

describe('App: permisos por rol', () => {
  it('el gestor entra directo a la vista de gestion', async () => {
    iniciarSesion('GESTOR');
    render(<App />);

    expect(await screen.findByText('VISTA_INFO')).toBeInTheDocument();
  });

  it('el rol legado USUARIO tambien entra a gestion, no a una pantalla vacia', async () => {
    iniciarSesion('USUARIO');
    render(<App />);

    // Regresion: el menu permitia 'gestion' pero el render exigia rol === 'GESTOR'.
    expect(screen.getByRole('button', { name: /info\/gestión/i })).toBeInTheDocument();
    expect(await screen.findByText('VISTA_INFO')).toBeInTheDocument();
  });

  it('el administrador entra a su primera vista de administracion', async () => {
    iniciarSesion('ADMINISTRADOR');
    render(<App />);

    expect(await screen.findByText('VISTA_EMPLEADOS')).toBeInTheDocument();
  });

  it('el supervisor entra al monitoreo de su equipo', async () => {
    iniciarSesion('SUPERVISOR');
    render(<App />);

    expect(await screen.findByText('VISTA_SUPERVISION')).toBeInTheDocument();
  });

  it('un rol desconocido no monta ninguna vista de cobranza', async () => {
    iniciarSesion('INVENTADO');
    render(<App />);

    expect(screen.queryByText('VISTA_INFO')).toBeNull();
    expect(screen.queryByText('VISTA_EMPLEADOS')).toBeNull();
    expect(screen.queryByText('VISTA_SUPERVISION')).toBeNull();
  });

  it('el gestor no ve el menu de administracion', () => {
    iniciarSesion('GESTOR');
    render(<App />);

    expect(screen.queryByRole('button', { name: /alta \/ baja de empleados/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /catálogos/i })).toBeNull();
  });

  it('el administrador no ve el menu de supervision', () => {
    iniciarSesion('ADMINISTRADOR');
    render(<App />);

    expect(screen.queryByRole('button', { name: /monitoreo de equipo/i })).toBeNull();
  });
});

describe('App: navegacion entre vistas', () => {
  it('el gestor recorre cartera y meta', async () => {
    iniciarSesion('GESTOR');
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await usuario.click(screen.getByRole('button', { name: /mi cartera/i }));
    expect(await screen.findByText('VISTA_CARTERA')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /mi meta/i }));
    expect(await screen.findByText('VISTA_META')).toBeInTheDocument();
  });

  it('el administrador recorre las pantallas de administracion', async () => {
    iniciarSesion('ADMINISTRADOR');
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('VISTA_EMPLEADOS');

    await usuario.click(screen.getByRole('button', { name: /asignar cartera/i }));
    expect(await screen.findByText('VISTA_ASIGNACION')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /catálogos/i }));
    expect(await screen.findByText('VISTA_CATALOGOS')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /bitácora/i }));
    expect(await screen.findByText('VISTA_AUDITORIA')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /campañas/i }));
    expect(await screen.findByText('VISTA_CAMPANAS')).toBeInTheDocument();
  });

  it('el supervisor recorre sus cuatro pantallas', async () => {
    iniciarSesion('SUPERVISOR');
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('VISTA_SUPERVISION');

    await usuario.click(screen.getByRole('button', { name: /asignar carteras/i }));
    expect(await screen.findByText('VISTA_ASIGNACION_SUP')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /promesas del equipo/i }));
    expect(await screen.findByText('VISTA_PROMESAS_SUP')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /meta del equipo/i }));
    expect(await screen.findByText('VISTA_META_EQUIPO')).toBeInTheDocument();
  });
});

describe('App: consultas al backend segun el rol', () => {
  it('el gestor pide pagos, tickets y gestiones', async () => {
    iniciarSesion('GESTOR');
    render(<App />);

    await waitFor(() => expect(urlPedida('/api/pagos')).toBe(true));
    expect(urlPedida('/api/tickets')).toBe(true);
    expect(urlPedida('/api/gestiones')).toBe(true);
  });

  it('el administrador no pide pagos ni tickets porque le responderian 403', async () => {
    iniciarSesion('ADMINISTRADOR');
    render(<App />);

    await waitFor(() => expect(urlPedida('/api/campanas')).toBe(true));
    expect(urlPedida('/api/pagos')).toBe(false);
    expect(urlPedida('/api/tickets')).toBe(false);
    expect(urlPedida('/api/deudores')).toBe(false);
  });

  it('el supervisor no pide datos de cobranza', async () => {
    iniciarSesion('SUPERVISOR');
    render(<App />);

    await waitFor(() => expect(urlPedida('/api/campanas')).toBe(true));
    expect(urlPedida('/api/deudores')).toBe(false);
    expect(urlPedida('/api/pagos')).toBe(false);
  });
});

describe('App: activacion de cuenta', () => {
  const irAActivar = async (usuario) => {
    await usuario.click(screen.getByRole('button', { name: 'Primer Ingreso' }));
    await screen.findByRole('button', { name: 'Activar mi Cuenta' });
  };

  it('exige un codigo de empresa de 5 caracteres', async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await irAActivar(usuario);

    await usuario.type(screen.getByPlaceholderText('Ej. A1B2C'), 'AB1');
    await usuario.type(screen.getByPlaceholderText(/nombre de usuario/i), 'nuevo');
    await usuario.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'Secreto123');
    await usuario.click(screen.getByRole('button', { name: 'Activar mi Cuenta' }));

    expect(
      await screen.findByText(/código de empresa debe ser exactamente de 5 caracteres/i),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('exige una contraseña de al menos 8 caracteres', async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await irAActivar(usuario);

    await usuario.type(screen.getByPlaceholderText('Ej. A1B2C'), 'A1B2C');
    await usuario.type(screen.getByPlaceholderText(/nombre de usuario/i), 'nuevo');
    await usuario.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'corta');
    await usuario.click(screen.getByRole('button', { name: 'Activar mi Cuenta' }));

    expect(
      await screen.findByText(/la contraseña debe tener al menos 8 caracteres/i),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('envia el codigo en mayusculas y vuelve al login al activar bien', async () => {
    window.alert = jest.fn();
    axios.post.mockResolvedValue({ status: 200, data: { usuario: 'nuevo.s9' } });
    const usuario = userEvent.setup();
    render(<App />);
    await irAActivar(usuario);

    await usuario.type(screen.getByPlaceholderText('Ej. A1B2C'), 'a1b2c');
    await usuario.type(screen.getByPlaceholderText(/nombre de usuario/i), 'nuevo');
    await usuario.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'Secreto123');
    await usuario.click(screen.getByRole('button', { name: 'Activar mi Cuenta' }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/empleados/activar', {
        numeroEmpleado: 'A1B2C',
        nuevoUsuario: 'nuevo',
        nuevaContrasena: 'Secreto123',
      }),
    );
    // Vuelve al formulario de ingreso con el usuario ya escrito.
    expect(await screen.findByRole('button', { name: 'Entrar al Sistema' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/juan\.perez/i)).toHaveValue('nuevo.s9');
  });

  it('muestra el motivo del rechazo del backend', async () => {
    axios.post.mockRejectedValue({ response: { data: 'El código ya fue activado' } });
    const usuario = userEvent.setup();
    render(<App />);
    await irAActivar(usuario);

    await usuario.type(screen.getByPlaceholderText('Ej. A1B2C'), 'A1B2C');
    await usuario.type(screen.getByPlaceholderText(/nombre de usuario/i), 'nuevo');
    await usuario.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'Secreto123');
    await usuario.click(screen.getByRole('button', { name: 'Activar mi Cuenta' }));

    expect(await screen.findByText('El código ya fue activado')).toBeInTheDocument();
  });

  it('usa un texto generico si el backend no devuelve un mensaje', async () => {
    axios.post.mockRejectedValue({ response: { data: { error: 'algo' } } });
    const usuario = userEvent.setup();
    render(<App />);
    await irAActivar(usuario);

    await usuario.type(screen.getByPlaceholderText('Ej. A1B2C'), 'A1B2C');
    await usuario.type(screen.getByPlaceholderText(/nombre de usuario/i), 'nuevo');
    await usuario.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'Secreto123');
    await usuario.click(screen.getByRole('button', { name: 'Activar mi Cuenta' }));

    expect(
      await screen.findByText(/código inválido, usuario en uso o la cuenta ya fue activada/i),
    ).toBeInTheDocument();
  });
});

describe('App: busqueda por numero de cuenta', () => {
  /**
   * Espera a que la vista de gestion reciba la cartera ya cargada. Los props se
   * releen en cada asercion porque el mock solo los actualiza al re-renderizar.
   */
  const esperarInfo = async () => {
    await waitFor(() => expect(propsDe('info')?.deudas).toHaveLength(3));
    return propsDe('info');
  };

  const buscarCuenta = async (termino) => {
    let info = await esperarInfo();
    await act(async () => { info.onTerminoChange(termino); });
    info = await esperarInfo();
    await act(async () => { info.onBuscar({ preventDefault: () => {} }); });
  };

  it('encuentra el cliente y preselecciona su primera deuda', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await buscarCuenta('CU-080');

    const info = propsDe('info');
    expect(info.deudorBuscado.nombreCompleto).toBe('Cliente Dos');
    expect(info.deudaSeleccionadaId).toBe(80);
    expect(info.mensajeBusqueda).toBe('');
  });

  it('no distingue mayusculas ni espacios en el numero de cuenta', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await buscarCuenta('  cu-070  ');

    const info = propsDe('info');
    expect(info.deudorBuscado.nombreCompleto).toBe('Cliente Uno');
    // El cliente tiene dos deudas, se elige la primera.
    expect(info.deudaSeleccionadaId).toBe(70);
  });

  it('avisa cuando el numero de cuenta no existe', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await buscarCuenta('CU-999');

    const info = propsDe('info');
    expect(info.deudorBuscado).toBeNull();
    expect(info.deudaSeleccionadaId).toBeNull();
    expect(info.mensajeBusqueda).toMatch(/no se encontró ningún producto/i);
  });

  it('avisa tambien si el campo va vacio', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await buscarCuenta('   ');

    expect(propsDe('info').mensajeBusqueda).toMatch(/no se encontró ningún producto/i);
  });

  it('permite limpiar la seleccion', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await buscarCuenta('CU-080');
    let info = await esperarInfo();
    await act(async () => { info.limpiarSeleccion(); });

    info = await esperarInfo();
    expect(info.deudorBuscado).toBeNull();
    expect(info.deudaSeleccionadaId).toBeNull();
    expect(info.mensajeBusqueda).toBe('');
  });

  it('selecciona un cliente desde la cartera y vuelve a la vista de gestion', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await usuario.click(screen.getByRole('button', { name: /mi cartera/i }));
    await screen.findByText('VISTA_CARTERA');
    const cartera = propsDe('cartera');
    await act(async () => { cartera.onSeleccionar(DEUDORES[1], 80); });

    expect(await screen.findByText('VISTA_INFO')).toBeInTheDocument();
    const info = await esperarInfo();
    expect(info.deudorBuscado.nombreCompleto).toBe('Cliente Dos');
    expect(info.deudaSeleccionadaId).toBe(80);
  });

  it('tolera que la seleccion venga sin id de deuda', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('VISTA_INFO');

    await usuario.click(screen.getByRole('button', { name: /mi cartera/i }));
    await screen.findByText('VISTA_CARTERA');
    const cartera = propsDe('cartera');
    await act(async () => { cartera.onSeleccionar(DEUDORES[0], undefined); });

    const info = await esperarInfo();
    expect(info.deudorBuscado.nombreCompleto).toBe('Cliente Uno');
    expect(info.deudaSeleccionadaId).toBeNull();
  });
});

describe('App: cierre de sesion', () => {
  it('borra lo guardado y vuelve al login', async () => {
    servirCartera();
    iniciarSesion('GESTOR');
    const usuario = userEvent.setup();
    render(<App />);
    await screen.findByText('Sistema BPO');

    await usuario.click(screen.getByTitle(/cerrar sesi/i));

    expect(await screen.findByRole('button', { name: 'Entrar al Sistema' })).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('rol')).toBeNull();
    expect(localStorage.getItem('empleado')).toBeNull();
  });
});
