import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import BonificacionesTab from '../src/components/BonificacionesTab';

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

const DEUDOR = { idDeudor: 7, nombreCompleto: 'Verónica Castillo' };

const deudasCon = (tipoProducto) => [
  { idDeuda: 55, numeroCuenta: 'CU-055', tipoProducto: tipoProducto ? { nombreProducto: tipoProducto } : null, deudor: { idDeudor: 7 } },
  { idDeuda: 56, numeroCuenta: 'CU-056', deudor: null, idDeudor: 7 },
];

const base = (over = {}) => ({
  idGestion: 20,
  fechaRegistro: '2026-03-05T10:00:00Z',
  montoPromesa: 2000,
  estadoBonificacion: 'PENDIENTE',
  comentarios: 'Se aplicó descuento del 20%',
  deuda: { idDeuda: 55, numeroCuenta: 'CU-055' },
  empleado: { idEmpleado: 3, nombreCompleto: 'Ana Torres' },
  concepto: { nombreConcepto: 'Promesa de pago', categoria: 'GESTION' },
  tipoPromesa: { nombre: 'Promoción 20%' },
  ...over,
});

// El <p role="button"> toma su nombre accesible del contenido
// ("...Ver completo (Ctrl+F2)"), no del title.
const verCompleto = () => screen.getByRole('button', { name: /Ver completo/ });

const actualizados = jest.fn();

const renderizar = (gestiones, { tipoProducto = 'Tarjeta de Crédito', ...over } = {}) =>
  render(
    <BonificacionesTab
      deudor={DEUDOR}
      deudas={deudasCon(tipoProducto)}
      gestiones={gestiones}
      onDatosActualizados={actualizados}
      {...over}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
});

afterEach(() => {
  window.alert = undefined;
});

describe('BonificacionesTab: listado', () => {
  it('avisa cuando no hay promociones ni convenios', () => {
    renderizar([]);

    expect(
      screen.getByText('El cliente no tiene promociones o convenios gestionados.'),
    ).toBeInTheDocument();
  });

  it.each([
    [{ tipoPromesa: { nombre: 'Promoción 20%' } }, 'por tipo de promesa'],
    [
      { tipoPromesa: null, concepto: { nombreConcepto: 'Acuerdo', categoria: 'CONVENIO' } },
      'por categoria del concepto',
    ],
    [
      { tipoPromesa: null, concepto: { nombreConcepto: 'Promocion acordada', categoria: 'OTRO' } },
      'por nombre del concepto',
    ],
    [
      { tipoPromesa: null, concepto: null, codigoResultado: 'Convenio telefónico' },
      'por codigo de resultado',
    ],
  ])('detecta la promocion', (gestion) => {
    renderizar([base(gestion)]);

    expect(screen.getByText(/Historial de promociones y convenios del cliente/)).toHaveTextContent('(1)');
    expect(screen.getByText('Se aplicó descuento del 20%')).toBeInTheDocument();
  });

  it('excluye las gestiones que no son promocion y las de otras deudas', () => {
    renderizar([
      base(),
      { ...base(), idGestion: 21, tipoPromesa: null, concepto: { nombreConcepto: 'No contactado', categoria: 'GESTION' } },
      { ...base(), idGestion: 22, deuda: { idDeuda: 99, numeroCuenta: 'CU-099' } },
      { ...base(), idGestion: 23, deuda: null },
    ]);

    expect(screen.getByText(/Historial de promociones/)).toHaveTextContent('(1)');
  });

  it('ordena de la mas reciente a la mas antigua', () => {
    renderizar([
      { ...base(), idGestion: 24, fechaRegistro: '2026-01-01T10:00:00Z' },
      base(),
    ]);

    const montos = screen.getAllByText('$2,000.00');
    expect(montos).toHaveLength(2);
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('05');
  });

  it('cae a $0.00 cuando el monto no es numerico', () => {
    renderizar([{ ...base(), montoPromesa: 'mucho' }]);

    expect(screen.getAllByRole('row')[1]).toHaveTextContent('$0.00');
  });

  it('usa el guion cuando no hay comentario', () => {
    renderizar([{ ...base(), comentarios: null }]);

    expect(screen.getByText('— Sin comentario —')).toBeInTheDocument();
  });

  it('usa el id del empleado cuando no viene el nombre', () => {
    renderizar([{ ...base(), empleado: { idEmpleado: 5 } }]);

    expect(screen.getAllByRole('row')[1]).toHaveTextContent('ID 5');
  });

  it('cae a Sin tipo cuando no hay tipo ni concepto', () => {
    renderizar([{ ...base(), tipoPromesa: null, concepto: { categoria: 'PROMOCION' } }]);

    expect(screen.getByText('Sin tipo')).toBeInTheDocument();
  });

  it.each([
    ['APLICADA', '✅ Bonificación aplicada', 'bg-green-100'],
    ['APROBADA', 'APROBADA', 'bg-blue-100'],
    ['RECHAZADA', 'RECHAZADA', 'bg-red-100'],
    ['PENDIENTE', 'PENDIENTE', 'bg-amber-100'],
    [null, 'PENDIENTE', 'bg-amber-100'],
  ])('pinta el estado %s', (estado, texto, clase) => {
    renderizar([{ ...base(), estadoBonificacion: estado }]);

    // La insignia colisiona en texto con las <option> del selector,
    // asi que se localiza por su celda y su clase distintiva.
    const celda = screen.getAllByRole('row')[1].querySelectorAll('td')[6];
    const insignia = celda.querySelector('span.rounded-full');
    expect(insignia).toHaveTextContent(texto);
    expect(insignia).toHaveClass(clase);
    expect(screen.getByRole('combobox')).toHaveValue(estado || 'PENDIENTE');
  });
});

describe('BonificacionesTab: aviso por producto', () => {
  it.each([
    ['Tarjeta de Crédito', /Tarjeta de crédito: aplican reestructuras/],
    ['TDC Oro', /Tarjeta de crédito: aplican reestructuras/],
    ['Crédito Automotriz', /Tarjeta de crédito: aplican reestructuras/],
    ['Automóvil Nuevo', /Automóvil: aplican convenios/],
    ['Vehiculo', /Automóvil: aplican convenios/],
    ['Préstamo Personal', /Las bonificaciones dependen del producto/],
  ])('muestra el aviso para %s', (tipoProducto, aviso) => {
    renderizar([], { tipoProducto });

    expect(screen.getByText(aviso)).toBeInTheDocument();
  });

  it('avisa por defecto cuando la deuda no trae tipo de producto', () => {
    renderizar([], { tipoProducto: null });

    expect(screen.getByText(/Las bonificaciones dependen del producto/)).toBeInTheDocument();
  });
});

describe('BonificacionesTab: cambio de estado', () => {
  it('envia el estado elegido y avisa a la tarjeta', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    renderizar([base()]);

    await usuario.selectOptions(screen.getByRole('combobox'), 'APROBADA');

    await waitFor(() => expect(actualizados).toHaveBeenCalledTimes(1));
    expect(axios.put).toHaveBeenCalledWith(
      'http://localhost:8080/api/gestiones/20/estado-bonificacion',
      { estado: 'APROBADA' },
    );
  });

  it('bloquea el selector mientras guarda', async () => {
    const usuario = userEvent.setup();
    let resolver;
    axios.put.mockReturnValue(new Promise(r => { resolver = r; }));
    renderizar([base()]);

    const selector = screen.getByRole('combobox');
    await usuario.selectOptions(selector, 'APLICADA');

    expect(selector).toBeDisabled();
    resolver({ data: {} });
    await waitFor(() => expect(selector).toBeEnabled());
  });

  it('no rompe cuando no recibe callback de actualizacion', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    renderizar([base()], { onDatosActualizados: undefined });

    await usuario.selectOptions(screen.getByRole('combobox'), 'RECHAZADA');

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
  });

  it('alerta con el mensaje del backend cuando falla', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: 'No autorizado' } });
    renderizar([base()]);

    await usuario.selectOptions(screen.getByRole('combobox'), 'RECHAZADA');

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('No autorizado'));
  });

  it('cae a un mensaje generico cuando el error no es texto', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: { codigo: 3 } } });
    renderizar([base()]);

    await usuario.selectOptions(screen.getByRole('combobox'), 'RECHAZADA');

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Error al actualizar el estado.'),
    );
  });
});

describe('BonificacionesTab: detalle', () => {
  it('abre el detalle al pulsar el comentario y lo cierra', async () => {
    const usuario = userEvent.setup();
    renderizar([base()]);

    await usuario.click(verCompleto());
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 20');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('abre el detalle con Enter e ignora otras teclas', async () => {
    renderizar([base()]);
    const comentario = verCompleto();

    fireEvent.keyDown(comentario, { key: 'Tab' });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(comentario, { key: 'Enter' });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 20');
  });

  it('Ctrl+F2 reabre la ultima gestion vista', async () => {
    const usuario = userEvent.setup();
    renderizar([base()]);

    await usuario.click(verCompleto());
    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 20');

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('detecta F2 por code cuando la tecla no coincide', async () => {
    const usuario = userEvent.setup();
    renderizar([base()]);

    await usuario.click(verCompleto());
    // Algunos layouts no reportan key='F2'; el componente acepta code='F2'.
    fireEvent.keyDown(window, { key: 'Unidentified', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('Ctrl+F2 no hace nada si aun no se abrio ninguna gestion', () => {
    renderizar([base()]);

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: false });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });
});
