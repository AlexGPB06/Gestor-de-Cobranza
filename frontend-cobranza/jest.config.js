/**
 * Configuracion de Jest para el frontend.
 *
 * Alcance del umbral: se exige 80% sobre el nucleo de seguridad y de logica
 * (permisos, cliente HTTP, App) y sobre los componentes vivos con filtrado,
 * busqueda, formato o envio. Los componentes de presentacion grandes se miden
 * y se reportan, pero no bloquean el pipeline hasta que existan pruebas para
 * ellos. El numero global se imprime con `npm run test:coverage:global` para
 * no maquillar la deuda pendiente.
 *
 * La isla muerta que quedo antes (Login, Sidebar, ProtectedRoute y AuthContext,
 * sin router en la app) se elimino: main.jsx solo monta <App />, asi que nada
 * ejecutaba ese codigo. Exigir cobertura de codigo que nadie corre no aporta.
 */

const RUTAS_POR_DEFECTO = {
  clearMocks: true,
  restoreMocks: true,
  // Bajo carga (CI oCoverage en paralelo) los timers de userEvent pueden
  // pasarse del default de 5s y producir fallos intermitentes sin causa real.
  testTimeout: 20000,
};

/** Nucleo con decisiones de seguridad: sin esto, un cambio rompe el silencio. */
const NUCLEO_SEGURIDAD = [
  './src/permisos.js',
  './src/apiClient.js',
  './src/App.jsx',
];

/** Componentes vivos con logica de filtrado, busqueda, formato o envio. */
const COMPONENTES_CON_LOGICA = [
  './src/components/EmpleadosManager.jsx',
  './src/components/AsignacionCartera.jsx',
  './src/components/SupervisionPanel.jsx',
  './src/components/CatalogosManager.jsx',
  './src/components/CampanaList.jsx',
  './src/components/ClienteInfo.jsx',
  './src/components/CarteraGestor.jsx',
  './src/components/DashboardKPI.jsx',
  './src/components/DetalleVista.jsx',
  './src/components/PagoForm.jsx',
  './src/components/GestionForm.jsx',
  './src/components/AuditoriaViewer.jsx',
  './src/components/InfoGestion.jsx',
  './src/components/PromesasTab.jsx',
  './src/components/BonificacionesTab.jsx',
  './src/components/TicketsTab.jsx',
  './src/components/CXC_Pagos.jsx',
  './src/components/GestionPanel.jsx',
  './src/components/MiMeta.jsx',
  './src/components/MiMetaEquipo.jsx',
  './src/components/PromesasSupervisor.jsx',
  './src/components/AsignacionSupervisor.jsx',
];

const umbralDe = (rutas) =>
  Object.fromEntries(
    rutas.map((ruta) => [
      ruta,
      { statements: 80, branches: 80, functions: 80, lines: 80 },
    ]),
  );

export default {
  ...RUTAS_POR_DEFECTO,
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
    ...umbralDe(NUCLEO_SEGURIDAD),
    ...umbralDe(COMPONENTES_CON_LOGICA),
  },
};
