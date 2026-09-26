import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import PromesasTab from '../src/components/PromesasTab';

jest.mock('axios');

const DEUDOR = { idDeudor: 7, nombreCompleto: 'Verónica Castillo' };
const DEUDAS = [
  { idDeuda: 55, numeroCuenta: 'CU-055', deudor: { idDeudor: 7 } },
  { idDeuda: 56, numeroCuenta: 'CU-056', deudor: null, idDeudor: 7 },
  { idDeuda: 99, numeroCuenta: 'CU-099', deudor: { idDeudor: 8 } },
];

const base = (over = {}) => ({
  idGestion: 1,
  fechaRegistro: '2026-03-05T10:00:00Z',
  fechaPromesa: '2026-03-20',
  montoPromesa: 2000,
  montoPagado: 0,
  deuda: { idDeuda: 55, numeroCuenta: 'CU-055' },
  empleado: { idEmpleado: 3, nombreCompleto: 'Verónica Castillo' },
  concepto: { nombreConcepto: 'Promesa de pago', categoria: 'PROMESA' },
  ...over,
});

const PROMO = (estado = 'PENDIENTE', over = {}) =>
  base({ idGestion: 10, tipoPromesa: { nombre: 'Promoción 20%' }, estadoBonificacion: estado, ...over });

const NORMAL = () => base({ idGestion: 11, fechaRegistro: '2026-03-01T10:00:00Z', fechaPromesa: '2026-03-10', montoPromesa: 1000 });

const actualizados = jest.fn();
const subir118 = jest.fn();

const renderizar = (gestiones, over = {}) =>
  render(
    <PromesasTab
      deudor={DEUDOR}
      deudas={DEUDAS}
      gestiones={gestiones}
      onDatosActualizados={actualizados}
      onSubirTicket118={subir118}
      {...over}
    />,
  );

const filas = () => screen.getAllByRole('row').slice(1);

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
});

afterEach(() => {
  window.alert = undefined;
});

describe('PromesasTab: listado', () => {
  it('avisa cuando no hay promesas', () => {
    renderizar([]);

    expect(screen.getByText('Este cliente aún no tiene promesas de pago registradas.')).toBeInTheDocument();
  });

  it('filtra por deuda del deudor y por concepto promesa', () => {
    renderizar([
      NORMAL(),
      { ...NORMAL(), idGestion: 12, deuda: { idDeuda: 56, numeroCuenta: 'CU-056' } },
      { ...NORMAL(), idGestion: 13, deuda: { idDeuda: 99, numeroCuenta: 'CU-099' } },
      { ...NORMAL(), idGestion: 14, deuda: null },
      { ...NORMAL(), idGestion: 15, concepto: { nombreConcepto: 'No contactado', categoria: 'GESTION' } },
    ]);

    expect(screen.getByText(/Historial de todas las promesas de pago del cliente \(2\)/)).toBeInTheDocument();
    expect(filas()).toHaveLength(2);
  });

  it('detecta la promesa por codigo de resultado cuando no hay concepto', () => {
    renderizar([{ ...NORMAL(), concepto: null, codigoResultado: 'PROMESA TELEFONICA' }]);

    expect(filas()).toHaveLength(1);
  });

  it('ordena de la mas reciente a la mas antigua', () => {
    renderizar([NORMAL(), PROMO()]);

    const cuentas = filas().map(f => within(f).getAllByRole('cell')[0].textContent);
    expect(cuentas).toEqual(['CU-055', 'CU-055']);
    const fechas = filas().map(f => within(f).getAllByRole('cell')[3].textContent);
    expect(fechas).toEqual(['2026-03-20', '2026-03-10']);
  });

  it('cae a $0.00 cuando el monto no es numerico', () => {
    renderizar([{ ...NORMAL(), montoPromesa: 'mucho', montoPagado: undefined }]);

    const celdas = within(filas()[0]).getAllByRole('cell');
    expect(celdas[4]).toHaveTextContent('$0.00');
    expect(celdas[5]).toHaveTextContent('$0.00');
  });

  it('usa el id del empleado cuando no viene el nombre', () => {
    renderizar([{ ...NORMAL(), empleado: { idEmpleado: 4 } }]);

    expect(within(filas()[0]).getAllByRole('cell')[2]).toHaveTextContent('ID 4');
  });

  it('cae a Sin tipo cuando no hay tipo ni concepto', () => {
    renderizar([{ ...NORMAL(), tipoPromesa: undefined, concepto: { categoria: 'PROMESA' } }]);

    expect(within(filas()[0]).getAllByRole('cell')[6]).toHaveTextContent('Sin tipo');
  });

  it('pinta la cantidad sin pagar en gris y la pagada en verde', () => {
    renderizar([NORMAL(), PROMO('PENDIENTE', { idGestion: 12, montoPagado: 1500 })]);

    const botones = screen.getAllByTitle('Clic para editar la cantidad pagada');
    // El sort deja primero la promo (2026-03-05) y luego la normal (2026-03-01).
    expect(botones[0]).toHaveClass('bg-green-100', 'text-green-800');
    expect(botones[1]).toHaveClass('bg-slate-100');
  });
});

describe('PromesasTab: edicion del monto pagado', () => {
  it('guarda el monto y avisa a la tarjeta', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    renderizar([NORMAL()]);

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));
    const campo = screen.getByRole('spinbutton');
    await usuario.clear(campo);
    await usuario.type(campo, '500');
    await usuario.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(actualizados).toHaveBeenCalledTimes(1));
    expect(axios.put).toHaveBeenCalledWith('/api/gestiones/11/monto-pagado', {
      montoPagado: 500,
    });
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('precarga el valor actual al abrir el editor', async () => {
    const usuario = userEvent.setup();
    renderizar([{ ...NORMAL(), montoPagado: 250 }]);

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));

    expect(screen.getByRole('spinbutton')).toHaveValue(250);
  });

  it('envia cero cuando el campo queda vacio', async () => {
    axios.put.mockResolvedValue({ data: {} });
    renderizar([NORMAL()]);
    const usuario = userEvent.setup();

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
    await usuario.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1]).toEqual({ montoPagado: 0 });
  });

  it('cancela la edicion con la equis', async () => {
    const usuario = userEvent.setup();
    renderizar([NORMAL()]);

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: '✕' }));

    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('no rompe cuando no recibe callback de actualizacion', async () => {
    const usuario = userEvent.setup();
    axios.put.mockResolvedValue({ data: {} });
    renderizar([NORMAL()], { onDatosActualizados: undefined });

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));
    await usuario.type(screen.getByRole('spinbutton'), '100');
    await usuario.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
  });

  it('alerta con el mensaje del backend cuando falla el guardado', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: 'Monto inválido' } });
    renderizar([NORMAL()]);

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));
    await usuario.type(screen.getByRole('spinbutton'), '50');
    await usuario.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Monto inválido'));
    expect(actualizados).not.toHaveBeenCalled();
  });

  it('cae a un mensaje generico cuando el error no es texto', async () => {
    const usuario = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: { codigo: 7 } } });
    renderizar([NORMAL()]);

    await usuario.click(screen.getByTitle('Clic para editar la cantidad pagada'));
    await usuario.type(screen.getByRole('spinbutton'), '50');
    await usuario.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Error al guardar el monto pagado.'),
    );
  });
});

describe('PromesasTab: promocion y convenio', () => {
  it.each([
    ['APLICADA', '✅ Bonificación aplicada', 'bg-green-100'],
    ['APROBADA', 'APROBADA', 'bg-blue-100'],
    ['RECHAZADA', 'RECHAZADA', 'bg-red-100'],
    ['PENDIENTE', 'PENDIENTE', 'bg-amber-100'],
  ])('pinta el estado %s', (estado, texto, clase) => {
    renderizar([PROMO(estado)]);

    const insignia = screen.getByText(texto);
    expect(insignia).toHaveClass(clase);
    expect(within(filas()[0]).getAllByRole('cell')[6]).toHaveTextContent('Promoción 20%');
  });

  it('cae a PENDIENTE cuando la promo no trae estado', () => {
    renderizar([PROMO(null)]);

    const insignia = screen.getByText('PENDIENTE');
    expect(insignia).toHaveClass('bg-amber-100');
  });

  it('ofrece subir el ticket 118 cuando la promo ya tiene pago', async () => {
    const usuario = userEvent.setup();
    renderizar([PROMO('PENDIENTE', { montoPagado: 2000 })]);

    await usuario.click(screen.getByRole('button', { name: /Subir ticket 118/ }));

    expect(subir118).toHaveBeenCalledTimes(1);
    expect(subir118.mock.calls[0][0].idGestion).toBe(10);
  });

  it('pide el pago antes de escalar cuando la promo no tiene abono', () => {
    renderizar([PROMO('PENDIENTE', { montoPagado: 0 })]);

    expect(screen.getByText(/Al recibir el pago, sube el ticket 118/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subir ticket 118/ })).toBeNull();
  });

  it('no rompe cuando no recibe callback de escalamiento', async () => {
    const usuario = userEvent.setup();
    renderizar([PROMO('PENDIENTE', { montoPagado: 2000 })], { onSubirTicket118: undefined });

    await usuario.click(screen.getByRole('button', { name: /Subir ticket 118/ }));

    expect(axios.put).not.toHaveBeenCalled();
  });

  it('muestra un guion en la columna de escalamiento para promesas simples', () => {
    renderizar([NORMAL()]);

    expect(within(filas()[0]).getAllByRole('cell')[7]).toHaveTextContent('—');
  });
});
