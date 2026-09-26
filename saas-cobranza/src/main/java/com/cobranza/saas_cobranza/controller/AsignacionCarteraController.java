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
@CrossOrigin(origins = "http://localhost:5173")
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
        ResponseEntity<?> bloqueado = Seguridad.soloAdmin(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        if (asignacion.getEmpleado() == null || asignacion.getEmpleado().getIdEmpleado() == null
                || asignacion.getDeuda() == null || asignacion.getDeuda().getIdDeuda() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("La asignación requiere el empleado y la deuda");
        }
        return ResponseEntity.ok(repository.save(asignacion));
    }

    @PostMapping("/por-lote")
    public ResponseEntity<?> crearPorLote(@RequestHeader(value = "Authorization", required = false) String authorization,
                                          @RequestBody Map<String, Object> body) {
        ResponseEntity<?> bloqueado = Seguridad.soloAdmin(authorization);
        if (bloqueado != null) {
            return bloqueado;
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
}