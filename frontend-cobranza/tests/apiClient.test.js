/**
 * El interceptor se registra al importar apiClient. Cada prueba lo vuelve a
 * registrar sobre una instancia fresca de axios, asi que las aserciones deben
 * usar esa misma instancia y no la importada arriba.
 */
let api;

function registrarInterceptors() {
  jest.resetModules();
  const modulo = require('axios');
  require('../src/apiClient');
  api = modulo.default;
}

/**
 * jsdom declara Location como LegacyUnforgeable, asi que window.location.reload
 * no se puede espiar ni sustituir. Se afirma el estado que la expiracion deja
 * (almacenamiento limpio y aviso de sesion vencida), que es la parte con
 * implicacion de seguridad; el reload es solo un efecto visual.
 */
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  registrarInterceptors();
});

const peticion = () => api.interceptors.request.handlers[0];
const respuesta = () => api.interceptors.response.handlers[0];

const errorCon = (status, url) => ({ response: { status }, config: { url } });

describe('apiClient: cabecera Authorization', () => {
  it('adjunta el token guardado en las peticiones autenticadas', async () => {
    localStorage.setItem('token', 'token-123');

    const config = { url: '/api/gestiones', headers: {} };
    await peticion().fulfilled(config);

    expect(config.headers.Authorization).toBe('Bearer token-123');
  });

  it('no adjunta token en el login ni en la activacion', async () => {
    localStorage.setItem('token', 'token-123');

    const login = { url: '/api/empleados/login', headers: {} };
    const activar = { url: '/api/empleados/activar', headers: {} };
    await peticion().fulfilled(login);
    await peticion().fulfilled(activar);

    expect(login.headers.Authorization).toBeUndefined();
    expect(activar.headers.Authorization).toBeUndefined();
  });

  it('deja la peticion intacta cuando no hay sesion', async () => {
    const config = { url: '/api/gestiones', headers: {} };
    await peticion().fulfilled(config);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('tolera una peticion sin url y le adjunta el token', async () => {
    localStorage.setItem('token', 'token-123');

    const config = { headers: {} };
    await peticion().fulfilled(config);

    // Sin url no puede ser una ruta publica, asi que el token si viaja.
    expect(config.headers.Authorization).toBe('Bearer token-123');
  });
});

describe('apiClient: sesion expirada', () => {
  it('limpia la sesion y avisa con un 401 en una ruta privada', async () => {
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('rol', 'GESTOR');
    localStorage.setItem('empleado', '{"idEmpleado":90}');

    await expect(respuesta().rejected(errorCon(401, '/api/gestiones'))).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('rol')).toBeNull();
    expect(localStorage.getItem('empleado')).toBeNull();
    expect(sessionStorage.getItem('sesionExpirada')).toBe('1');
  });

  it('no borra nada si la respuesta no es 401', async () => {
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('rol', 'GESTOR');

    await expect(respuesta().rejected(errorCon(403, '/api/gestiones'))).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('token-123');
    expect(localStorage.getItem('rol')).toBe('GESTOR');
    expect(sessionStorage.getItem('sesionExpirada')).toBeNull();
  });

  it('no destruye la sesion cuando el 401 viene del login', async () => {
    // Credenciales incorrectas: el usuario debe poder reintentar sin perder nada.
    localStorage.setItem('token', 'token-123');

    await expect(
      respuesta().rejected(errorCon(401, '/api/empleados/login')),
    ).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('token-123');
    expect(sessionStorage.getItem('sesionExpirada')).toBeNull();
  });

  it('tampoco destruye la sesion si el 401 viene de la activacion', async () => {
    localStorage.setItem('token', 'token-123');

    await expect(
      respuesta().rejected(errorCon(401, '/api/empleados/activar')),
    ).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('token-123');
    expect(sessionStorage.getItem('sesionExpirada')).toBeNull();
  });

  it('tolera un error sin respuesta, como un fallo de red', async () => {
    localStorage.setItem('token', 'token-123');

    await expect(
      respuesta().rejected({ config: { url: '/api/gestiones' } }),
    ).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('token-123');
  });

  it('deja pasar las respuestas correctas sin tocarlas', async () => {
    const ok = { status: 200, data: [] };

    const resultado = await respuesta().fulfilled(ok);

    expect(resultado).toBe(ok);
  });
});
