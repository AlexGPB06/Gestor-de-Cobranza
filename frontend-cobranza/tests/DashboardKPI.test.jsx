import { render, screen } from '@testing-library/react';
import DashboardKPI from '../src/components/DashboardKPI';

const kpi = (etiqueta) => screen.getByText(etiqueta).closest('div');

describe('DashboardKPI', () => {
  it('suma el saldo exigible de todas las deudas', () => {
    render(
      <DashboardKPI
        deudas={[{ saldoPendiente: 1000 }, { saldoPendiente: 500.5 }, { saldoPendiente: null }]}
        gestiones={[]}
      />,
    );

    expect(kpi('Saldo Total Exigible')).toHaveTextContent('$1,500.50');
  });

  it('suma el dinero asegurado en promesas', () => {
    render(
      <DashboardKPI
        deudas={[]}
        gestiones={[{ montoPromesa: 2000 }, { montoPromesa: 500.5 }, { montoPromesa: undefined }]}
      />,
    );

    expect(kpi('Total en Promesas')).toHaveTextContent('$2,500.50');
  });

  it('calcula el porcentaje de recuperacion con un decimal', () => {
    render(
      <DashboardKPI
        deudas={[{ saldoPendiente: 1000 }]}
        gestiones={[{ montoPromesa: 250 }]}
      />,
    );

    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('evita dividir entre cero cuando la cartera no tiene saldo', () => {
    render(<DashboardKPI deudas={[]} gestiones={[{ montoPromesa: 500 }]} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('muestra cero cuando no hay nada que medir', () => {
    render(<DashboardKPI deudas={[]} gestiones={[]} />);

    expect(kpi('Saldo Total Exigible')).toHaveTextContent('$0.00');
    expect(kpi('Total en Promesas')).toHaveTextContent('$0.00');
  });

  it('la barra de progreso nunca pasa del 100% aunque se prometa de mas', () => {
    const { container } = render(
      <DashboardKPI deudas={[{ saldoPendiente: 100 }]} gestiones={[{ montoPromesa: 500 }]} />,
    );

    // 500% recuperado: el porcentaje se muestra completo pero la barra se satura.
    expect(screen.getByText('500.0%')).toBeInTheDocument();
    expect(container.querySelector('.bg-blue-600.h-2\\.5')).toHaveStyle({ width: '100%' });
  });

  it('acorta la barra al porcentaje real cuando no se pasa del todo', () => {
    const { container } = render(
      <DashboardKPI deudas={[{ saldoPendiente: 1000 }]} gestiones={[{ montoPromesa: 400 }]} />,
    );

    expect(container.querySelector('.bg-blue-600.h-2\\.5')).toHaveStyle({ width: '40.0%' });
  });
});
