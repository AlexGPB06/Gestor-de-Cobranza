package com.cobranza.saas_cobranza.util;

import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

/**
 * Reglas de acceso por rol.
 *
 * Gestion/Info (cartera, deudores, deudas, pagos, tickets y la meta propia) es
 * territorio exclusivo del GESTOR. El ADMINISTRADOR no opera la cobranza: solo
 * administra personal, catalogos, carteras asignadas y auditoria. El
 * SUPERVISOR no cobra: solo observa a su equipo.
 */
public final class Seguridad {

    public static final String ROL_ADMIN = "ADMINISTRADOR";
    public static final String ROL_SUPERVISOR = "SUPERVISOR";
    public static final String ROL_GESTOR = "GESTOR";
    public static final String ROL_USUARIO = "USUARIO";

    public static final String MENSAJE_SIN_TOKEN = "Token ausente o inválido";
    public static final String MENSAJE_NO_GESTOR =
            "Acceso exclusivo del gestor. El administrador y el supervisor no gestionan la cobranza.";
    public static final String MENSAJE_NO_SUPERVISOR =
            "Acceso exclusivo del supervisor a su propio equipo.";

    private Seguridad() {
    }

    public static JwtUtil.Sesion sesion(String authorization) {
        return JwtUtil.autenticar(authorization);
    }

    public static boolean esGestor(JwtUtil.Sesion sesion) {
        return sesion != null && sesion.tieneRol(ROL_GESTOR, ROL_USUARIO);
    }

    public static boolean esAdmin(JwtUtil.Sesion sesion) {
        return sesion != null && sesion.tieneRol(ROL_ADMIN);
    }

    public static boolean esSupervisor(JwtUtil.Sesion sesion) {
        return sesion != null && sesion.tieneRol(ROL_SUPERVISOR);
    }

    public static ResponseEntity<?> sinToken() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(MENSAJE_SIN_TOKEN);
    }

    public static ResponseEntity<?> soloGestor(String authorization) {
        JwtUtil.Sesion sesion = sesion(authorization);
        if (sesion == null) {
            return sinToken();
        }
        if (!esGestor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(MENSAJE_NO_GESTOR);
        }
        return null;
    }

    public static ResponseEntity<?> soloAdminOSupervisor(String authorization) {
        JwtUtil.Sesion sesion = sesion(authorization);
        if (sesion == null) {
            return sinToken();
        }
        if (!esAdmin(sesion) && !esSupervisor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acceso exclusivo del administrador o del supervisor.");
        }
        return null;
    }

    public static ResponseEntity<?> autenticado(String authorization) {
        return sesion(authorization) == null ? sinToken() : null;
    }

    /**
     * El supervisor solo puede consultar la informacion de su propio equipo.
     * El administrador puede ver cualquiera.
     */
    public static ResponseEntity<?> supervisorSobreSiMismo(String authorization, Long empleadoIdConsultado) {
        JwtUtil.Sesion sesion = sesion(authorization);
        if (sesion == null) {
            return sinToken();
        }
        if (esAdmin(sesion)) {
            return null;
        }
        if (!esSupervisor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(MENSAJE_NO_SUPERVISOR);
        }
        if (empleadoIdConsultado == null || !empleadoIdConsultado.equals(sesion.idEmpleado())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Un supervisor solo puede consultar los datos de su propio equipo.");
        }
        return null;
    }

    public static ResponseEntity<?> empleadoInactivo(EmpleadoRepository repo, JwtUtil.Sesion sesion) {
        if (sesion == null) {
            return sinToken();
        }
        Optional<Empleado> empleado = repo.findById(sesion.idEmpleado());
        if (empleado.isEmpty() || !Boolean.TRUE.equals(empleado.get().getActivo())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("El empleado del token no está activo");
        }
        return null;
    }
}
