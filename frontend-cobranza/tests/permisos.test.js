import {
  ROL_ADMINISTRADOR,
  ROL_SUPERVISOR,
  ROL_GESTOR,
  ROL_USUARIO,
  SECCIONES_POR_ROL,
  VISTAS_POR_ROL,
  esAdministrador,
  esOperador,
  esSupervisor,
  endpointsCompartidos,
  endpointsDeOperacion,
  normalizarRol,
  puedeVer,
  resolverVista,
  seccionesPermitidas,
  vistaInicial,
  vistasPermitidas,
} from '../src/permisos';

describe('normalizarRol', () => {
  it('acepta los roles conocidos sin importar mayusculas ni espacios', () => {
    expect(normalizarRol('gestor')).toBe(ROL_GESTOR);
    expect(normalizarRol('  ADMINISTRADOR ')).toBe(ROL_ADMINISTRADOR);
    expect(normalizarRol('Supervisor')).toBe(ROL_SUPERVISOR);
    expect(normalizarRol('usuario')).toBe(ROL_USUARIO);
  });

  it('rechaza un rol desconocido, ausente o no textual', () => {
    // Fallar cerrado: el backend responde 403 a cualquier rol no previsto, asi
    // que la interfaz tampoco debe prometer vistas que el servidor va a negar.
    expect(normalizarRol('ANALISTA')).toBeNull();
    expect(normalizarRol('')).toBeNull();
    expect(normalizarRol(null)).toBeNull();
    expect(normalizarRol(undefined)).toBeNull();
    expect(normalizarRol(42)).toBeNull();
    expect(normalizarRol({})).toBeNull();
  });

  it('nocede ante un rol que imita una clave del objeto', () => {
    // Sin hasOwnProperty, "constructor" devolveria una funcion como rol valido.
    expect(normalizarRol('constructor')).toBeNull();
    expect(normalizarRol('toString')).toBeNull();
    expect(normalizarRol('__proto__')).toBeNull();
  });
});

describe('clasificacion de roles', () => {
  it('solo el gestor y el rol legado USUARIO operan la cobranza', () => {
    expect(esOperador(ROL_GESTOR)).toBe(true);
    expect(esOperador(ROL_USUARIO)).toBe(true);
    expect(esOperador(ROL_ADMINISTRADOR)).toBe(false);
    expect(esOperador(ROL_SUPERVISOR)).toBe(false);
    expect(esOperador('ANALISTA')).toBe(false);
    expect(esOperador(null)).toBe(false);
  });

  it('administrador y supervisor son excluyentes', () => {
    expect(esAdministrador(ROL_ADMINISTRADOR)).toBe(true);
    expect(esSupervisor(ROL_ADMINISTRADOR)).toBe(false);

    expect(esSupervisor(ROL_SUPERVISOR)).toBe(true);
    expect(esAdministrador(ROL_SUPERVISOR)).toBe(false);

    expect(esAdministrador(ROL_GESTOR)).toBe(false);
    expect(esSupervisor(ROL_GESTOR)).toBe(false);
  });
});

describe('vistas por rol', () => {
  it('el gestor ve Gestion/Info, Mi Cartera y Mi Meta', () => {
    expect(vistasPermitidas(ROL_GESTOR)).toEqual(['info', 'cartera', 'meta']);
  });

  it('el administrador solo gestiona personal, nunca cartera ni catalogos', () => {
    const vistas = vistasPermitidas(ROL_ADMINISTRADOR);

    expect(vistas).toEqual(['empleados']);
    for (const vistaDeCobranza of ['info', 'cartera', 'meta', 'deudores', 'pagos', 'tickets', 'asignacion', 'catalogos', 'auditoria', 'campanas']) {
      expect(vistas).not.toContain(vistaDeCobranza);
    }
  });

  it('el supervisor no cobra y Meta del Equipo vive bajo Supervision', () => {
    const vistas = vistasPermitidas(ROL_SUPERVISOR);

    expect(vistas).toEqual(['supervision', 'asignacionSup', 'promesasSup', 'metaEquipo']);
    expect(vistas).not.toContain('info');
    expect(vistas).not.toContain('cartera');
    expect(vistas).not.toContain('empleados');
  });

  it('devuelve una copia, para que el menu no pueda mutar la tabla', () => {
    const copia = vistasPermitidas(ROL_GESTOR);
    copia.push('auditoria');

    expect(vistasPermitidas(ROL_GESTOR)).toEqual(['info', 'cartera', 'meta']);
  });

  it('un rol desconocido no obtiene ninguna vista', () => {
    expect(vistasPermitidas('ANALISTA')).toEqual([]);
    expect(vistasPermitidas(null)).toEqual([]);
    expect(puedeVer('ANALISTA', 'info')).toBe(false);
    expect(vistaInicial(null)).toBeNull();
  });

  it('la tabla de vistas esta congelada', () => {
    expect(Object.isFrozen(VISTAS_POR_ROL)).toBe(true);
  });

  it('puedeVer responde segun el rol', () => {
    expect(puedeVer(ROL_GESTOR, 'info')).toBe(true);
    expect(puedeVer(ROL_GESTOR, 'auditoria')).toBe(false);
    expect(puedeVer(ROL_ADMINISTRADOR, 'empleados')).toBe(true);
    expect(puedeVer(ROL_ADMINISTRADOR, 'info')).toBe(false);
    expect(puedeVer(ROL_SUPERVISOR, 'metaEquipo')).toBe(true);
    expect(puedeVer(ROL_SUPERVISOR, 'cartera')).toBe(false);
  });
});

describe('secciones del menu', () => {
  it('cada rol ve solo su seccion', () => {
    expect(seccionesPermitidas(ROL_GESTOR)).toEqual(['gestion']);
    expect(seccionesPermitidas(ROL_ADMINISTRADOR)).toEqual(['administracion']);
    expect(seccionesPermitidas(ROL_SUPERVISOR)).toEqual(['supervision']);
  });

  it('un rol desconocido no recibe ninguna seccion', () => {
    expect(seccionesPermitidas('ANALISTA')).toEqual([]);
    expect(seccionesPermitidas(null)).toEqual([]);
    expect(seccionesPermitidas('ANALISTA')).not.toContain('administracion');
  });

  it('la tabla de secciones esta congelada', () => {
    expect(Object.isFrozen(SECCIONES_POR_ROL)).toBe(true);
  });
});

describe('vistaInicial y resolverVista', () => {
  it('la vista inicial es la primera de las permitidas', () => {
    expect(vistaInicial(ROL_GESTOR)).toBe('info');
    expect(vistaInicial(ROL_ADMINISTRADOR)).toBe('empleados');
    expect(vistaInicial(ROL_SUPERVISOR)).toBe('supervision');
  });

  it('respeta la vista actual si el rol la tiene permitida', () => {
    expect(resolverVista(ROL_GESTOR, 'meta')).toBe('meta');
    expect(resolverVista(ROL_ADMINISTRADOR, 'empleados')).toBe('empleados');
  });

  it('corige una vista no permitida en lugar de dejar la pantalla en blanco', () => {
    // Al cambiar de cuenta o entrar por un enlace directo no puede quedar 'info'.
    expect(resolverVista(ROL_ADMINISTRADOR, 'info')).toBe('empleados');
    // Las vistas que el administrador dejo de tener caen en Empleados.
    expect(resolverVista(ROL_ADMINISTRADOR, 'catalogos')).toBe('empleados');
    expect(resolverVista(ROL_ADMINISTRADOR, 'auditoria')).toBe('empleados');
    expect(resolverVista(ROL_SUPERVISOR, 'info')).toBe('supervision');
    expect(resolverVista(ROL_GESTOR, 'auditoria')).toBe('info');
  });

  it('tolera una vista vacia o nula', () => {
    expect(resolverVista(ROL_GESTOR, null)).toBe('info');
    expect(resolverVista(ROL_GESTOR, undefined)).toBe('info');
    expect(resolverVista(ROL_GESTOR, '')).toBe('info');
  });

  it('sin ningun rol valido deja la vista actual en paz', () => {
    // No hay vista a la que saltar: inventar una dejaria la pantalla vacia.
    expect(resolverVista('ANALISTA', 'info')).toBe('info');
    expect(resolverVista(null, 'auditoria')).toBe('auditoria');
  });
});

describe('endpoints por rol', () => {
  it('el gestor carga la operacion de cobranza completa', () => {
    const endpoints = endpointsDeOperacion(ROL_GESTOR);

    expect(endpoints).toContain('deudores');
    expect(endpoints).toContain('gestiones');
    expect(endpoints).toContain('pagos');
    expect(endpoints).toContain('tickets');
  });

  it('administrador y supervisor no piden endpoints de cobranza', () => {
    // Pedirlos devolvia 403 en la consola del navegador.
    expect(endpointsDeOperacion(ROL_ADMINISTRADOR)).toEqual([]);
    expect(endpointsDeOperacion(ROL_SUPERVISOR)).toEqual([]);
    expect(endpointsDeOperacion(null)).toEqual([]);
  });

  it('el rol legado USUARIO tambien opera', () => {
    expect(endpointsDeOperacion(ROL_USUARIO)).toContain('deudores');
  });

  it('campanas y conceptos los consulta cualquier rol autenticado', () => {
    expect(endpointsCompartidos()).toEqual(['campanas', 'conceptos']);
  });
});
