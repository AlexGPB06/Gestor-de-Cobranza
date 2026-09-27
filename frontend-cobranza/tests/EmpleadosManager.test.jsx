import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import EmpleadosManager from '../src/components/EmpleadosManager';

jest.mock('axios');

const EMPRESAS = [
  { idEmpresa: 1, nombre: 'Acme' },
  { idEmpresa: 2, nombre: 'Globex' },
];

const DIRECTORIO = [
  {
    idEmpleado: 80,
    numeroEmpleado: 'S1SUP',
    nombreCompleto: 'María Teresa Gil',
    usuario: 'supervisor.s1',
    rol: 'SUPERVISOR',
    activo: true,
    pendienteRegistro: false,
  },
  {
    idEmpleado: 90,
    numeroEmpleado: 'S1G01',
    nombreCompleto: 'Verónica Castillo',
    usuario: 'gestor.s1.01',
    rol: 'GESTOR',
    activo: true,
    pendienteRegistro: false,
  },
  {
    idEmpleado: 95,
    numeroEmpleado: 'S9NEW',
    nombreCompleto: 'Alta Pendiente',
    usuario: null,
    rol: 'GESTOR',
    activo: false,
    pendienteRegistro: true,
  },
  {
    // Alta ya activada y luego dada de baja: es el unico caso que ofrece
    // "Reactivar"; un alta pendiente solo permite cambiarle el rol.
    idEmpleado: 85,
    numeroEmpleado: 'S8OFF',
    nombreCompleto: 'Empleado De Baja',
    usuario: 'gestor.s8',
    rol: 'GESTOR',
    activo: false,
    pendienteRegistro: false,
  },
];

/** Responde por URL y devuelve un objeto que se puede reasignar por prueba. */
function prepararRespuestas({ empleados = DIRECTORIO, empresas = EMPRESAS } = {}) {
  axios.get.mockImplementation((url) => {
    if (url.includes('/api/empresas')) {
      return Promise.resolve({ data: empresas });
    }
    if (url.includes('/api/empleados')) {
      return Promise.resolve({ data: empleados });
    }
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
}

/** Los labels no tienen htmlFor, asi que se localizan los selectores por orden. */
const selects = () => screen.getAllByRole('combobox');

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  prepararRespuestas();
});

describe('EmpleadosManager: carga del directorio', () => {
  it('muestra el directorio recibido del backend', async () => {
    render(<EmpleadosManager empresaId={1} />);

    expect(await screen.findByText('María Teresa Gil')).toBeInTheDocument();
    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
    expect(screen.getByText('Alta Pendiente')).toBeInTheDocument();
  });

  it('carga el directorio completo para que cualquier alta sea visible', async () => {
    render(<EmpleadosManager empresaId={2} />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('/api/empleados'),
    );
  });

  it('avisa cuando el directorio no se puede cargar', async () => {
    axios.get.mockImplementation((url) =>
      url.includes('/api/empresas')
        ? Promise.resolve({ data: EMPRESAS })
        : Promise.reject({ response: { data: 'El directorio no esta disponible' } }),
    );
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<EmpleadosManager empresaId={1} />);

    expect(await screen.findByText('El directorio no esta disponible')).toBeInTheDocument();
  });
});

describe('EmpleadosManager: buscador', () => {
  const buscador = () =>
    screen.getByPlaceholderText(/escribe el n.mero de empleado/i);

  it('filtra por numero de empleado', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.type(buscador(), 's1g01');

    expect(screen.queryByText('María Teresa Gil')).not.toBeInTheDocument();
    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
  });

  it('filtra por nombre sin distinguir mayusculas', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.type(buscador(), 'VERÓNICA');

    expect(screen.queryByText('María Teresa Gil')).not.toBeInTheDocument();
    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
  });

  it('filtra por rol', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.type(buscador(), 'supervisor');

    expect(screen.getByText('María Teresa Gil')).toBeInTheDocument();
    expect(screen.queryByText('Verónica Castillo')).not.toBeInTheDocument();
  });

  it('filtra por usuario asignado', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.type(buscador(), 'gestor.s1.01');

    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
    expect(screen.queryByText('María Teresa Gil')).not.toBeInTheDocument();
  });

  it('no rompe con una búsqueda sin resultados', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.type(buscador(), 'zzzzz');

    expect(screen.queryByText('María Teresa Gil')).not.toBeInTheDocument();
    expect(screen.queryByText('Verónica Castillo')).not.toBeInTheDocument();
  });

  it('restaura el directorio al limpiar la búsqueda', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.type(buscador(), 'zzzzz');
    await usuario.clear(buscador());

    expect(await screen.findByText('María Teresa Gil')).toBeInTheDocument();
  });
});

describe('EmpleadosManager: alta de personal', () => {
  const rellenarFormulario = async (usuario, { numero = 'AB123', rol = 'GESTOR' } = {}) => {
    await usuario.type(screen.getByPlaceholderText('Ej. Juan Pérez'), 'Nueva Persona');
    await usuario.type(screen.getByPlaceholderText('juan@bpo.com'), 'nueva@acme.com');
    await usuario.type(screen.getByPlaceholderText('5 Caracteres'), numero);
    await usuario.selectOptions(selects()[0], '1');
    await usuario.selectOptions(selects()[1], rol);
  };

  it('rechaza un numero de empleado que no tenga 5 caracteres', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await rellenarFormulario(usuario, { numero: 'AB1' });
    await usuario.click(screen.getByRole('button', { name: /registrar/i }));

    expect(
      await screen.findByText(/exactamente 5 caracteres/i),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('registra al empleado y avisa con el numero asignado', async () => {
    axios.post.mockResolvedValue({ data: { numeroEmpleado: 'AB123' } });
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await rellenarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /registrar/i }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/empleados', {
        nombreCompleto: 'Nueva Persona',
        correoElectronico: 'nueva@acme.com',
        numeroEmpleado: 'AB123',
        rol: 'GESTOR',
        idEmpresa: '1',
        idSupervisor: undefined,
      }),
    );
    expect(await screen.findByText(/Empleado registrado con el número AB123/)).toBeInTheDocument();
  });

  it('muestra el error que devuelve el backend al registrar', async () => {
    axios.post.mockRejectedValue({ response: { data: 'El correo ya está registrado' } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await rellenarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /registrar/i }));

    expect(await screen.findByText('El correo ya está registrado')).toBeInTheDocument();
  });

  it('usa un texto generico cuando el backend no explica el fallo', async () => {
    axios.post.mockRejectedValue({});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await rellenarFormulario(usuario);
    await usuario.click(screen.getByRole('button', { name: /registrar/i }));

    expect(await screen.findByText('No se pudo registrar el empleado.')).toBeInTheDocument();
  });

  it('genera un numero de empleado de 5 caracteres alfanumericos', async () => {
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);
    await screen.findByText('María Teresa Gil');

    await usuario.click(screen.getByText('Generar'));

    const valor = screen.getByPlaceholderText('5 Caracteres').value;
    expect(valor).toHaveLength(5);
    expect(valor).toMatch(/^[A-Z0-9]{5}$/);
  });
});

describe('EmpleadosManager: baja, reactivacion y cambio de rol', () => {
  it('da de baja a un empleado activo tras confirmar', async () => {
    axios.post.mockResolvedValue({ data: { mensaje: 'Empleado dado de baja' } });
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Verónica Castillo');
    const boton = within(fila.closest('tr')).getByRole('button', { name: /baja/i });
    await usuario.click(boton);

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/empleados/estado', {
        numeroEmpleado: 'S1G01',
        activo: 'false',
      }),
    );
    expect(await screen.findByText('Empleado dado de baja')).toBeInTheDocument();
  });

  it('no hace nada si el usuario cancela la confirmacion', async () => {
    window.confirm = jest.fn(() => false);
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Verónica Castillo');
    await usuario.click(within(fila.closest('tr')).getByRole('button', { name: /baja/i }));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('reactiva a un empleado que ya habia creado su usuario', async () => {
    axios.post.mockResolvedValue({ data: { mensaje: 'Empleado reactivado' } });
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Empleado De Baja');
    await usuario.click(within(fila.closest('tr')).getByRole('button', { name: /reactivar/i }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/empleados/estado', {
        numeroEmpleado: 'S8OFF',
        activo: 'true',
      }),
    );
  });

  it('en un alta pendiente solo se ofrece cambiar el rol', async () => {
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Alta Pendiente');
    const celda = fila.closest('tr');

    expect(within(celda).getByRole('button', { name: /cambiar rol/i })).toBeInTheDocument();
    expect(within(celda).queryByRole('button', { name: /reactivar/i })).toBeNull();
    expect(within(celda).queryByRole('button', { name: /eliminar/i })).toBeNull();
  });

  it('cambia el rol de un empleado tras confirmar', async () => {
    axios.put.mockResolvedValue({ data: { mensaje: 'Rol actualizado a SUPERVISOR' } });
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Verónica Castillo');
    const celda = fila.closest('tr');
    await usuario.click(within(celda).getByRole('button', { name: /cambiar rol/i }));
    await usuario.selectOptions(within(celda).getByRole('combobox'), 'SUPERVISOR');
    await usuario.click(within(celda).getByRole('button', { name: /guardar/i }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('/api/empleados/S1G01/rol', {
        rol: 'SUPERVISOR',
      }),
    );
    expect(await screen.findByText('Rol actualizado a SUPERVISOR')).toBeInTheDocument();
  });

  it('muestra el error del backend al cambiar el rol', async () => {
    axios.put.mockRejectedValue({ response: { data: 'No puedes modificar tu propio rol' } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Verónica Castillo');
    const celda = fila.closest('tr');
    await usuario.click(within(celda).getByRole('button', { name: /cambiar rol/i }));
    await usuario.click(within(celda).getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('No puedes modificar tu propio rol')).toBeInTheDocument();
  });

  it('muestra el error del backend al cambiar el estado', async () => {
    axios.post.mockRejectedValue({ response: { data: 'Solo el administrador puede dar de baja' } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<EmpleadosManager empresaId={1} />);

    const fila = await screen.findByText('Verónica Castillo');
    await usuario.click(within(fila.closest('tr')).getByRole('button', { name: /baja/i }));

    expect(
      await screen.findByText('Solo el administrador puede dar de baja'),
    ).toBeInTheDocument();
  });
});
