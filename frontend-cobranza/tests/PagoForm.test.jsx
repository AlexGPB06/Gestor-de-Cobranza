import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import PagoForm from '../src/components/PagoForm';

jest.mock('axios');

const alertSpy = jest.fn();
const exito = jest.fn();

const pendientes = () => {
  let resolver;
  const promesa = new Promise(r => { resolver = r; });
  return { promesa, resolver };
};

// Los label del componente no declaran htmlFor ni envuelven al control,
// asi que se localizan por placeholder y por rol.
const monto = () => screen.getByPlaceholderText('Ej. 500.00');
const metodo = () => screen.getByRole('combobox');
const boton = () => screen.getByRole('button', { name: /Aplicar Abono a la Deuda/ });

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = alertSpy;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  window.alert = undefined;
});

describe('PagoForm: deuda liquidada', () => {
  it('oculta el formulario cuando el saldo ya es cero', () => {
    const { container } = render(<PagoForm deudaId={1} saldoRestante={0} onPagoExitoso={exito} />);

    expect(screen.getByText('Cuenta Liquidada')).toBeInTheDocument();
    expect(screen.getByText('Esta deuda tiene un saldo de $0.00')).toBeInTheDocument();
    expect(container.querySelector('form')).toBeNull();
  });
});

describe('PagoForm: monto invalido', () => {
  it('el atributo max frena el envio de un monto mayor al saldo', async () => {
    const usuario = userEvent.setup();
    render(<PagoForm deudaId={1} saldoRestante={100} onPagoExitoso={exito} />);

    expect(monto()).toHaveAttribute('max', '100');

    await usuario.type(monto(), '150');
    await usuario.click(boton());

    // La validacion nativa cancela el submit, ni siquiera entra a handleSubmit.
    expect(axios.post).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('el guard de JavaScript corta el envio si el monto se salta el saldo', () => {
    axios.post.mockResolvedValue({ data: {} });
    const { container } = render(<PagoForm deudaId={1} saldoRestante={100} onPagoExitoso={exito} />);

    // fireEvent.submit omite la validacion nativa para alcanzar la segunda capa.
    fireEvent.change(monto(), { target: { value: '150' } });
    fireEvent.submit(container.querySelector('form'));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('supera el saldo actual'));
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('PagoForm: abono valido', () => {
  it('deshabilita el boton mientras no hay monto', () => {
    render(<PagoForm deudaId={7} saldoRestante={100} onPagoExitoso={exito} />);

    expect(boton()).toBeDisabled();
  });

  it('envia el pago con el metodo elegido y avisa a la tarjeta', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    render(<PagoForm deudaId={7} saldoRestante={100} onPagoExitoso={exito} />);

    await usuario.type(monto(), '75.50');
    await usuario.selectOptions(metodo(), 'Pago en Ventanilla');
    await usuario.click(boton());

    await waitFor(() => expect(exito).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith('/api/pagos', {
      monto: 75.5,
      metodoPago: 'Pago en Ventanilla',
      deuda: { idDeuda: 7 },
    });
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Pago aplicado exitosamente'));
    expect(monto()).toHaveValue(null);
  });

  it('usa SPEI como metodo por defecto', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    render(<PagoForm deudaId={7} saldoRestante={100} onPagoExitoso={exito} />);

    await usuario.type(monto(), '10');
    await usuario.click(boton());

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].metodoPago).toBe('Transferencia SPEI');
  });

  it('muestra Procesando mientras la peticion sigue abierta', async () => {
    const usuario = userEvent.setup();
    const { promesa, resolver } = pendientes();
    axios.post.mockReturnValue(promesa);
    render(<PagoForm deudaId={7} saldoRestante={100} onPagoExitoso={exito} />);

    await usuario.type(monto(), '20');
    await usuario.click(boton());

    const procesando = await screen.findByRole('button', { name: 'Procesando Transacción...' });
    expect(procesando).toBeDisabled();

    resolver({ data: {} });
    // Al cerrar la peticion el componente limpia el monto, asi que el boton
    // vuelve a su etiqueta idle y queda deshabilitado por falta de monto.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Aplicar Abono a la Deuda/ })).toBeInTheDocument(),
    );
    expect(monto()).toHaveValue(null);
  });

  it('no rompe cuando no recibe callback de exito', async () => {
    const usuario = userEvent.setup();
    axios.post.mockResolvedValue({ data: {} });
    render(<PagoForm deudaId={7} saldoRestante={100} />);

    await usuario.type(monto(), '20');
    await usuario.click(boton());

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('exitosamente')));
  });
});

describe('PagoForm: error del backend', () => {
  it('reporta el fallo y rehabilita el boton', async () => {
    const usuario = userEvent.setup();
    axios.post.mockRejectedValue(new Error('500 Internal Server Error'));
    render(<PagoForm deudaId={7} saldoRestante={100} onPagoExitoso={exito} />);

    await usuario.type(monto(), '20');
    await usuario.click(boton());

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Hubo un error al aplicar el pago. Revisa la consola.'),
    );
    expect(exito).not.toHaveBeenCalled();
    await waitFor(() => expect(boton()).toBeEnabled());
    expect(monto()).toHaveValue(20);
  });
});
