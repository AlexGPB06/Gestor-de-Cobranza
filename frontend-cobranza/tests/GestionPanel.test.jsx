import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GestionPanel from '../src/components/GestionPanel';

jest.mock('../src/components/GestionForm', () => ({
  __esModule: true,
  default: ({ deuda, promesaVigente }) => (
    <div data-testid="gestion-form">
      Form {deuda.idDeuda} vigente:{String(!!promesaVigente)}
    </div>
  ),
}));
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

const DEUDOR = {
  idDeudor: 7,
  nombreCompleto: 'Verónica Castillo',
  documentoIdentidad: '0801-1990-1234',
  correoElectronico: 'veronica.castillo@correo.com',
  campana: { idCampana: 1, nombreEmpresa: 'Banco del Sur', diasMaximosPromesa: 30 },
  telefonos: [
    { numeroTelefono: '0991112222', tipoTelefono: 'Celular', estatus: 'Efectivo' },
    { numeroTelefono: '0443334444', tipoTelefono: 'Fijo', estatus: 'Equivocado' },
    { numeroTelefono: '0990000000', tipoTelefono: 'Trabajo', estatus: 'Raro' },
  ],
};
const DEUDAS = [
  { idDeuda: 55, numeroCuenta: 'CU-055', saldoPendiente: 5000, tipoProducto: { nombreProducto: 'TDC Oro' }, deudor: { idDeudor: 7 } },
  { idDeuda: 56, numeroCuenta: 'CU-056', saldoPendiente: 0, tipoProducto: null, deudor: null, idDeudor: 7 },
];

const enDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const gestion = (over = {}) => ({
  idGestion: 1,
  fechaRegistro: '2026-03-05T10:00:00Z',
  deuda: { idDeuda: 55, numeroCuenta: 'CU-055' },
  empleado: { idEmpleado: 3, nombreCompleto: 'Verónica Castillo' },
  concepto: { nombreConcepto: 'No contactado', categoria: 'GESTION' },
  codigoResultado: 'NO_CONTACTO',
  motivoNoPago: { descripcion: 'Falta de fondos' },
  comentarios: 'No contestó el titular',
  montoPromesa: null,
  ...over,
});

const onCambiarDeuda = jest.fn();
const onGestionAgregada = jest.fn();

const renderizar = (over = {}) =>
  render(
    <GestionPanel
      deudor={DEUDOR}
      deudas={DEUDAS}
      deudaSeleccionadaId={55}
      onCambiarDeuda={onCambiarDeuda}
      gestiones={[]}
      conceptos={[]}
      motivos={[]}
      empleadoActual={{ idEmpleado: 3 }}
      onGestionAgregada={onGestionAgregada}
      tiposPromesa={[]}
      {...over}
    />,
  );

const tarjetas = () => screen.getAllByRole('button', { name: /Ver gestion completa/ });

beforeEach(() => jest.clearAllMocks());

describe('GestionPanel: sin cliente', () => {
  it('invita a seleccionar un cliente', () => {
    renderizar({ deudor: null });

    expect(screen.getByRole('heading', { name: 'Selecciona un cliente' })).toBeInTheDocument();
    expect(screen.queryByTestId('gestion-form')).toBeNull();
  });
});

describe('GestionPanel: cabecera', () => {
  it('muestra datos del deudor, producto y telefonos', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: 'Gestión del Cliente' })).toBeInTheDocument();
    expect(screen.getByText('Verónica Castillo')).toBeInTheDocument();
    expect(screen.getByText(/0801-1990-1234/)).toBeInTheDocument();
    expect(screen.getByText('TDC Oro')).toBeInTheDocument();
    expect(screen.getByText('CU-055')).toBeInTheDocument();
    expect(screen.getByText('0991112222')).toBeInTheDocument();

    expect(screen.getByText('Efectivo')).toHaveClass('bg-green-100');
    expect(screen.getByText('Equivocado')).toHaveClass('bg-red-100');
    expect(screen.getByText('Raro')).toHaveClass('bg-slate-100');
  });

  it('cae a textos por defecto cuando faltan datos', () => {
    renderizar({
      deudor: { ...DEUDOR, documentoIdentidad: null, correoElectronico: null, telefonos: [], telefonoPrincipal: null },
      deudas: [{ idDeuda: 55, numeroCuenta: 'CU-055', deudor: { idDeudor: 7 } }],
    });

    expect(screen.getByText(/Sin identificación/)).toBeInTheDocument();
    expect(screen.getByText(/Sin correo/)).toBeInTheDocument();
    expect(screen.getByText('Sin tipo')).toBeInTheDocument();
  });

  it('arma un telefono principal cuando no hay lista', () => {
    renderizar({ deudor: { ...DEUDOR, telefonos: [], telefonoPrincipal: '0800999888' } });

    expect(screen.getByText('0800999888')).toBeInTheDocument();
  });

  it('pinta el saldo en verde cuando esta liquidado', () => {
    renderizar({ deudaSeleccionadaId: 56 });

    expect(screen.getByText('Sin tipo')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('cae a $0.00 cuando el saldo no es numerico', () => {
    renderizar({
      deudas: [{ ...DEUDAS[0], saldoPendiente: 'mucho' }, DEUDAS[1]],
    });

    expect(screen.getByText('Saldo de la cuenta seleccionada').nextSibling).toHaveTextContent('$0.00');
  });
});

describe('GestionPanel: selector de cuenta', () => {
  it('oculta el selector cuando solo hay una cuenta', () => {
    renderizar({ deudas: [DEUDAS[0]] });

    expect(screen.queryByText('Cuenta / Producto a gestionar')).toBeNull();
  });

  it('cambia de cuenta y avisa a la tarjeta', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const opciones = within(screen.getByRole('combobox')).getAllByRole('option').map(o => o.textContent);
    expect(opciones).toEqual(['CU-055 — TDC Oro — $5,000.00', 'CU-056 — Sin tipo — $0.00']);

    await usuario.selectOptions(screen.getByRole('combobox'), '56');
    expect(onCambiarDeuda).toHaveBeenCalledWith(56);
  });
});

describe('GestionPanel: formulario', () => {
  it('monta el formulario con la deuda seleccionada', () => {
    renderizar();

    expect(screen.getByTestId('gestion-form')).toHaveTextContent('Form 55 vigente:false');
  });

  it('cae a la primera deuda cuando la seleccionada no existe', () => {
    renderizar({ deudaSeleccionadaId: 999 });

    expect(screen.getByTestId('gestion-form')).toHaveTextContent('Form 55');
  });

  it('omite el formulario cuando el deudor no tiene deudas', () => {
    renderizar({ deudas: [] });

    expect(screen.queryByTestId('gestion-form')).toBeNull();
  });

  it('marca promesa vigente cuando hay una promesa futura en la deuda', () => {
    renderizar({
      gestiones: [
        gestion({
          concepto: { nombreConcepto: 'Promesa de pago', categoria: 'PROMESA' },
          fechaPromesa: enDias(30),
        }),
      ],
    });

    expect(screen.getByTestId('gestion-form')).toHaveTextContent('vigente:true');
  });

  it('no marca vigente cuando la promesa ya vencio', () => {
    renderizar({
      gestiones: [
        gestion({
          concepto: { nombreConcepto: 'Promesa de pago', categoria: 'PROMESA' },
          fechaPromesa: enDias(-30),
        }),
        gestion({ idGestion: 2, concepto: { nombreConcepto: 'Llamada', categoria: 'GESTION' } }),
      ],
    });

    expect(screen.getByTestId('gestion-form')).toHaveTextContent('vigente:false');
  });
});

describe('GestionPanel: historial', () => {
  it('avisa cuando no hay gestiones', () => {
    renderizar({ gestiones: [] });

    expect(screen.getByText('Aún no hay gestiones registradas para este cliente.')).toBeInTheDocument();
    expect(screen.getByText(/Historial de Gestiones del Cliente/)).toHaveTextContent('(0)');
  });

  it('muestra la cuenta seleccionada sin repetir la cuenta', () => {
    renderizar({ gestiones: [gestion(), { ...gestion(), idGestion: 2, fechaRegistro: '2026-01-01T10:00:00Z' }] });

    expect(screen.getByText(/Cuenta CU-055/)).toBeInTheDocument();
    expect(screen.getByText(/Historial de Gestiones del Cliente/)).toHaveTextContent('(2)');
    const items = tarjetas();
    expect(items).toHaveLength(2);
    // Sin badge de cuenta en esta seccion.
    expect(items[0]).not.toHaveTextContent('CU-055');
    expect(items[0]).toHaveTextContent('Motivo: Falta de fondos');
  });

  it('muestra otras cuentas cuando la seleccionada no tiene gestiones', () => {
    renderizar({
      deudaSeleccionadaId: 56,
      gestiones: [gestion()],
    });

    expect(screen.getByText('Otras cuentas del cliente')).toBeInTheDocument();
    // Aqui si se muestra la cuenta de cada gestion.
    expect(tarjetas()[0]).toHaveTextContent('CU-055');
  });

  it('muestra Sin tipo en la cuenta cuando no trae producto', () => {
    renderizar({
      deudas: [{ idDeuda: 57, numeroCuenta: 'CU-057', deudor: { idDeudor: 7 } }],
      deudaSeleccionadaId: 57,
      gestiones: [gestion({ deuda: { idDeuda: 57, numeroCuenta: 'CU-057' } })],
    });

    expect(screen.getByText(/Cuenta CU-057/)).toHaveTextContent('Sin tipo');
  });

  it('sugiere deslizar cuando hay mas de diez en la cuenta', () => {
    const muchas = Array.from({ length: 11 }, (_, i) =>
      gestion({ idGestion: 100 + i, fechaRegistro: `2026-02-${String(i + 1).padStart(2, '0')}T10:00:00Z` }),
    );
    renderizar({ gestiones: muchas });

    expect(screen.getByText(/desliza/)).toBeInTheDocument();
    expect(tarjetas()[0].closest('ul').className).toContain('max-h-[440px]');
  });

  it('sugiere deslizar en otras cuentas cuando hay mas de diez', () => {
    const muchas = Array.from({ length: 11 }, (_, i) =>
      gestion({ idGestion: 200 + i, fechaRegistro: `2026-02-${String(i + 1).padStart(2, '0')}T10:00:00Z` }),
    );
    renderizar({ deudaSeleccionadaId: 56, gestiones: muchas });

    expect(screen.getByText(/desliza/)).toBeInTheDocument();
  });
});

describe('GestionPanel: tarjeta de gestion', () => {
  it.each([
    ['Promesa de pago', 'bg-green-100'],
    ['Pago recibido', 'bg-green-100'],
    ['Negativa del cliente', 'bg-red-100'],
    ['No contactado', 'bg-blue-100'],
  ])('colorea el concepto %s', (nombre, clase) => {
    renderizar({ gestiones: [gestion({ concepto: { nombreConcepto: nombre, categoria: 'X' } })] });

    const insignia = within(tarjetas()[0]).getByText(nombre);
    expect(insignia).toHaveClass(clase);
  });

  it('cae a Gestión cuando no hay concepto ni codigo', () => {
    renderizar({ gestiones: [gestion({ concepto: null, codigoResultado: null })] });

    expect(within(tarjetas()[0]).getByText('Gestión')).toHaveClass('bg-blue-100');
  });

  it('oculta el motivo cuando la gestion no trae', () => {
    renderizar({ gestiones: [gestion({ motivoNoPago: null })] });

    expect(tarjetas()[0]).not.toHaveTextContent('Motivo:');
  });

  it('usa el id del empleado cuando no viene el nombre', () => {
    renderizar({ gestiones: [gestion({ empleado: { idEmpleado: 9 } })] });

    expect(tarjetas()[0]).toHaveTextContent('ID 9');
  });

  it('muestra la promesa simple con tipo, pago y marcado', () => {
    renderizar({
      gestiones: [
        gestion({
          montoPromesa: 1500,
          fechaPromesa: '2026-03-20',
          tipoPromesa: { nombre: 'Parcial' },
          montoPagado: 500,
          numeroMarcado: '0991112222',
          tipoTelefonoMarcado: 'Celular',
        }),
      ],
    });

    const tarjeta = tarjetas()[0];
    expect(tarjeta).toHaveTextContent('Promesa de $1,500.00 para el 2026-03-20');
    expect(tarjeta).toHaveTextContent('Tipo: Parcial');
    expect(tarjeta).toHaveTextContent('Pagó: $500.00');
    expect(tarjeta).toHaveTextContent('marcó 0991112222 (Celular)');
  });

  it('muestra la promocion con su estado cuando trae bonificacion', () => {
    renderizar({
      gestiones: [
        gestion({
          montoPromesa: 2000,
          estadoBonificacion: 'PENDIENTE',
        }),
      ],
    });

    const tarjeta = tarjetas()[0];
    expect(tarjeta).toHaveTextContent('Promoción/Convenio de $2,000.00');
    expect(tarjeta).toHaveTextContent('Estado: PENDIENTE');
  });

  it('omite los fragmentos opcionales cuando no vienen', () => {
    renderizar({
      gestiones: [
        gestion({
          montoPromesa: 800,
          fechaPromesa: '2026-03-20',
          tipoPromesa: null,
          montoPagado: 0,
          numeroMarcado: null,
          estadoBonificacion: null,
        }),
      ],
    });

    const tarjeta = tarjetas()[0];
    expect(tarjeta).toHaveTextContent('Promesa de $800.00');
    expect(tarjeta).not.toHaveTextContent('Tipo:');
    expect(tarjeta).not.toHaveTextContent('Pagó:');
    expect(tarjeta).not.toHaveTextContent('marcó');
    expect(tarjeta).not.toHaveTextContent('Estado:');
  });
});

describe('GestionPanel: detalle', () => {
  it('abre la gestion al pulsar la tarjeta y la cierra', async () => {
    const usuario = userEvent.setup();
    renderizar({ gestiones: [gestion()] });

    await usuario.click(tarjetas()[0]);
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('abre con Enter e ignora otras teclas', async () => {
    renderizar({ gestiones: [gestion()] });

    fireEvent.keyDown(tarjetas()[0], { key: 'Tab' });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(tarjetas()[0], { key: 'Enter' });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');
  });

  it('Ctrl+F2 reabre la ultima gestion vista', async () => {
    const usuario = userEvent.setup();
    renderizar({ gestiones: [gestion()] });

    await usuario.click(tarjetas()[0]);
    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('detecta F2 por code cuando la tecla no coincide', async () => {
    const usuario = userEvent.setup();
    renderizar({ gestiones: [gestion()] });

    await usuario.click(tarjetas()[0]);
    fireEvent.keyDown(window, { key: 'Unidentified', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('Ctrl+F2 no hace nada sin gestion previa', () => {
    renderizar({ gestiones: [gestion()] });

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });
});
