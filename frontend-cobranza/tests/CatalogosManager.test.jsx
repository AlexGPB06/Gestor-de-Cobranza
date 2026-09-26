import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import CatalogosManager from '../src/components/CatalogosManager';

jest.mock('axios');

const MOTIVOS = [
  { id: 1, descripcion: 'Falta de fondos' },
  { id: 2, descripcion: 'No reconoce el cargo' },
];

const PRODUCTOS = [{ id: 7, nombre: 'Tarjeta de credito' }];

/** Cada endpoint devuelve un catalogo distinto para detectar la URL equivocada. */
function prepararPorEndpoint() {
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/api/motivos-no-pago')) return Promise.resolve({ data: MOTIVOS });
    if (url.endsWith('/api/tipos-producto')) return Promise.resolve({ data: PRODUCTOS });
    if (url.endsWith('/api/rubros-cobro')) return Promise.resolve({ data: [] });
    if (url.endsWith('/api/conceptos')) return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
}

const campo = () => screen.getByPlaceholderText(/ingresa el nuevo valor/i);
const guardar = () => screen.getByRole('button', { name: 'Guardar Registro' });
const filaDe = (texto) => screen.getByText(texto).closest('tr');

beforeEach(() => {
  jest.clearAllMocks();
  prepararPorEndpoint();
  window.confirm = jest.fn(() => true);
});

describe('CatalogosManager: lectura', () => {
  it('abre en el catalogo de motivos de no pago', async () => {
    render(<CatalogosManager />);

    expect(await screen.findByText('Falta de fondos')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/motivos-no-pago');
  });

  it('cambia de catalogo y recarga usando el endpoint correcto', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(screen.getByRole('button', { name: 'Tipos de Producto' }));

    expect(await screen.findByText('Tarjeta de credito')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/tipos-producto');
  });

  it('cambia la columna y el campo del formulario segun el catalogo', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');
    expect(screen.getByText('descripcion', { selector: 'label' })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Tipos de Producto' }));

    expect(await screen.findByText('nombre', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'nombre' })).toBeInTheDocument();
  });

  it('informa cuando el catalogo esta vacio', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(screen.getByRole('button', { name: 'Rubros de Cobro' }));

    expect(await screen.findByText('No hay registros en este catálogo.')).toBeInTheDocument();
  });

  it('avisa si no se pueden obtener los datos', async () => {
    axios.get.mockRejectedValue(new Error('500'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CatalogosManager />);

    expect(await screen.findByText('Error al obtener los datos del servidor.')).toBeInTheDocument();
  });

  it('descarta la notificacion anterior al cambiar de pestana', async () => {
    axios.get.mockRejectedValueOnce(new Error('500'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Error al obtener los datos del servidor.');

    await usuario.click(screen.getByRole('button', { name: 'Tipos de Producto' }));

    await screen.findByText('Tarjeta de credito');
    expect(screen.queryByText('Error al obtener los datos del servidor.')).toBeNull();
  });
});

describe('CatalogosManager: alta', () => {
  it('crea el registro con la clave del catalogo activo', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.type(campo(), 'Sin respuesta');
    await usuario.click(guardar());

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith('/api/motivos-no-pago', {
        descripcion: 'Sin respuesta',
      }),
    );
    expect(await screen.findByText('Registro creado exitosamente.')).toBeInTheDocument();
    expect(campo()).toHaveValue('');
  });

  it('no envia nada si el valor esta en blanco', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.type(campo(), '   ');
    await usuario.click(guardar());

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('avisa cuando el alta falla', async () => {
    axios.post.mockRejectedValue({ response: { status: 409 } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.type(campo(), 'Duplicado');
    await usuario.click(guardar());

    expect(await screen.findByText('No se pudo guardar el registro.')).toBeInTheDocument();
  });
});

describe('CatalogosManager: edicion', () => {
  it('carga el valor actual en el campo de edicion', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Editar' }));

    expect(filaDe('#1').querySelector('input')).toHaveValue('Falta de fondos');
  });

  it('guarda la edicion con la clave del catalogo', async () => {
    axios.put.mockResolvedValue({ data: {} });
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Editar' }));
    const campoEdicion = filaDe('#1').querySelector('input');
    await usuario.clear(campoEdicion);
    await usuario.type(campoEdicion, 'Sin fondos');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('/api/motivos-no-pago/1', {
        descripcion: 'Sin fondos',
      }),
    );
    expect(await screen.findByText('Registro actualizado exitosamente.')).toBeInTheDocument();
  });

  it('cancela la edicion sin tocar el servidor', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Editar' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(axios.put).not.toHaveBeenCalled();
    expect(screen.getByText('Falta de fondos')).toBeInTheDocument();
  });

  it('descarta la edicion si el usuario queda en blanco', async () => {
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Editar' }));
    const campoEdicion = filaDe('#1').querySelector('input');
    await usuario.clear(campoEdicion);
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(axios.put).not.toHaveBeenCalled();
  });

  it('avisa cuando la actualizacion falla', async () => {
    axios.put.mockRejectedValue({ response: { status: 409 } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Editar' }));
    const campoEdicion = filaDe('#1').querySelector('input');
    await usuario.clear(campoEdicion);
    await usuario.type(campoEdicion, 'Otro');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No se pudo actualizar el registro.')).toBeInTheDocument();
  });
});

describe('CatalogosManager: borrado', () => {
  it('elimina el registro confirmado', async () => {
    axios.delete.mockResolvedValue({ data: {} });
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Eliminar' }));

    expect(window.confirm).toHaveBeenCalledWith('¿Estás seguro de eliminar este registro?');
    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('/api/motivos-no-pago/1'),
    );
    expect(await screen.findByText('Registro eliminado correctamente.')).toBeInTheDocument();
  });

  it('no borra nada si el usuario cancela la confirmacion', async () => {
    window.confirm = jest.fn(() => false);
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Eliminar' }));

    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('avisa cuando el registro esta en uso por otra tabla', async () => {
    axios.delete.mockRejectedValue({ response: { status: 409 } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const usuario = userEvent.setup();
    render(<CatalogosManager />);
    await screen.findByText('Falta de fondos');

    await usuario.click(within(filaDe('Falta de fondos')).getByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText('Error al eliminar. Puede que esté en uso por otra tabla.'),
    ).toBeInTheDocument();
  });
});
