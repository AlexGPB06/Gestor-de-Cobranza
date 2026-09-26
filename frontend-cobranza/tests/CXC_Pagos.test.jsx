import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CXC_Pagos from '../src/components/CXC_Pagos';

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hace = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return aISO(d);
};
const hoy = () => aISO(new Date());

const deudaBanco = (over = {}) => ({
  idDeuda: 55,
  numeroCuenta: 'CU-055',
  saldoPendiente: 12000,
  fechaVencimiento: hace(40),
  tipoProducto: { nombreProducto: 'TDC Oro', tasaInteres: 15 },
  deudor: { idDeudor: 7, campana: { empresa: { tipo: 'BANCO' } } },
  ...over,
});

const PAGO = {
  idPago: 1,
  monto: 1500,
  fechaRegistro: '2026-03-10T10:00:00Z',
  metodoPago: 'Transferencia SPEI',
  deuda: { idDeuda: 55 },
};

const onCambiarDeuda = jest.fn();

const renderizar = ({ deuda = deudaBanco(), pagos = [PAGO], deudas = [deudaBanco()], ...over } = {}) =>
  render(
    <CXC_Pagos deuda={deuda} pagos={pagos} deudasDelDeudor={deudas} onCambiarDeuda={onCambiarDeuda} {...over} />,
  );

const fechaCorte = (container) => container.querySelector('input[type="date"]');

beforeEach(() => jest.clearAllMocks());

describe('CXC_Pagos: pagos recibidos', () => {
  it('cuenta los pagos del producto y los ordena del mas reciente', () => {
    renderizar({
      pagos: [
        { ...PAGO, idPago: 1, fechaRegistro: '2026-01-01T10:00:00Z', monto: 1000 },
        { ...PAGO, idPago: 2, fechaRegistro: '2026-05-01T10:00:00Z', monto: 2000 },
        { ...PAGO, idPago: 3, deuda: { idDeuda: 99 }, monto: 9999 },
      ],
    });

    expect(screen.getByText(/Últimos Pagos Recibidos/)).toHaveTextContent('(2)');
    const montos = screen.getAllByRole('listitem').map(li =>
      within(li).getByText(/^\$[\d,]+\.\d{2}$/).textContent,
    );
    expect(montos).toEqual(['$2,000.00', '$1,000.00']);
  });

  it('avisa cuando no hay pagos sobre el producto', () => {
    renderizar({ pagos: [] });

    expect(screen.getByText('No se han registrado pagos sobre este producto.')).toBeInTheDocument();
    expect(screen.queryByText('Total abonado')).toBeNull();
  });

  it('suma el total abonado tratando el monto ausente como cero', () => {
    renderizar({ pagos: [PAGO, { ...PAGO, idPago: 2, monto: undefined }] });

    expect(screen.getByText('Total abonado').nextSibling).toHaveTextContent('$1,500.00');
  });

  it('cae a $0.00 cuando el monto no es numerico', () => {
    renderizar({ pagos: [{ ...PAGO, monto: 'mucho' }] });

    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('$0.00');
  });

  it('cae a Sin método cuando el pago no trae metodo', () => {
    renderizar({ pagos: [{ ...PAGO, metodoPago: null }] });

    expect(screen.getByText('Sin método')).toBeInTheDocument();
  });

  it('muestra el ultimo abono y lo oculta cuando no hay pagos', () => {
    const { unmount } = renderizar({ pagos: [PAGO, { ...PAGO, idPago: 2, monto: 2000, fechaRegistro: '2026-05-01T10:00:00Z' }] });

    // El mas reciente es el de mayo, no el primero de la lista.
    expect(screen.getByText(/Último abono:/)).toHaveTextContent('$2,000.00');
    unmount();

    renderizar({ pagos: [] });
    expect(screen.queryByText(/Último abono:/)).toBeNull();
  });
});

describe('CXC_Pagos: selector de producto', () => {
  it('oculta el selector cuando solo hay un producto', () => {
    const { container } = renderizar({ deudas: [deudaBanco()] });

    expect(container.querySelector('select')).toBeNull();
  });

  it('cambia de producto y avisa a la tarjeta', async () => {
    const usuario = userEvent.setup();
    renderizar({ deudas: [deudaBanco(), { ...deudaBanco(), idDeuda: 56, numeroCuenta: 'CU-056', tipoProducto: null }] });

    const opciones = within(screen.getByRole('combobox')).getAllByRole('option').map(o => o.textContent);
    expect(opciones).toEqual(['CU-055 — TDC Oro', 'CU-056 — Sin tipo']);

    await usuario.selectOptions(screen.getByRole('combobox'), '56');
    expect(onCambiarDeuda).toHaveBeenCalledWith(56);
  });
});

describe('CXC_Pagos: proyeccion de mora', () => {
  it('calcula dias, interes y total con la fecha de hoy', () => {
    renderizar();

    expect(screen.getByText('Días de mora').nextSibling).toHaveTextContent('40 días');
    expect(screen.getByText('Interés moratorio acumulado').nextSibling).toHaveTextContent('$197.26');
    expect(screen.getByText('Total a pagar').nextSibling).toHaveTextContent('$12,197.26');
    expect(screen.getByText('15.00%')).toBeInTheDocument();
    expect(screen.getByText('Saldo del producto').nextSibling).toHaveTextContent('$12,000.00');
  });

  it('usa singular para un dia de mora', () => {
    renderizar({ deuda: deudaBanco({ fechaVencimiento: hace(1) }) });

    expect(screen.getByText('Días de mora').nextSibling).toHaveTextContent('1 día');
  });

  it('devuelve cero sin fecha de vencimiento', () => {
    renderizar({ deuda: deudaBanco({ fechaVencimiento: null }) });

    expect(screen.getByText('Días de mora').nextSibling).toHaveTextContent('0 días');
    expect(screen.getByText('Total a pagar').nextSibling).toHaveTextContent('$12,000.00');
    expect(screen.getByText(/desde —/)).toBeInTheDocument();
  });

  it('cae a tasa cero cuando el producto no trae tasa', () => {
    renderizar({ deuda: deudaBanco({ tipoProducto: { nombreProducto: 'TDC' } }) });

    expect(screen.getByText('0.00%')).toBeInTheDocument();
    expect(screen.getByText('Total a pagar').nextSibling).toHaveTextContent('$12,000.00');
  });

  it('trata el saldo ausente como cero', () => {
    renderizar({ deuda: deudaBanco({ saldoPendiente: undefined }) });

    expect(screen.getByText('Saldo del producto').nextSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total a pagar').nextSibling).toHaveTextContent('$0.00');
  });

  it('recalcula al mover la fecha de corte', () => {
    const { container } = renderizar();
    const corte = fechaCorte(container);

    expect(corte).toHaveValue(hoy());
    expect(corte).toHaveAttribute('min', hace(40));

    fireEvent.change(corte, { target: { value: hace(10) } });

    // Corte = hoy-10, vencimiento = hoy-40: la mora baja de 40 a 30 dias.
    expect(screen.getByText('Días de mora').nextSibling).toHaveTextContent('30 días');
  });

  it('vuelve a hoy cuando se vacia la fecha', () => {
    const { container } = renderizar();

    fireEvent.change(fechaCorte(container), { target: { value: hace(10) } });
    fireEvent.change(fechaCorte(container), { target: { value: '' } });

    expect(fechaCorte(container)).toHaveValue(hoy());
  });

  it('ofrece fechas rapidas y el boton Hoy', async () => {
    const usuario = userEvent.setup();
    const { container } = renderizar();

    await usuario.click(screen.getByRole('button', { name: '+30 días' }));
    const en30 = new Date();
    en30.setDate(en30.getDate() + 30);
    expect(fechaCorte(container)).toHaveValue(aISO(en30));
    expect(screen.getByText('Días de mora').nextSibling).toHaveTextContent('70 días');

    await usuario.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(fechaCorte(container)).toHaveValue(hoy());
  });
});

describe('CXC_Pagos: desglose bancario', () => {
  it('muestra el desglose solo para bancos', () => {
    const { unmount } = renderizar();

    expect(screen.getByText(/Desglose Bancario/)).toBeInTheDocument();
    expect(screen.getByText('Pago Mínimo (5%)').nextSibling).toHaveTextContent('$609.86');
    expect(screen.getByText('Saldo Capital').nextSibling).toHaveTextContent('$12,000.00');
    expect(screen.getByText('Pago de Morosidad').nextSibling).toHaveTextContent('$197.26');
    unmount();

    renderizar({ deuda: deudaBanco({ deudor: { idDeudor: 7, campana: { empresa: { tipo: 'SOFOM' } } } }) });
    expect(screen.queryByText(/Desglose Bancario/)).toBeNull();
  });

  it('pisa el minimo a 300 cuando el 5 porciento es menor', () => {
    renderizar({ deuda: deudaBanco({ saldoPendiente: 1000, fechaVencimiento: hace(40) }) });

    // Total ~1016.44; 5% ~50.82 < 300, asi que el minimo es 300.
    expect(screen.getByText('Pago Mínimo (5%)').nextSibling).toHaveTextContent('$300.00');
  });

  it('oculta el desglose cuando no hay campana', () => {
    renderizar({ deuda: deudaBanco({ deudor: { idDeudor: 7 } }) });

    expect(screen.queryByText(/Desglose Bancario/)).toBeNull();
  });
});
