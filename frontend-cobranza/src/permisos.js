/**
 * Permisos de la interfaz, en un modulo sin React ni axios para poder
 * probarlo de forma aislada. Es la contraparte del backend: aqui se decide
 * que ve cada rol, alla se decide que puede llamar.
 */

export const ROL_ADMINISTRADOR = 'ADMINISTRADOR';
export const ROL_SUPERVISOR = 'SUPERVISOR';
export const ROL_GESTOR = 'GESTOR';
export const ROL_USUARIO = 'USUARIO';

/**
 * Gestion/Info (cartera, deudores, deudas, pagos y tickets) y la meta propia
 * son del gestor. El administrador no cobra: administra personal, catalogos,
 * carteras y auditoria. El supervisor observa a su equipo.
 */
export const VISTAS_POR_ROL = Object.freeze({
  GESTOR: ['info', 'cartera', 'meta'],
  USUARIO: ['info', 'cartera', 'meta'],
  SUPERVISOR: ['supervision', 'asignacionSup', 'promesasSup', 'metaEquipo'],
  ADMINISTRADOR: ['empleados', 'asignacion', 'catalogos', 'auditoria', 'campanas'],
});

/** Secciones del menu lateral que se muestran a cada rol. */
export const SECCIONES_POR_ROL = Object.freeze({
  GESTOR: ['gestion'],
  USUARIO: ['gestion'],
  SUPERVISOR: ['supervision'],
  ADMINISTRADOR: ['administracion'],
});

/** Vistas que el administrador y el supervisor no deben recibir nunca. */
export const VISTAS_DE_COBRANZA = Object.freeze([
  'info',
  'cartera',
  'meta',
  'empleados',
  'asignacion',
  'catalogos',
  'auditoria',
  'campanas',
  'supervision',
  'asignacionSup',
  'promesasSup',
  'metaEquipo',
]);

/**
 * Normaliza el rol que llega del token. Un rol desconocido devuelve null y
 * queda sin ninguna vista: es lo que ya hace el backend, que responde 403 a
 * cualquier rol que no sea GESTOR, USUARIO, SUPERVISOR o ADMINISTRADOR. Aqui
 * no se amplian permisos por error ni se promete una pantalla que el servidor
 * va a rechazar.
 */
export function normalizarRol(rol) {
  if (typeof rol !== 'string') return null;
  const limpio = rol.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(VISTAS_POR_ROL, limpio) ? limpio : null;
}

/** El gestor y el rol legado USUARIO son los unicos que operan la cobranza. */
export function esOperador(rol) {
  const normalizado = normalizarRol(rol);
  return normalizado === ROL_GESTOR || normalizado === ROL_USUARIO;
}

export function esAdministrador(rol) {
  return normalizarRol(rol) === ROL_ADMINISTRADOR;
}

export function esSupervisor(rol) {
  return normalizarRol(rol) === ROL_SUPERVISOR;
}

export function vistasPermitidas(rol) {
  const normalizado = normalizarRol(rol);
  return normalizado ? [...VISTAS_POR_ROL[normalizado]] : [];
}

export function puedeVer(rol, vista) {
  return vistasPermitidas(rol).includes(vista);
}

export function seccionesPermitidas(rol) {
  const normalizado = normalizarRol(rol);
  return normalizado ? [...SECCIONES_POR_ROL[normalizado]] : [];
}

export function vistaInicial(rol) {
  return vistasPermitidas(rol)[0] ?? null;
}

/**
 * Corrige la vista activa cuando el rol no tiene permiso para ella, para que
 * un enlace directo o un cambio de rol no deje la pantalla en blanco. Sin
 * ninguna vista autorizada se deja la actual: no hay a donde saltar.
 */
export function resolverVista(rol, vistaActual) {
  const permitidas = vistasPermitidas(rol);
  if (permitidas.length === 0) return vistaActual;
  return permitidas.includes(vistaActual) ? vistaActual : permitidas[0];
}

/**
 * Endpoints que el frontend debe pedir para cada rol. Pedir de mas no rompe
 * nada, pero genera 403 en la consola y termina filtrando datos que el
 * backend si rejects; pedir de menos deja la vista vacia.
 */
export function endpointsDeOperacion(rol) {
  if (esOperador(rol)) {
    return [
      'deudores',
      'deudas',
      'gestiones',
      'pagos',
      'tickets',
      'asignaciones-cartera',
      'motivos-no-pago',
      'tipos-promesa',
      'tipos-ticket',
    ];
  }
  return [];
}

/** Catalogos y campanas los consulta cualquier rol autenticado. */
export function endpointsCompartidos() {
  return ['campanas', 'conceptos'];
}
