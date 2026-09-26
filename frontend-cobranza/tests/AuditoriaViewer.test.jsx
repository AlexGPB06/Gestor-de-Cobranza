import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AuditoriaViewer from '../src/components/AuditoriaViewer';

jest.mock('axios');

jest.spyOn(console, 'error').mockImplementation(() => {});

const LOG = {
  idLog: 1,
  fecha: '2026-03-01T10:00:00Z',
  empleado: { nombreCompleto: 'Verónica Castillo' },
  accion: 'CREATE_EMPLEADO',
  entidadAfectada: 'Empleado',
  detalles: 'Alta de empleado S1G09',
};

const refrescar = () => screen.getByRole('button', { name: /Refrescar/ });

beforeEach(() => jest.clearAllMocks());

describe('AuditoriaViewer: carga', () => {
  it('muestra el estado de carga y luego la tabla', async () => {
    axios.get.mockResolvedValue({ data: [LOG] });
    render(<AuditoriaViewer />);

    expect(screen.getByText('Cargando registros de seguridad...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Alta de empleado S1G09')).toBeInTheDocument());
    expect(axios.get).toHaveBeenCalledWith('/api/logs-auditoria');
  });

  it('ordena los registros del mas reciente al mas antiguo', async () => {
    axios.get.mockResolvedValue({
      data: [
        { ...LOG, idLog: 1, fecha: '2026-01-01T10:00:00Z', detalles: 'El mas viejo' },
        { ...LOG, idLog: 3, fecha: '2026-05-01T10:00:00Z', detalles: 'El mas nuevo' },
        { ...LOG, idLog: 2, fecha: '2026-03-01T10:00:00Z', detalles: 'El intermedio' },
      ],
    });
    render(<AuditoriaViewer />);

    await waitFor(() => expect(screen.getByText('El mas nuevo')).toBeInTheDocument());
    const fila = screen.getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell')[3].textContent);
    expect(fila).toEqual([
      'EmpleadoEl mas nuevo',
      'EmpleadoEl intermedio',
      'EmpleadoEl mas viejo',
    ]);
  });

  it('avisa cuando el servidor no responde', async () => {
    axios.get.mockRejectedValue(new Error('network down'));
    render(<AuditoriaViewer />);

    expect(
      await screen.findByText('No se pudo conectar con el servidor para obtener los registros de auditoría.'),
    ).toBeInTheDocument();
  });

  it('recarga la bitacora al refrescar', async () => {
    const usuario = userEvent.setup();
    axios.get.mockResolvedValue({ data: [LOG] });
    render(<AuditoriaViewer />);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    await usuario.click(refrescar());

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  });

  it('limpia el error anterior al reintentar', async () => {
    const usuario = userEvent.setup();
    axios.get.mockRejectedValueOnce(new Error('network down'));
    render(<AuditoriaViewer />);
    await screen.findByText(/No se pudo conectar/);

    axios.get.mockResolvedValue({ data: [LOG] });
    await usuario.click(refrescar());

    await waitFor(() => expect(screen.queryByText(/No se pudo conectar/)).toBeNull());
    expect(screen.getByText('Alta de empleado S1G09')).toBeInTheDocument();
  });
});

describe('AuditoriaViewer: contenido', () => {
  it('informa cuando no hay registros', async () => {
    axios.get.mockResolvedValue({ data: [] });
    render(<AuditoriaViewer />);

    expect(
      await screen.findByText('No hay registros de auditoría disponibles en este momento.'),
    ).toBeInTheDocument();
  });

  it.each([
    ['LOGIN', 'bg-green-100'],
    ['INSERT_DEUDA', 'bg-green-100'],
    ['CREATED', 'bg-green-100'],
    ['UPDATE_DEUDOR', 'bg-blue-100'],
    ['EDITAR', 'bg-blue-100'],
    ['DELETE_TICKET', 'bg-red-100'],
    ['REMOVE', 'bg-red-100'],
    ['OTRA_ACCION', 'bg-slate-100'],
  ])('colorea la accion %s', async (accion, clase) => {
    axios.get.mockResolvedValue({ data: [{ ...LOG, accion }] });
    render(<AuditoriaViewer />);

    await waitFor(() => expect(screen.getByText(accion)).toHaveClass(clase));
  });

  it('usa la clase por defecto cuando la accion viene vacia', async () => {
    axios.get.mockResolvedValue({ data: [{ ...LOG, accion: undefined }] });
    render(<AuditoriaViewer />);

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    expect(screen.getAllByRole('cell')[2].firstChild).toHaveClass('bg-slate-100');
  });

  it('adapta los nombres de campo alternativos del backend', async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          id: 77,
          fechaHora: '2026-04-01T10:00:00Z',
          usuario: 'admin.sistema',
          accion: 'LOGIN',
          modulo: 'Seguridad',
          descripcion: 'Inicio de sesion',
        },
      ],
    });
    render(<AuditoriaViewer />);

    await waitFor(() => expect(screen.getByText('#77')).toBeInTheDocument());
    expect(screen.getByText('admin.sistema')).toBeInTheDocument();
    expect(screen.getByText('Seguridad')).toBeInTheDocument();
    expect(screen.getByText('Inicio de sesion')).toBeInTheDocument();
  });

  it('cae al id del empleado cuando no hay nombre ni usuario', async () => {
    axios.get.mockResolvedValue({
      data: [{ ...LOG, empleado: null, usuario: undefined, idEmpleado: 12 }],
    });
    render(<AuditoriaViewer />);

    await waitFor(() => expect(screen.getByText('ID Empleado: 12')).toBeInTheDocument());
  });
});
