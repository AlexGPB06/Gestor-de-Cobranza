package com.cobranza.saas_cobranza.config;

import com.cobranza.saas_cobranza.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

/**
 * Matriz de acceso de la API.
 *
 * Gestion/Info (cartera, deudores, payments, tickets) y la meta propia son
 * territorio exclusivo del GESTOR. El ADMINISTRADOR no opera la cartera: solo
 * administra el personal. El SUPERVISOR no cobra: observa a su equipo y
 * reparte las carteras entre sus propios gestores.
 *
 * Los controladores de la operacion diaria (Gestion, Deudor, Deuda, Pago,
 * Ticket, Supervision, AsignacionCartera) validan ademas la pertenencia del
 * recurso al usuario; aqui se cubre la capa general para el resto de la API.
 */
@Configuration
public class ConfigAcceso implements WebMvcConfigurer {

    private static final String ROL_ADMIN = "ADMINISTRADOR";
    private static final String ROL_SUPERVISOR = "SUPERVISOR";
    private static final String ROL_GESTOR = "GESTOR";
    private static final String ROL_USUARIO = "USUARIO";

    private static final String SIN_TOKEN = "Token ausente o inválido";
    private static final String NO_GESTOR =
            "Acceso exclusivo del gestor. El administrador y el supervisor no gestionan la cobranza.";
    private static final String NO_GESTOR_O_SUPERVISOR =
            "Acceso exclusivo del gestor o del supervisor de su equipo.";
    private static final String NO_ADMIN = "Acceso exclusivo del administrador.";
    private static final String NO_ADMIN_O_SUPERVISOR =
            "Acceso exclusivo del administrador o del supervisor.";

    private static final Set<String> PUBLICAS = Set.of(
            "/api/empleados/login",
            "/api/empleados/activar"
    );

    /** Operacion de cobranza: solo el gestor, lectura y escritura. */
    private static final List<String> SOLO_GESTOR = List.of(
            "/api/deudores", "/api/pagos",
            "/api/tickets", "/api/desgloses-deuda"
    );

    /**
     * Gestiones: el gestor las opera y el supervisor comparte una parte muy
     * concreta de ellas (ver esAccesoDeSupervisorAEquipo).
     */
    private static final List<String> GESTIONES = List.of("/api/gestiones");

    /** Estructura de roles, permisos y auditoria: solo el administrador. */
    private static final List<String> SOLO_ADMIN = List.of(
            "/api/logs-auditoria", "/api/permisos", "/api/rol-permisos",
            "/api/empleado-roles", "/api/roles-campana"
    );

    /** Solo lectura de supervision. */
    private static final List<String> SUPERVISION = List.of("/api/supervision");

    /** Escritura que solo hace el administrador. */
    private static final List<String> ESCRITURA_ADMIN = List.of("/api/empleados");

    /**
     * Asignacion de carteras: el administrador reparte libremente y el
     * supervisor lo hace solo dentro de su equipo (lo valida el controlador).
     */
    private static final List<String> ESCRITURA_ADMIN_O_SUPERVISOR = List.of(
            "/api/metas", "/api/asignaciones-cartera"
    );

    /** Catalogs: cualquiera los lee, el administrador los escribe. */
    private static final List<String> CATALOGOS = List.of(
            "/api/conceptos", "/api/motivos-no-pago", "/api/tipos-promesa", "/api/tipos-ticket",
            "/api/rubros-cobro", "/api/tipos-producto", "/api/campanas", "/api/departamentos",
            "/api/telefonos", "/api/bonificaciones", "/api/empresas"
    );

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                                     Object handler) throws IOException {
                if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                    return true;
                }
                Decision decision = evaluar(request.getMethod(), request.getRequestURI(),
                        request.getHeader("Authorization"));
                if (decision.permitido()) {
                    return true;
                }
                return responder(response, decision.estado(), decision.mensaje());
            }
        }).addPathPatterns("/api/**");
    }

    /** Resultado de la matriz de acceso. */
    public record Decision(boolean permitido, HttpStatus estado, String mensaje) {

        static Decision permitir() {
            return new Decision(true, null, null);
        }

        static Decision denegar(HttpStatus estado, String mensaje) {
            return new Decision(false, estado, mensaje);
        }
    }

    /**
     * Decision pura de acceso, sin servlet ni HTTP, para poder probarla
     * directamente con pruebas unitarias.
     */
    public static Decision evaluar(String metodo, String ruta, String cabeceraAuthorization) {
        if ("OPTIONS".equalsIgnoreCase(metodo)) {
            return Decision.permitir();
        }
        if (PUBLICAS.contains(ruta)) {
            return Decision.permitir();
        }

        JwtUtil.Sesion sesion = JwtUtil.autenticar(cabeceraAuthorization);
        if (sesion == null) {
            return Decision.denegar(HttpStatus.UNAUTHORIZED, SIN_TOKEN);
        }

        boolean escritura = !"GET".equalsIgnoreCase(metodo) && !"HEAD".equalsIgnoreCase(metodo);
        boolean admin = sesion.tieneRol(ROL_ADMIN);
        boolean supervisor = sesion.tieneRol(ROL_SUPERVISOR);
        boolean gestor = sesion.tieneRol(ROL_GESTOR, ROL_USUARIO);

        if (empezarCon(ruta, GESTIONES)) {
            if (gestor) {
                return Decision.permitir();
            }
            if (supervisor && esAccesoDeSupervisorAEquipo(metodo, ruta)) {
                return Decision.permitir();
            }
            return Decision.denegar(HttpStatus.FORBIDDEN, NO_GESTOR_O_SUPERVISOR);
        }
        if (empezarCon(ruta, SOLO_GESTOR)) {
            return gestor ? Decision.permitir()
                    : Decision.denegar(HttpStatus.FORBIDDEN, NO_GESTOR);
        }
        if (empezarCon(ruta, SOLO_ADMIN)) {
            return admin ? Decision.permitir()
                    : Decision.denegar(HttpStatus.FORBIDDEN, NO_ADMIN);
        }
        if (empezarCon(ruta, SUPERVISION)) {
            return (admin || supervisor) ? Decision.permitir()
                    : Decision.denegar(HttpStatus.FORBIDDEN, NO_ADMIN_O_SUPERVISOR);
        }
        if (escritura && empezarCon(ruta, ESCRITURA_ADMIN)) {
            return admin ? Decision.permitir()
                    : Decision.denegar(HttpStatus.FORBIDDEN, NO_ADMIN);
        }
        if (escritura && empezarCon(ruta, ESCRITURA_ADMIN_O_SUPERVISOR)) {
            return (admin || supervisor) ? Decision.permitir()
                    : Decision.denegar(HttpStatus.FORBIDDEN, NO_ADMIN_O_SUPERVISOR);
        }
        if (escritura && empezarCon(ruta, CATALOGOS)) {
            return admin ? Decision.permitir()
                    : Decision.denegar(HttpStatus.FORBIDDEN, NO_ADMIN);
        }
        return Decision.permitir();
    }

    private static boolean empezarCon(String ruta, List<String> prefijos) {
        for (String prefijo : prefijos) {
            if (ruta.equals(prefijo) || ruta.startsWith(prefijo + "/")) {
                return true;
            }
        }
        return false;
    }

    /**
     * El supervisor no cobra, pero necesita seguir a su equipo y mover las
     * promesas o bonificaciones de sus propios gestores. Autorizar solo esas
     * operaciones y dejar que GestionController valide de whom es la gestion
     * evita abrirle la cartera ajena.
     */
    private static boolean esAccesoDeSupervisorAEquipo(String metodo, String ruta) {
        if ("GET".equalsIgnoreCase(metodo) || "HEAD".equalsIgnoreCase(metodo)) {
            return true;
        }
        if (!"PUT".equalsIgnoreCase(metodo)) {
            return false;
        }
        return ruta.endsWith("/promesa") || ruta.endsWith("/estado-bonificacion");
    }

    private static boolean responder(HttpServletResponse response, HttpStatus estado, String mensaje)
            throws IOException {
        response.setStatus(estado.value());
        response.setContentType("application/json; charset=UTF-8");
        response.getOutputStream().write(("\"" + mensaje + "\"").getBytes(StandardCharsets.UTF_8));
        return false;
    }
}
