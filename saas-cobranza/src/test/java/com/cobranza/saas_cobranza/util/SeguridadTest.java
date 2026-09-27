package com.cobranza.saas_cobranza.util;

import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeguridadTest {

    @Mock
    private EmpleadoRepository repo;

    private static String cabecera(String rol, long id) {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(id), rol, "u." + rol.toLowerCase(), "X0001");
    }

    private static String admin() {
        return cabecera("ADMINISTRADOR", 1L);
    }

    private static String supervisor() {
        return cabecera("SUPERVISOR", 80L);
    }

    private static String gestor() {
        return cabecera("GESTOR", 90L);
    }

    // ------------------------------------------------------------- predicados

    @Test
    void esGestor_ReconoceGestorYElRolUsuarioLegado() {
        assertTrue(Seguridad.esGestor(Seguridad.sesion(gestor())));
        assertTrue(Seguridad.esGestor(Seguridad.sesion(cabecera("USUARIO", 91L))));
    }

    @Test
    void esGestor_RechazaLosOtrosRolesYSesionNull() {
        assertFalse(Seguridad.esGestor(Seguridad.sesion(admin())));
        assertFalse(Seguridad.esGestor(Seguridad.sesion(supervisor())));
        assertFalse(Seguridad.esGestor(null));
    }

    @Test
    void esAdminYEsSupervisor_SonExcluyentes() {
        assertTrue(Seguridad.esAdmin(Seguridad.sesion(admin())));
        assertFalse(Seguridad.esSupervisor(Seguridad.sesion(admin())));

        assertTrue(Seguridad.esSupervisor(Seguridad.sesion(supervisor())));
        assertFalse(Seguridad.esAdmin(Seguridad.sesion(supervisor())));

        assertFalse(Seguridad.esAdmin(Seguridad.sesion(gestor())));
        assertFalse(Seguridad.esSupervisor(Seguridad.sesion(gestor())));
        assertFalse(Seguridad.esAdmin(null));
        assertFalse(Seguridad.esSupervisor(null));
    }

    // ------------------------------------------------------------- respuestas

    @Test
    void sinToken_RespondeUnauthorized() {
        ResponseEntity<?> respuesta = Seguridad.sinToken();

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
        assertEquals(Seguridad.MENSAJE_SIN_TOKEN, respuesta.getBody());
    }

    // ------------------------------------------------------------ solo gestor

    @Test
    void soloGestor_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, Seguridad.soloGestor(null).getStatusCode());
    }

    @Test
    void soloGestor_ConGestorNoDevuelveRespuesta() {
        assertNull(Seguridad.soloGestor(gestor()));
    }

    @Test
    void soloGestor_ConAdminOSupervisorRespondeForbidden() {
        ResponseEntity<?> conAdmin = Seguridad.soloGestor(admin());
        ResponseEntity<?> conSupervisor = Seguridad.soloGestor(supervisor());

        assertEquals(HttpStatus.FORBIDDEN, conAdmin.getStatusCode());
        assertEquals(Seguridad.MENSAJE_NO_GESTOR, conAdmin.getBody());
        assertEquals(HttpStatus.FORBIDDEN, conSupervisor.getStatusCode());
    }

    // ------------------------------------------- administrador o supervisor

    @Test
    void soloAdminOSupervisor_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, Seguridad.soloAdminOSupervisor(null).getStatusCode());
    }

    @Test
    void soloAdminOSupervisor_AceptaAdminYSupervisor() {
        assertNull(Seguridad.soloAdminOSupervisor(admin()));
        assertNull(Seguridad.soloAdminOSupervisor(supervisor()));
    }

    @Test
    void soloAdminOSupervisor_RechazaAlGestor() {
        ResponseEntity<?> respuesta = Seguridad.soloAdminOSupervisor(gestor());

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals("Acceso exclusivo del administrador o del supervisor.", respuesta.getBody());
    }

    // ------------------------------------------------------------ autenticado

    @Test
    void autenticado_SinTokenRespondeUnauthorizedYConTokenNoDevuelveRespuesta() {
        assertEquals(HttpStatus.UNAUTHORIZED, Seguridad.autenticado(null).getStatusCode());
        assertNull(Seguridad.autenticado(gestor()));
        assertNull(Seguridad.autenticado(admin()));
    }

    // ------------------------------------------------------ supervision propia

    @Test
    void supervisorSobreSiMismo_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, Seguridad.supervisorSobreSiMismo(null, 80L).getStatusCode());
    }

    @Test
    void supervisorSobreSiMismo_ElAdministradorConsultaATodos() {
        assertNull(Seguridad.supervisorSobreSiMismo(admin(), 80L));
        assertNull(Seguridad.supervisorSobreSiMismo(admin(), 999L));
    }

    @Test
    void supervisorSobreSiMismo_ElSupervisorSoloConsultaSuPropioEquipo() {
        assertNull(Seguridad.supervisorSobreSiMismo(supervisor(), 80L));
    }

    @Test
    void supervisorSobreSiMismo_ElSupervisorNoConsultaLaCarteraAjena() {
        ResponseEntity<?> otro = Seguridad.supervisorSobreSiMismo(supervisor(), 90L);
        ResponseEntity<?> sinId = Seguridad.supervisorSobreSiMismo(supervisor(), null);

        assertEquals(HttpStatus.FORBIDDEN, otro.getStatusCode());
        assertEquals("Un supervisor solo puede consultar los datos de su propio equipo.", otro.getBody());
        assertEquals(HttpStatus.FORBIDDEN, sinId.getStatusCode());
    }

    @Test
    void supervisorSobreSiMismo_ElGestorNoEntra() {
        ResponseEntity<?> respuesta = Seguridad.supervisorSobreSiMismo(gestor(), 90L);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals(Seguridad.MENSAJE_NO_SUPERVISOR, respuesta.getBody());
    }

    // -------------------------------------------------------- empleado inactivo

    @Test
    void empleadoInactivo_SinSesionRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED,
                Seguridad.empleadoInactivo(repo, null).getStatusCode());
    }

    @Test
    void empleadoInactivo_NoExisteEnLaBaseRespondeUnauthorized() {
        JwtUtil.Sesion sesion = Seguridad.sesion(gestor());
        when(repo.findById(90L)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = Seguridad.empleadoInactivo(repo, sesion);

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
        assertEquals("El empleado del token no está activo", respuesta.getBody());
    }

    @Test
    void empleadoInactivo_DesactivadoRespondeUnauthorized() {
        JwtUtil.Sesion sesion = Seguridad.sesion(gestor());
        Empleado desactivado = new Empleado();
        desactivado.setActivo(false);
        when(repo.findById(90L)).thenReturn(Optional.of(desactivado));

        assertEquals(HttpStatus.UNAUTHORIZED,
                Seguridad.empleadoInactivo(repo, sesion).getStatusCode());
    }

    @Test
    void empleadoInactivo_ActivoNoDevuelveRespuesta() {
        JwtUtil.Sesion sesion = Seguridad.sesion(gestor());
        Empleado activo = new Empleado();
        activo.setActivo(true);
        when(repo.findById(90L)).thenReturn(Optional.of(activo));

        assertNull(Seguridad.empleadoInactivo(repo, sesion));
    }

    @Test
    void laClaseNoSeInstancia() throws Exception {
        var constructor = Seguridad.class.getDeclaredConstructor();
        constructor.setAccessible(true);

        Object instancia = constructor.newInstance();

        assertNotNull(instancia);
    }
}
