package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.AsignacionCartera;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.AsignacionCarteraRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/asignaciones-cartera")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class AsignacionCarteraController {

    @Autowired
    private AsignacionCarteraRepository repository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    /**
     * El gestor solo ve su propia cartera. Administrador y supervisor
     * necesitan el listado completo para asignar carteras.
     */
    @GetMapping
    public ResponseEntity<?> listarTodos(@RequestHeader(value = "Authorization", required = false) String authorization,
                                         @RequestParam(required = false) Long empresaId,
                                         @RequestParam(required = false) Long empleadoId) {
        JwtUtil.Sesion sesion = Seguridad.sesion(authorization);
        if (sesion == null) {
            return Seguridad.sinToken();
        }
        if (Seguridad.esGestor(sesion)) {
            return ResponseEntity.ok(
                    repository.findByEmpleado_IdEmpleadoAndEstatusActivaTrue(sesion.idEmpleado()));
        }
        if (!Seguridad.esAdmin(sesion) && !Seguridad.esSupervisor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acceso exclusivo del gestor, el administrador o el supervisor.");
        }
        if (Seguridad.esSupervisor(sesion) && empleadoId != null && !empleadoId.equals(sesion.idEmpleado())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Un supervisor solo puede consultar las carteras de su propio equipo.");
        }
        if (empleadoId != null) {
            return ResponseEntity.ok(repository.findByEmpleado_IdEmpleadoAndEstatusActivaTrue(empleadoId));
        }
        if (empresaId != null) {
            return ResponseEntity.ok(repository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestBody AsignacionCartera asignacion) {
        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return Seguridad.sinToken();
        }
        if (!Seguridad.esAdmin(sesion) && !Seguridad.esSupervisor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acceso exclusivo del administrador o del supervisor.");
        }
        if (asignacion.getEmpleado() == null || asignacion.getEmpleado().getIdEmpleado() == null
                || asignacion.getDeuda() == null || asignacion.getDeuda().getIdDeuda() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("La asignación requiere el empleado y la deuda");
        }
        if (Seguridad.esSupervisor(sesion)) {
            ResponseEntity<?> bloqueado = validarGestorDeSuEquipo(sesion, asignacion.getEmpleado().getIdEmpleado());
            if (bloqueado != null) {
                return bloqueado;
            }
        }
        return ResponseEntity.ok(repository.save(asignacion));
    }

    @PostMapping("/por-lote")
    public ResponseEntity<?> crearPorLote(@RequestHeader(value = "Authorization", required = false) String authorization,
                                          @RequestBody Map<String, Object> body) {
        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return Seguridad.sinToken();
        }
        if (!Seguridad.esAdmin(sesion) && !Seguridad.esSupervisor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acceso exclusivo del administrador o del supervisor.");
        }
        Object empleadoRaw = body.get("empleadoId");
        Object deudasRaw = body.get("deudaIds");
        if (empleadoRaw == null || deudasRaw == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("empleadoId y deudaIds son obligatorios");
        }
        Long empleadoId = Long.parseLong(empleadoRaw.toString());
        Empleado empleado = empleadoRepository.findById(empleadoId).orElse(null);
        if (empleado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El empleado no existe");
        }
        if (Seguridad.esSupervisor(sesion)) {
            ResponseEntity<?> bloqueado = validarGestorDeSuEquipo(sesion, empleadoId);
            if (bloqueado != null) {
                return bloqueado;
            }
        }
        if (!(deudasRaw instanceof List<?>)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("deudaIds debe ser una lista");
        }
        int asignadas = 0;
        List<String> errores = new ArrayList<>();
        for (Object o : (List<?>) deudasRaw) {
            if (o == null) continue;
            try {
                Long deudaId = Long.parseLong(o.toString());
                boolean yaActiva = repository.findByDeuda_IdDeudaAndEstatusActivaTrue(deudaId).stream()
                        .anyMatch(a -> Boolean.TRUE.equals(a.getEstatusActiva()));
                if (yaActiva) {
                    continue;
                }
                Deuda deuda = deudaRepository.findById(deudaId).orElse(null);
                if (deuda == null) {
                    errores.add("Deuda inexistente: " + deudaId);
                    continue;
                }
                AsignacionCartera asignacion = new AsignacionCartera();
                asignacion.setEmpleado(empleado);
                asignacion.setDeuda(deuda);
                asignacion.setFechaAsignacion(LocalDate.now());
                asignacion.setEstatusActiva(true);
                repository.save(asignacion);
                asignadas++;
            } catch (NumberFormatException e) {
                errores.add("Id inválido: " + o);
            }
        }
        Map<String, Object> respuesta = new java.util.HashMap<>();
        respuesta.put("asignadas", asignadas);
        respuesta.put("errores", errores);
        return ResponseEntity.ok(respuesta);
    }

    /**
     * Libera una cuenta (estatusActiva = false) para poder reasignarla. El
     * administrador libera cualquier cuenta; el supervisor solo las de los
     * gestores de su propio equipo.
     */
    @DeleteMapping("/{idAsignacion}")
    public ResponseEntity<?> eliminar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @PathVariable Long idAsignacion) {
        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return Seguridad.sinToken();
        }
        if (!Seguridad.esAdmin(sesion) && !Seguridad.esSupervisor(sesion)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Acceso exclusivo del administrador o del supervisor.");
        }
        AsignacionCartera asignacion = repository.findById(idAsignacion).orElse(null);
        if (asignacion == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La asignación no existe");
        }
        if (Seguridad.esSupervisor(sesion)) {
            Empleado destino = asignacion.getEmpleado();
            boolean esDeSuEquipo = destino != null && destino.getSupervisor() != null
                    && destino.getSupervisor().getIdEmpleado() != null
                    && destino.getSupervisor().getIdEmpleado().equals(sesion.idEmpleado());
            if (!esDeSuEquipo) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Un supervisor solo puede modificar las carteras de su propio equipo.");
            }
        }
        asignacion.setEstatusActiva(false);
        repository.save(asignacion);

        Map<String, Object> respuesta = new java.util.HashMap<>();
        respuesta.put("mensaje", "Cuenta liberada");
        respuesta.put("idAsignacion", asignacion.getIdAsignacion());
        return ResponseEntity.ok(respuesta);
    }

    /**
     * El supervisor solo reparte cartera entre gestores que le reportan: rol
     * GESTOR y supervisor = yo. El administrador no tiene esta restriccion.
     */
    private ResponseEntity<?> validarGestorDeSuEquipo(JwtUtil.Sesion sesion, Long empleadoDestinoId) {
        Empleado destino = empleadoRepository.findById(empleadoDestinoId).orElse(null);
        if (destino == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El empleado no existe");
        }
        boolean esGestor = "GESTOR".equalsIgnoreCase(destino.getRol())
                || "USUARIO".equalsIgnoreCase(destino.getRol());
        boolean esDeSuEquipo = destino.getSupervisor() != null
                && destino.getSupervisor().getIdEmpleado() != null
                && destino.getSupervisor().getIdEmpleado().equals(sesion.idEmpleado());
        if (!esGestor || !esDeSuEquipo) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Un supervisor solo puede asignar carteras a gestores de su propio equipo.");
        }
        return null;
    }
}