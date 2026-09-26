import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import GestionForm from '../src/components/GestionForm';

jest.mock('axios');

jest.spyOn(console, 'error').mockImplementation(() => {});

const DEUDA = { idDeuda: 55 };
const DEUDOR = {
  idDeudor: 7,
  nombreCompleto: 'Verónica Castillo',
  campana: { idCampana: 1 },
  telefonos: [
    { numeroTelefono: '0991112222', tipoTelefono: 'Celular', estatus: 'Sin marcar' },
    { numeroTelefono: '0443334444', tipoTelefono: 'Fijo', estatus: 'Efectivo' },
  ],
};
const EMPLEADO = { idEmpleado: 3 };

const CONCEPTOS = [
  { idConcepto: 1, nombreConcepto: 'No contactado', categoria: 'GESTION', campana: { idCampana: 1 } },
  { idConcepto: 2, nombreConcepto: 'Promesa de pago', categoria: 'PROMESA', campana: { idCampana: 1 } },
  { idConcepto: 3, nombreConcepto: 'Compromiso de Promesa', categoria: 'ACUERDO', campana: { idCampana: 1 } },
  { idConcepto: 9, nombreConcepto: 'De otra campana', categoria: 'GESTION', campana: { idCampana: 2 } },
];
const MOTIVOS = [
  { idMotivo: 1, descripcion: 'Falta de fondos', campana: { idCampana: 1 } },
  { idMotivo: 2, descripcion: 'No contesta', campana: { idCampana: 1 } },
  { idMotivo: 9, descripcion: 'De otra campana', campana: { idCampana: 2 } },
];
const TIPOS_PROMESA = [
  { idTipoPromesa: 1, nombre: 'Parcial', campana: { idCampana: 1 } },
  { idTipoPromesa: 2, nombre: 'Promoción 20%', campana: { idCampana: 1 } },
  { idTipoPromesa: 3, nombre: 'Convenio Firma', campana: { idCampana: 1 } },
  { idTipoPromesa: 9, nombre: 'De otra campana', campana: { idCampana: 2 } },
];

const agregada = jest.fn();

const enDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const renderizar = (props = {}) =>
  render(
    <GestionForm
      deuda={DEUDA}
      deudor={DEUDOR}
      conceptos={CONCEPTOS}
      motivos={MOTIVOS}
      tiposPromesa={TIPOS_PROMESA}
      empleadoActual={EMPLEADO}
      diasMaximos={30}
      onGestionAgregada={agregada}
      {...props}
    />,
  );

const selects = () => screen.getAllByRole('combobox');
const concepto = () => selects()[0];
const motivo = () => selects()[1];
const montoPromesa = () => screen.getByPlaceholderText('Ej. 1500.00');
const montoPagado = () => screen.getByPlaceholderText(/opcional/);
const fechaInput = (container) => container.querySelector('input[type="date"]');
const observaciones = () => screen.getByRole('textbox');
const boton = () => screen.getByRole('button', { name: /Registrar Gestión/ });

const elegir = async (usuario, select, valor) => {
  await usuario.selectOptions(select, valor);
};

const llenarPromesa = async (
  usuario,
  container,
  { tipo = '1', telefono = '0991112222', fecha = enDias(10), conTipos = true } = {},
) => {
  await elegir(usuario, concepto(), '2');
  await elegir(usuario, motivo(), '1');
  await usuario.type(montoPromesa(), '1500');
  if (conTipos) await elegir(usuario, selects()[2], tipo);
  fireEvent.change(fechaInput(container), { target: { value: fecha } });
  await elegir(usuario, selects()[3], telefono);
};

const llenarMinimo = async (usuario) => {
  await elegir(usuario, concepto(), '1');
  await elegir(usuario, motivo(), '1');
  await usuario.type(observaciones(), 'Contestado el titular');
};

beforeEach(() => jest.clearAllMocks());

describe('GestionForm: catalogos por campana', () => {
  it('ofrece solo conceptos, motivos y tipos de la campana del deudor', () => {
    renderizar();

    expect(within(concepto()).getAllByRole('option').map(o => o.textContent)).toEqual([
      '-- Selecciona el concepto --',
      'No contactado',
      'Promesa de pago',
      'Compromiso de Promesa',
    ]);
    expect(within(motivo()).getAllByRole('option')).toHaveLength(3);
    expect(screen.queryByRole('option', { name: 'De otra campana' })).toBeNull();
  });

  it('funciona aunque no le lleguen tipos de promesa', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar({ tiposPromesa: undefined });

    await llenarPromesa(usuario, container, { conTipos: false });
    expect(screen.queryByRole('option', { name: 'Parcial' })).toBeNull();
    expect(montoPagado()).toBeInTheDocument();
  });
});

describe('GestionForm: gestion sin promesa', () => {
  it('oculta el bloque de promesa si el concepto no es promesa', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await elegir(usuario, concepto(), '1');

    expect(screen.queryByText(/Datos de la Promesa de Pago/)).toBeNull();
    expect(screen.queryByPlaceholderText('Ej. 1500.00')).toBeNull();
  });

  it('envia la carga util minima', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    renderizar();

    await llenarMinimo(usuario);
    await usuario.click(boton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith('/api/gestiones', {
      deuda: { idDeuda: 55 },
      empleado: { idEmpleado: 3 },
      concepto: { idConcepto: 1 },
      motivoNoPago: { idMotivo: 1 },
      codigoResultado: 'No contactado',
      comentarios: 'Contestado el titular',
    });
  });

  it('detecta la promesa por el nombre aunque la categoria no la mencione', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await elegir(usuario, concepto(), '3');

    expect(screen.getByText(/Datos de la Promesa de Pago/)).toBeInTheDocument();
  });
});

describe('GestionForm: promesa vigente', () => {
  it('advierte, bloquea el boton y no deja registrar', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar({ promesaVigente: true });

    await llenarPromesa(usuario, container);

    expect(screen.getByText(/ya tiene una promesa vigente/)).toBeInTheDocument();
    expect(boton()).toBeDisabled();

    // El boton esta deshabilitado, asi que el guard de JS solo se alcanza
    // saltandose la validacion nativa del formulario.
    fillObligatorios(container, '2');
    fireEvent.submit(container.querySelector('form'));

    expect(
      screen.getByText('Ya existe una promesa vigente para este producto. No se puede registrar otra promesa hasta que venza.'),
    ).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

const fillObligatorios = (container, conceptoValor) => {
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: conceptoValor } });
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '1' } });
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Con promesa previa' } });
};

describe('GestionForm: captura de promesa', () => {
  it('envia los datos completos de la promesa', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    const { container } = renderizar();

    await llenarPromesa(usuario, container, { tipo: '1', telefono: '0443334444' });
    await usuario.type(montoPagado(), '500');
    await usuario.type(observaciones(), 'Queda el viernes');
    await usuario.click(boton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const envio = axios.post.mock.calls[0][1];
    expect(envio.montoPromesa).toBe(1500);
    expect(envio.fechaPromesa).toBe(enDias(10));
    expect(envio.numeroMarcado).toBe('0443334444');
    expect(envio.tipoTelefonoMarcado).toBe('Fijo');
    expect(envio.tipoPromesa).toEqual({ idTipoPromesa: 1 });
    expect(envio.montoPagado).toBe(500);
    expect(envio.estadoBonificacion).toBeUndefined();
  });

  it('omite monto pagado y tipo de promesa cuando no se capturan', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const { container } = renderizar();

    // "Tipo de Promesa" y "Número que marcó" son required en el formulario,
    // pero el handler los trata como opcionales. Esa rama solo se alcanza
    // saltandose la validacion nativa.
    fillObligatorios(container, '2');
    fireEvent.change(screen.getByPlaceholderText('Ej. 1500.00'), { target: { value: '800' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: enDias(5) } });
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const envio = axios.post.mock.calls[0][1];
    expect(envio.montoPagado).toBeUndefined();
    expect(envio.tipoPromesa).toBeUndefined();
    expect(envio.tipoTelefonoMarcado).toBe('');
    expect(envio.montoPromesa).toBe(800);
  });

  it.each(['2', '3'])('marca PENDIENTE el tipo de promesa %s', async (tipo) => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    const { container } = renderizar();

    await llenarPromesa(usuario, container, { tipo });
    // El texto del banner esta partido por un <b>, asi que se ancla al inicio.
    expect(screen.getByText(/Estás capturando una/)).toBeInTheDocument();
    await usuario.type(observaciones(), 'Con beneficio extra');
    await usuario.click(boton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].estadoBonificacion).toBe('PENDIENTE');
  });

  it('muestra el tipo de telefono elegido y el guion cuando no hay', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar();

    await llenarPromesa(usuario, container);
    expect(screen.getByText('Celular')).toBeInTheDocument();

    fireEvent.change(fechaInput(container), { target: { value: '' } });
    await elegir(usuario, selects()[3], '');
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('GestionForm: alerta de fecha', () => {
  it('avisa cuando la fecha excede los dias permitidos', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar();

    await elegir(usuario, concepto(), '2');
    fireEvent.change(fechaInput(container), { target: { value: enDias(90) } });

    expect(screen.getByText(/supera los lineamientos permitidos/)).toBeInTheDocument();
    expect(fechaInput(container).className).toContain('border-red-500');
  });

  it('no avisa cuando la fecha esta dentro del rango', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar();

    await elegir(usuario, concepto(), '2');
    fireEvent.change(fechaInput(container), { target: { value: enDias(7) } });

    expect(screen.queryByText(/supera los lineamientos/)).toBeNull();
  });

  it('no avisa si la campana no define dias maximos', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar({ diasMaximos: 0 });

    await elegir(usuario, concepto(), '2');
    fireEvent.change(fechaInput(container), { target: { value: enDias(365) } });

    expect(screen.queryByText(/supera los lineamientos/)).toBeNull();
  });

  it('limpia la alerta al vaciar la fecha', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar();

    await elegir(usuario, concepto(), '2');
    fireEvent.change(fechaInput(container), { target: { value: enDias(90) } });
    fireEvent.change(fechaInput(container), { target: { value: '' } });

    expect(screen.queryByText(/supera los lineamientos/)).toBeNull();
  });
});

describe('GestionForm: telefonos del deudor', () => {
  it('arma un telefono principal cuando no hay lista', async () => {
    const usuario = userEvent.setup();
    const deudorSinLista = { ...DEUDOR, telefonos: [], telefonoPrincipal: '0800999888' };
    const { container } = renderizar({ deudor: deudorSinLista });

    await llenarPromesa(usuario, container, { telefono: '0800999888' });

    expect(screen.getByText('Celular')).toBeInTheDocument();
  });
});

describe('GestionForm: resultado del guardado', () => {
  it('limpia el formulario y avisa a la tarjeta al guardar', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    renderizar();

    await llenarMinimo(usuario);
    await usuario.click(boton());

    await waitFor(() => expect(agregada).toHaveBeenCalledTimes(1));
    expect(concepto()).toHaveValue('');
    expect(motivo()).toHaveValue('');
    expect(observaciones()).toHaveValue('');
  });

  it('no rompe cuando no recibe callback', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    renderizar({ onGestionAgregada: undefined });

    await llenarMinimo(usuario);
    await usuario.click(boton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });

  it('muestra el mensaje del backend cuando responde con texto', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue({ response: { data: 'La deuda ya fue liquidada' } });
    renderizar();

    await llenarMinimo(usuario);
    await usuario.click(boton());

    expect(await screen.findByText('La deuda ya fue liquidada')).toBeInTheDocument();
  });

  it('cae a un mensaje generico cuando la respuesta no es texto', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue({ response: { data: { campo: 'valor' } } });
    renderizar();

    await llenarMinimo(usuario);
    await usuario.click(boton());

    expect(
      await screen.findByText('Error al guardar. Revisa la consola para más detalles.'),
    ).toBeInTheDocument();
  });
});
