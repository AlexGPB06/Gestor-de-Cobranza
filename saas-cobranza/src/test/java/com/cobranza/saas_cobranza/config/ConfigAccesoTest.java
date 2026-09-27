package com.cobranza.saas_cobranza.config;

import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Matriz de acceso de la API. Esta es la puerta de entrada de la seguridad, asi
 * que se prueban los tres roles contra cada familia de rutas.
 */
class ConfigAccesoTest {

    private static String token(String rol) {
        return "Bearer " + JwtUtil.generarToken("1", rol, "u." + rol.toLowerCase(), "X0001");
    }

    private static String admin() {
        return token("ADMINISTRADOR");
    }

    private static String supervisor() {
        return token("SUPERVISOR");
    }

    private static String gestor() {
        return token("GESTOR");
    }

    private static void permitido(String metodo, String ruta, String authorization) {
        ConfigAcceso.Decision decision = ConfigAcceso.evaluar(metodo, ruta, authorization);
        assertTrue(decision.permitido(),
                "Se esperaba permitir " + metodo + " " + ruta + " con " + authorization);
    }

    private static void denegado(String metodo, String ruta, String authorization, HttpStatus esperado) {
        ConfigAcceso.Decision decision = ConfigAcceso.evaluar(metodo, ruta, authorization);
        assertFalse(decision.permitido(),
                "Se esperaba denegar " + metodo + " " + ruta + " con " + authorization);
        assertEquals(esperado, decision.estado());
    }

    // ---------------------------------------------------------------- publicas

    @Test
    void loginYActivar_NoRequierenToken() {
        permitido("POST", "/api/empleados/login", null);
        permitido("POST", "/api/empleados/activar", null);
    }

    @Test
    void preflight_SePermiteSinToken() {
        permitido("OPTIONS", "/api/empleados/login", null);
        permitido("OPTIONS", "/api/gestiones", null);
        permitido("OPTIONS", "/api/gestiones", gestor());
    }

    @Test
    void sinToken_RespondeUnauthorized() {
        denegado("GET", "/api/gestiones", null, HttpStatus.UNAUTHORIZED);
        denegado("GET", "/api/empleados", "", HttpStatus.UNAUTHORIZED);
        denegado("GET", "/api/gestiones", "   ", HttpStatus.UNAUTHORIZED);
    }

    @Test
    void tokenInvalidoOAdulterado_RespondeUnauthorized() {
        denegado("GET", "/api/gestiones", "Bearer no.es.un.token", HttpStatus.UNAUTHORIZED);
        denegado("GET", "/api/gestiones", "Basic " + JwtUtil.generarToken("1", "GESTOR", "g", "X0001"),
                HttpStatus.UNAUTHORIZED);
    }

    // -------------------------------------------------------------- autenticado

    @Test
    void rolIngenuoQueNoExiste_TieneAccesoComoAutenticado() {
        permitido("GET", "/api/ruta-inexistente", token("ANALISTA"));
    }

    // ------------------------------------------------------------- respuestas

    @Test
    void denegar_DebeInformarElMotivo() {
        ConfigAcceso.Decision porRol = ConfigAcceso.evaluar("GET", "/api/deudores", admin());
        assertEquals("Acceso exclusivo del gestor. El administrador y el supervisor no gestionan la cobranza.",
                porRol.mensaje());
    }

    @Test
    void permitir_NoDevuelveEstadoNiMensaje() {
        ConfigAcceso.Decision decision = ConfigAcceso.evaluar("GET", "/api/empleados", gestor());
        assertNull(decision.estado());
        assertNull(decision.mensaje());
    }

    // --------------------------------------------------------------- gestiona

    @Test
    void gestiona_Get_SoloGestorYSupervisor() {
        permitido("GET", "/api/gestiones", gestor());
        permitido("GET", "/api/gestiones", supervisor());
        denegado("GET", "/api/gestiones", admin(), HttpStatus.FORBIDDEN);
    }

    @Test
    void gestiona_Post_SoloGestor() {
        permitido("POST", "/api/gestiones", gestor());
        denegado("POST", "/api/gestiones", supervisor(), HttpStatus.FORBIDDEN);
        denegado("POST", "/api/gestiones", admin(), HttpStatus.FORBIDDEN);
    }

    @Test
    void gestiona_MontoPagado_SoloGestor() {
        String ruta = "/api/gestiones/12/monto-pagado";
        permitido("PUT", ruta, gestor());
        denegado("PUT", ruta, supervisor(), HttpStatus.FORBIDDEN);
        denegado("PUT", ruta, admin(), HttpStatus.FORBIDDEN);
    }

    @Test
    void gestiona_PromesaYBonificacion_SonDelGestorYDeSuSupervisor() {
        String promesa = "/api/gestiones/12/promesa";
        String bonificacion = "/api/gestiones/12/estado-bonificacion";

        permitido("PUT", promesa, gestor());
        permitido("PUT", promesa, supervisor());
        denegado("PUT", promesa, admin(), HttpStatus.FORBIDDEN);

        permitido("PUT", bonificacion, gestor());
        permitido("PUT", bonificacion, supervisor());
        denegado("PUT", bonificacion, admin(), HttpStatus.FORBIDDEN);
    }

    @Test
    void gestiona_OtrasOperacionesNoSeAbrenAlSupervisor() {
        denegado("DELETE", "/api/gestiones/12", supervisor(), HttpStatus.FORBIDDEN);
        denegado("PATCH", "/api/gestiones/12", supervisor(), HttpStatus.FORBIDDEN);
    }

    // -------------------------------------------------------- cobranza diaria

    @Test
    void cobranzaDiaria_SoloGestor() {
        String[] rutas = {"/api/deudores", "/api/pagos", "/api/tickets", "/api/desgloses-deuda"};
        for (String ruta : rutas) {
            permitido("GET", ruta, gestor());
            denegado("GET", ruta, supervisor(), HttpStatus.FORBIDDEN);
            denegado("GET", ruta, admin(), HttpStatus.FORBIDDEN);
            denegado("POST", ruta, supervisor(), HttpStatus.FORBIDDEN);
        }
    }

    @Test
    void cobranzaDiaria_ElRolUsuarioLegadoTambienOpera() {
        permitido("GET", "/api/deudores", token("USUARIO"));
        permitido("POST", "/api/pagos", token("USUARIO"));
    }

    // ------------------------------------------------- administracion yRoles

    @Test
    void estructuraDeRoles_SoloAdministrador() {
        String[] rutas = {"/api/logs-auditoria", "/api/permisos", "/api/rol-permisos",
                "/api/empleado-roles", "/api/roles-campana"};
        for (String ruta : rutas) {
            denegado("GET", ruta, gestor(), HttpStatus.FORBIDDEN);
            denegado("GET", ruta, supervisor(), HttpStatus.FORBIDDEN);
            permitido("GET", ruta, admin());
        }
    }

    @Test
    void supervision_AdministradorYSupervisor() {
        permitido("GET", "/api/supervision", admin());
        permitido("GET", "/api/supervision", supervisor());
        denegado("GET", "/api/supervision", gestor(), HttpStatus.FORBIDDEN);
    }

    // --------------------------------------------------- escritura por rol

    @Test
    void asignacionesDeCartera_EscrituraDelAdministradorYDelSupervisor() {
        permitido("POST", "/api/asignaciones-cartera", admin());
        permitido("POST", "/api/asignaciones-cartera/por-lote", supervisor());
        permitido("DELETE", "/api/asignaciones-cartera/12", supervisor());
        denegado("POST", "/api/asignaciones-cartera", gestor(), HttpStatus.FORBIDDEN);
        denegado("POST", "/api/asignaciones-cartera/por-lote", gestor(), HttpStatus.FORBIDDEN);
        denegado("DELETE", "/api/asignaciones-cartera/12", gestor(), HttpStatus.FORBIDDEN);
    }

    @Test
    void asignacionesDeCartera_LaLecturaEsDeTodosLosAutenticados() {
        permitido("GET", "/api/asignaciones-cartera", gestor());
        permitido("GET", "/api/asignaciones-cartera", supervisor());
        permitido("GET", "/api/asignaciones-cartera", admin());
    }

    @Test
    void empleados_EscrituraSoloDelAdministrador() {
        permitido("POST", "/api/empleados", admin());
        denegado("POST", "/api/empleados", supervisor(), HttpStatus.FORBIDDEN);
        denegado("POST", "/api/empleados", gestor(), HttpStatus.FORBIDDEN);
    }

    @Test
    void metas_EscrituraDelAdministradorYDelSupervisor() {
        permitido("POST", "/api/metas", admin());
        permitido("POST", "/api/metas", supervisor());
        denegado("POST", "/api/metas", gestor(), HttpStatus.FORBIDDEN);
    }

    // ---------------------------------------------------------------- catalogos

    @Test
    void catalogos_CualquieraLeeElAdministradorEscribe() {
        String[] rutas = {"/api/conceptos", "/api/motivos-no-pago", "/api/tipos-promesa",
                "/api/tipos-ticket", "/api/rubros-cobro", "/api/tipos-producto", "/api/campanas",
                "/api/departamentos", "/api/telefonos", "/api/bonificaciones", "/api/empresas"};
        for (String ruta : rutas) {
            permitido("GET", ruta, gestor());
            permitido("GET", ruta, supervisor());
            permitido("GET", ruta, admin());
            permitido("POST", ruta, admin());
            denegado("POST", ruta, supervisor(), HttpStatus.FORBIDDEN);
            denegado("POST", ruta, gestor(), HttpStatus.FORBIDDEN);
        }
    }

    // ------------------------------------------------------------- prefijos

    @Test
    void elCoincididoDePrefijoRespetaElLimiteDeSegmento() {
        // "/api/gestionessecretas" no es "/api/gestiones": el limite de segmento
        // evita que una ruta parecida se cuele en la regla del gestor.
        permitido("GET", "/api/gestionessecretas", admin());
        permitido("GET", "/api/gestionessecretas", supervisor());
        permitido("GET", "/api/permisossimples", gestor());
    }
}
