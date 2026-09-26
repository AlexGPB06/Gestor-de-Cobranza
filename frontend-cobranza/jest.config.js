/**
 * Configuracion de Jest para el frontend.
 *
 * Alcance del umbral: se exige 80% sobre el nucleo de seguridad y de logica
 * (permisos, cliente HTTP) y sobre los componentes vivos con filtrado, busqueda
 * o envio. Los componentes de presentacion grandes se miden y se reportan, pero
 * no bloquean el pipeline hasta que existan pruebas para ellos. El numero
 * global se imprime con `npm run test:coverage:global` para no maquillar la
 * deuda pendiente.
 *
 * Sidebar, ProtectedRoute y AuthContext quedan fuera: forman una isla muerta
 * que la app actual no monta (App.jsx lleva su propio estado y no hay router).
 * Exigir cobertura de codigo que nadie ejecuta no aporta nada.
 */

const RUTAS_POR_DEFECTO = {
  clearMocks: true,
  restoreMocks: true,
};

/** Nucleo con decisiones de seguridad: sin esto, un cambio rompe el silencio. */
const NUCLEO_SEGURIDAD = [
  './src/permisos.js',
  './src/apiClient.js',
];

/** Componentes vivos con logica de filtrado, busqueda o envio. */
const COMPONENTES_CON_LOGICA = [
  './src/components/EmpleadosManager.jsx',
  './src/components/AsignacionCartera.jsx',
  './src/components/SupervisionPanel.jsx',
  './src/components/CatalogosManager.jsx',
  './src/components/CampanaList.jsx',
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
    ...umbralDe(NUCLEO_SEGURIDAD),
    ...umbralDe(COMPONENTES_CON_LOGICA),
  },
};
