import { render, screen } from '@testing-library/react';
import CampanaList from '../src/components/CampanaList';

describe('CampanaList', () => {
  it('avisa mientras no llegan las campanas', () => {
    render(<CampanaList campanas={[]} />);

    expect(screen.getByText(/cargando datos desde java/i)).toBeInTheDocument();
  });

  it('lista las campanas de la empresa', () => {
    render(
      <CampanaList
        campanas={[{ idCampana: 1, nombreEmpresa: 'Acme', activo: true }]}
      />,
    );

    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('marca las campanas activas e inactivas segun el estado', () => {
    render(
      <CampanaList
        campanas={[
          { idCampana: 1, nombreEmpresa: 'Acme', activo: true },
          { idCampana: 2, nombreEmpresa: 'Globex', activo: false },
        ]}
      />,
    );

    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
  });

  it('no inventa campanas cuando la lista llega vacia de verdad', () => {
    const { container } = render(<CampanaList campanas={[]} />);

    expect(screen.queryByText('Activa')).toBeNull();
    expect(container.querySelectorAll('h3')).toHaveLength(0);
  });
});
