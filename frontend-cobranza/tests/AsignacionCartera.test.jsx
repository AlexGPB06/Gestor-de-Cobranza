import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AsignacionCartera from '../src/components/AsignacionCartera';

jest.mock('axios');

const EMPLEADOS = [
  { idEmpleado: 90, nombreCompleto: 'Verónica Castillo', activo: true },
  { idEmpleado: 80, nombreCompleto: 'María Teresa Gil', activo: true },
  // No debe aparecer en el selector: es un alta inactiva.
  { idEmpleado: 99, nombreCompleto: 'Empleado De Baja', activo: false },
];

const DEUDAS = [
  {
    idDeuda: 1,
    numeroCuenta: 'CU-001',
    saldoPendiente: 1500,
    tipoProducto: { nombreProducto: 'Tarjeta' },
    deudor: { nombreCompleto: 'Cliente Uno', documentoIdentidad: 'ID-1' },
  },
  {
    idDeuda: 2,
    numeroCuenta: 'CU-002',
    saldoPendiente: 0,
    tipoProducto: null,
    deudor: null,
  },
  {
    idDeuda: 3,
    numeroCuenta: 'CU-003',
    saldoPendiente: 320.5,
    tipoProducto: { nombreProducto: 'Prestamo' },
    deudor: { nombreCompleto: 'Cliente Tres', documentoIdentidad: 'ID-3' },
  },
];

const ASIGNACIONES = [
  { idAsignacionCartera: 1, estatusActiva: true, deuda: { idDeuda: 2 }, empleado: { idEmpleado: 80, nombreCompleto: 'María Teresa Gil' } },
];

function prepararRespuestas({ empleados = EMPLEADOS, deudas = DEUDAS, asignaciones = ASIGNACIONES } = {}) {
  axios.get.mockImplementation((url) => {
    if (url.includes('/api/empleados')) return Promise.resolve({ data: empleados });
    if (url.includes('/api/deudas')) return Promise.resolve({ data: deudas });
    if (url.includes('/api/asignaciones-cartera')) return Promise.resolve({ data: asignaciones });
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
}

const guardar = () => screen.getByRole('button', { name: /guardar asignaci/i });

beforeEach(() => {
  jest.clearAllMocks();
  prepararRespuestas();
});

describe('AsignacionCartera: carga', () => {
  it('muestra las cuentas de la cartera', async () => {
    render(<AsignacionCartera empresaId={1} />);

    expect(await screen.findByText('CU-001')).toBeInTheDocument();
    expect(screen.getByText('Cliente Uno')).toBeInTheDocument();
    expect(screen.getByText(/Cuentas de la Cartera \(3\)/)).toBeInTheDocument();
  });

  it('filtra la consulta por empresa', async () => {
    render(<AsignacionCartera empresaId={7} />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('/api/deudas', {
        params: { empresaId: 7 },
      }),
    );
  });

  it('solo ofrece gestores activos en el selector', async () => {
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    const selector = screen.getByRole('combobox');
    const opciones = within(selector).getAllByRole('option').map((o) => o.textContent);

    expect(opciones.some((o) => o.includes('Verónica Castillo'))).toBe(true);
    expect(opciones.some((o) => o.includes('María Teresa Gil'))).toBe(true);
    expect(opciones.some((o) => o.includes('Empleado De Baja'))).toBe(false);
  });

  it('avisa cuando no se puede conectar con la base de datos', async () => {
    axios.get.mockRejectedValue(new Error('sin red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AsignacionCartera empresaId={1} />);

    expect(
      await screen.findByText('Error al conectar con la base de datos.'),
    ).toBeInTheDocument();
  });

  it('informa cuando la empresa no tiene cuentas', async () => {
    prepararRespuestas({ deudas: [] });

    render(<AsignacionCartera empresaId={1} />);

    expect(
      await screen.findByText('No hay cuentas registradas para esta empresa.'),
    ).toBeInTheDocument();
  });
});

describe('AsignacionCartera: estado de cada cuenta', () => {
  it('marca como ya asignada la cuenta que pertenece a un gestor', async () => {
    render(<AsignacionCartera empresaId={1} />);

    const fila = (await screen.findByText('CU-002')).closest('tr');

    expect(within(fila).getByText(/María Teresa Gil/)).toBeInTheDocument();
    expect(within(fila).queryByRole('checkbox')).toBeNull();
  });

  it('deja libre y con casilla la cuenta sin asignar', async () => {
    render(<AsignacionCartera empresaId={1} />);

    const fila = (await screen.findByText('CU-001')).closest('tr');

    expect(within(fila).getByText('Libre')).toBeInTheDocument();
    expect(within(fila).getByRole('checkbox')).toBeInTheDocument();
  });

  it('indica cuantas cuentas ya estan asignadas', async () => {
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    expect(screen.getByText(/1 cuenta\(s\) ya asignadas/)).toBeInTheDocument();
  });

  it('formatea el saldo como moneda y distingue el que ya esta saldado', async () => {
    render(<AsignacionCartera empresaId={1} />);

    expect(await screen.findByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('cae en textos por defecto cuando faltan el cliente o el producto', async () => {
    render(<AsignacionCartera empresaId={1} />);

    const fila = (await screen.findByText('CU-002')).closest('tr');

    expect(within(fila).getByText('Sin tipo')).toBeInTheDocument();
    expect(within(fila).getByText('Sin cliente')).toBeInTheDocument();
  });
});

describe('AsignacionCartera: seleccion', () => {
  it('selecciona y deselecciona una cuenta con la casilla', async () => {
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);

    const casilla = within((await screen.findByText('CU-001')).closest('tr')).getByRole('checkbox');
    await usuario.click(casilla);
    expect(casilla).toBeChecked();

    await usuario.click(casilla);
    expect(casilla).not.toBeChecked();
  });

  it('selecciona todas las cuentas libres de una vez', async () => {
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.click(screen.getByRole('button', { name: /seleccionar todas/i }));

    expect(within((await screen.findByText('CU-001')).closest('tr')).getByRole('checkbox')).toBeChecked();
    expect(within(screen.getByText('CU-003').closest('tr')).getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: /deseleccionar todas/i })).toBeInTheDocument();
  });

  it('no intenta seleccionar la cuenta que ya tiene gestor', async () => {
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.click(screen.getByRole('button', { name: /seleccionar todas/i }));

    // Solo quedan marcadas las dos libres.
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('vuelve a desmarcarlo todo con el mismo boton', async () => {
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    const seleccionar = screen.getByRole('button', { name: /seleccionar todas/i });
    await usuario.click(seleccionar);
    await usuario.click(screen.getByRole('button', { name: /deseleccionar todas/i }));

    expect(within((await screen.findByText('CU-001')).closest('tr')).getByRole('checkbox')).not.toBeChecked();
  });
});

describe('AsignacionCartera: guardado', () => {
  it('exige elegir un gestor antes de guardar', async () => {
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.click(within(screen.getByText('CU-001').closest('tr')).getByRole('checkbox'));
    await usuario.click(guardar());

    expect(await screen.findByText('Por favor, selecciona un gestor.')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('exige seleccionar al menos una cuenta', async () => {
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.selectOptions(screen.getByRole('combobox'), '90');
    await usuario.click(guardar());

    expect(
      await screen.findByText('Debes seleccionar al menos una cuenta (producto) para asignar.'),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('envia una peticion por cada cuenta seleccionada', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.selectOptions(screen.getByRole('combobox'), '90');
    await usuario.click(screen.getByRole('button', { name: /seleccionar todas/i }));
    await usuario.click(guardar());

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
    expect(axios.post).toHaveBeenCalledWith(
      '/api/asignaciones-cartera',
      expect.objectContaining({
        empleado: { idEmpleado: '90' },
        estatusActiva: true,
      }),
    );
    expect(
      await screen.findByText(/Se asignaron 2 cuentas al gestor exitosamente/),
    ).toBeInTheDocument();
  });

  it('limpia el formulario tras guardar', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.selectOptions(screen.getByRole('combobox'), '90');
    await usuario.click(screen.getByRole('button', { name: /seleccionar todas/i }));
    await usuario.click(guardar());

    await screen.findByText(/Se asignaron/);
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(within(screen.getByText('CU-001').closest('tr')).getByRole('checkbox')).not.toBeChecked();
  });

  it('avisa cuando el guardado falla', async () => {
    axios.post.mockRejectedValue({ response: { status: 403 } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<AsignacionCartera empresaId={1} />);
    await screen.findByText('CU-001');

    await usuario.selectOptions(screen.getByRole('combobox'), '90');
    await usuario.click(within(screen.getByText('CU-001').closest('tr')).getByRole('checkbox'));
    await usuario.click(guardar());

    expect(
      await screen.findByText(/Ocurrió un error al guardar las asignaciones/),
    ).toBeInTheDocument();
  });
});
