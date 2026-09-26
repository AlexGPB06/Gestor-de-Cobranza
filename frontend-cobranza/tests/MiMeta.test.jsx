import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MiMeta from '../src/components/MiMeta';

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

const EMPLEADO = { idEmpleado: 3 };
const CLAVE = 'meta_gestor_3';

const ahoraISO = () => new Date().toISOString();
const enDiasFecha = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const gestion = (over = {}) => ({
  idGestion: 1,
  fechaRegistro: ahoraISO(),
  empleado: { idEmpleado: 3 },
  concepto: { nombreConcepto: 'Llamada' },
  codigoResultado: 'LLAMADA',
  comentarios: 'Se habló con el titular',
  deuda: { numeroCuenta: 'CU-055', deudor: { nombreCompleto: 'Verónica Castillo' } },
  montoPromesa: null,
  fechaPromesa: null,
  ...over,
});

const renderizar = (gestiones = [], empleado = EMPLEADO) =>
  render(<MiMeta empleadoActual={empleado} gestiones={gestiones} />);

// Los inputs son type=number sin label asociado; se localizan por rol.
// No se usa el placeholder porque cambia con la meta guardada.
const montoInput = () => screen.getAllByRole('spinbutton')[0];
const gestionesInput = () => screen.getAllByRole('spinbutton')[1];

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('MiMeta: meta guardada', () => {
  it('usa los valores por defecto sin nada guardado', () => {
    renderizar();

    expect(montoInput()).toHaveAttribute('placeholder', '100000');
    expect(gestionesInput()).toHaveAttribute('placeholder', '100');
  });

  it('recupera la meta guardada en el navegador', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ monto: 50000, gestiones: 40 }));
    renderizar();

    expect(montoInput()).toHaveAttribute('placeholder', '50000');
    expect(gestionesInput()).toHaveAttribute('placeholder', '40');
  });

  it('cae a los valores por defecto con JSON roto o incompleto', () => {
    localStorage.setItem(CLAVE, 'no-es-json');
    const { unmount } = renderizar();
    expect(montoInput()).toHaveAttribute('placeholder', '100000');
    unmount();

    localStorage.setItem(CLAVE, JSON.stringify({ monto: 50000 }));
    renderizar();
    expect(montoInput()).toHaveAttribute('placeholder', '100000');
    expect(gestionesInput()).toHaveAttribute('placeholder', '100');
  });

  it('guarda la meta nueva y limpia el formulario', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(montoInput(), '200000');
    await usuario.type(gestionesInput(), '150');
    await usuario.click(screen.getByRole('button', { name: 'Guardar Meta' }));

    expect(montoInput()).toHaveAttribute('placeholder', '200000');
    expect(montoInput()).toHaveValue(null);
    expect(JSON.parse(localStorage.getItem(CLAVE))).toEqual({ monto: 200000, gestiones: 150 });
  });

  it('conserva la meta actual cuando el formulario viene vacio o invalido', async () => {
    const usuario = userEvent.setup();
    localStorage.setItem(CLAVE, JSON.stringify({ monto: 50000, gestiones: 40 }));
    renderizar();

    fireEvent.change(montoInput(), { target: { value: 'abc' } });
    fireEvent.change(gestionesInput(), { target: { value: '' } });
    await usuario.click(screen.getByRole('button', { name: 'Guardar Meta' }));

    expect(JSON.parse(localStorage.getItem(CLAVE))).toEqual({ monto: 50000, gestiones: 40 });
  });
});

describe('MiMeta: indicadores', () => {
  it('cuenta solo las gestiones del empleado', () => {
    renderizar([
      gestion({ idGestion: 1 }),
      gestion({ idGestion: 2, empleado: { idEmpleado: 9 } }),
      gestion({ idGestion: 3, empleado: null }),
    ]);

    expect(screen.getByText('Gestiones del Mes').nextSibling).toHaveTextContent('1');
  });

  it('filtra por mes actual e ignora fechas invalidas', () => {
    renderizar([
      gestion({ idGestion: 1 }),
      gestion({ idGestion: 2, fechaRegistro: '2020-01-15T10:00:00Z' }),
      gestion({ idGestion: 3, fechaRegistro: 'no-es-fecha' }),
    ]);

    expect(screen.getByText('Gestiones del Mes').nextSibling).toHaveTextContent('1');
  });

  it('suma lo prometido en el mes y topa la barra al 100 porciento', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ monto: 100, gestiones: 1 }));
    renderizar([
      gestion({ idGestion: 1, montoPromesa: 5000 }),
      // 0 pasa el filtro != null pero activa el || 0 del reduce.
      gestion({ idGestion: 2, montoPromesa: 0 }),
      gestion({ idGestion: 3, fechaRegistro: '2020-01-15T10:00:00Z', montoPromesa: 9999 }),
    ]);

    expect(screen.getByText('Prometido en el Mes').nextSibling).toHaveTextContent('$5,000.00');
    const barras = document.querySelectorAll('.bg-green-600');
    expect(barras[0].style.width).toBe('100%');
  });

  it('devuelve cero en los porcentajes cuando la meta es cero', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ monto: 0, gestiones: 0 }));
    renderizar([gestion({ idGestion: 1, montoPromesa: 5000 })]);

    const barras = document.querySelectorAll('.bg-blue-600,.bg-green-600');
    expect(barras[0].style.width).toBe('0%');
    expect(barras[1].style.width).toBe('0%');
  });

  it('cae a $0.00 cuando el monto no es numerico', () => {
    renderizar([gestion({ idGestion: 1, montoPromesa: 'mucho' })]);

    expect(screen.getByText('Prometido en el Mes').nextSibling).toHaveTextContent('$0.00');
  });
});

describe('MiMeta: promesas pendientes y vencidas', () => {
  it('separa futuras de vencidas y las ordena por fecha', () => {
    renderizar([
      gestion({ idGestion: 1, montoPromesa: 1000, fechaPromesa: enDiasFecha(30) }),
      gestion({ idGestion: 2, montoPromesa: 2000, fechaPromesa: enDiasFecha(10) }),
      gestion({ idGestion: 3, montoPromesa: 3000, fechaPromesa: enDiasFecha(-5) }),
      gestion({ idGestion: 4, montoPromesa: 4000, fechaPromesa: enDiasFecha(-20) }),
      gestion({ idGestion: 5, montoPromesa: 5000, fechaPromesa: null }),
    ]);

    expect(screen.getByText(/Promesas Pendientes \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('Promesas Vencidas').nextSibling).toHaveTextContent('2');

    const pendientes = screen.getByText(/Promesas Pendientes/).closest('div').parentElement.querySelectorAll('li');
    const fechas = [...pendientes].map(li => li.textContent);
    expect(fechas[0]).toContain(enDiasFecha(10));
    expect(fechas[1]).toContain(enDiasFecha(30));
  });

  it('suma el monto vencido tratando el ausente como cero', () => {
    renderizar([
      gestion({ idGestion: 3, montoPromesa: 3000, fechaPromesa: enDiasFecha(-5) }),
      gestion({ idGestion: 4, montoPromesa: 0, fechaPromesa: enDiasFecha(-20) }),
    ]);

    expect(screen.getByText('Promesas Vencidas').nextSibling.nextSibling).toHaveTextContent('= $3,000.00');
  });

  it('avisa cuando no hay pendientes ni gestiones', () => {
    renderizar([]);

    expect(screen.getByText('No tienes promesas con fecha futura.')).toBeInTheDocument();
    expect(screen.getByText('Aún no registras gestiones.')).toBeInTheDocument();
  });
});

describe('MiMeta: ultimas gestiones', () => {
  it('ordena descendente y muestra quince como maximo', () => {
    const muchas = Array.from({ length: 16 }, (_, i) =>
      gestion({ idGestion: 100 + i, fechaRegistro: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z` }),
    );
    renderizar(muchas);

    const items = screen.getByText(/Últimas Gestiones/).closest('div').parentElement.querySelectorAll('li');
    expect(items).toHaveLength(15);
  });

  it('cae a Gestión cuando no hay concepto ni codigo', () => {
    renderizar([gestion({ concepto: null, codigoResultado: null })]);

    expect(screen.getByText('Gestión')).toBeInTheDocument();
  });

  it('muestra el bloque de promesa cuando trae monto', () => {
    renderizar([gestion({ montoPromesa: 1500, fechaPromesa: '2026-03-20' })]);

    expect(screen.getByText(/\$1,500.00 → 2026-03-20/)).toBeInTheDocument();
  });

  it('abre el detalle al pulsar el comentario', async () => {
    const usuario = userEvent.setup();
    renderizar([gestion()]);

    const comentario = screen.getByRole('button', { name: /Se habló con el titular/ });
    await usuario.click(comentario);
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('abre con Enter e ignora otras teclas', async () => {
    renderizar([gestion()]);
    const comentario = screen.getByRole('button', { name: /Se habló con el titular/ });

    fireEvent.keyDown(comentario, { key: 'Tab' });
    expect(screen.queryByTestId('detalle')).toBeNull();

    fireEvent.keyDown(comentario, { key: 'Enter' });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');
  });

  it('detecta F2 por code cuando la tecla no coincide', async () => {
    const usuario = userEvent.setup();
    renderizar([gestion()]);

    await usuario.click(screen.getByRole('button', { name: /Se habló con el titular/ }));
    fireEvent.keyDown(window, { key: 'Unidentified', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });

  it('Ctrl+F2 reabre la ultima gestion vista', async () => {
    const usuario = userEvent.setup();
    renderizar([gestion()]);

    await usuario.click(screen.getByRole('button', { name: /Se habló con el titular/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.getByTestId('detalle')).toHaveTextContent('Detalle 1');

    fireEvent.keyDown(window, { key: 'F2', code: 'F2', ctrlKey: true });
    expect(screen.queryByTestId('detalle')).toBeNull();
  });
});
