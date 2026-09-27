import axios from 'axios';

const baseCruda = (typeof window !== 'undefined' && window.API_URL) || '';
axios.defaults.baseURL = !baseCruda || baseCruda === '__API_URL__' ? '' : baseCruda;

const RUTAS_SIN_TOKEN = ['/empleados/login', '/empleados/activar'];

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const esRutaPublica = RUTAS_SIN_TOKEN.some((ruta) => (config.url || '').includes(ruta));
  if (token && !esRutaPublica) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const esRutaPublica = RUTAS_SIN_TOKEN.some((ruta) => url.includes(ruta));

    if (status === 401 && !esRutaPublica && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      localStorage.removeItem('empleado');
      sessionStorage.setItem('sesionExpirada', '1');
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export default axios;
