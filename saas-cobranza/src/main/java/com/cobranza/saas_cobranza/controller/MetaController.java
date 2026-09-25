package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Campana;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.Gestion;
import com.cobranza.saas_cobranza.Meta;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.MetaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/metas")
public class MetaController {

    private static final String ROL_ADMIN = "ADMINISTRADOR";
    private static final String ROL_SUPERVISOR = "SUPERVISOR";
    private static final String ROL_GESTOR = "GESTOR";

    @Autowired
    private MetaRepository metaRepository;

    @Autowired
    private GestionRepository gestionRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private CampanaRepository campanaRepository;

    @PostMapping
    public ResponseEntity<?> crearMeta(@RequestHeader(value = "Authorization", required = false) String authorization,
                                       @RequestBody Map<String, Object> datos) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_SUPERVISOR, ROL_ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el supervisor o el administrador pueden dar de alta metas");
        }

        String descripcion = texto(datos, "descripcion");
        if (descripcion == null || descripcion.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La descripción es obligatoria");
        }

        Long idCampana = numero(datos, "idCampana");
        if (idCampana == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La campaña es obligatoria");
        }
        Campana campana = campanaRepository.findById(idCampana).orElse(null);
        if (campana == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La campaña no existe");
        }

        LocalDate fechaInicio = fecha(datos, "fechaInicio");
        if (fechaInicio == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La fecha de inicio es obligatoria");
        }
        LocalDate fechaFin = fecha(datos, "fechaFin");
        if (fechaFin == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La fecha de fin es obligatoria");
        }
        if (fechaFin.isBefore(fechaInicio)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("La fecha de fin no puede ser anterior a la fecha de inicio");
        }

        Integer objetivoGestiones = entero(datos, "objetivoGestiones");
        if (objetivoGestiones != null && objetivoGestiones < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El objetivo de gestiones no puede ser negativo");
        }
        BigDecimal objetivoMonto = decimal(datos, "objetivoMonto");
        if (objetivoMonto != null && objetivoMonto.signum() < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El objetivo de monto no puede ser negativo");
        }

        String periodo = texto(datos, "periodo");
        if (periodo != null && !periodo.isBlank()) {
            String normalizado = periodo.trim().toUpperCase();
            if (!normalizado.matches("DIARIO|SEMANAL|MENSUAL")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("El periodo debe ser DIARIO, SEMANAL o MENSUAL");
            }
            periodo = normalizado;
        } else {
            periodo = null;
        }

        Empleado supervisor = empleadoRepository.findById(sesion.idEmpleado()).orElse(null);
        if (supervisor == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("El empleado del token no existe");
        }
        if (campana.getEmpresa() != null && supervisor.getEmpresa() != null
                && !campana.getEmpresa().getIdEmpresa().equals(supervisor.getEmpresa().getIdEmpresa())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El supervisor y la campaña deben pertenecer a la misma empresa");
        }

        Meta meta = new Meta();
        meta.setDescripcion(descripcion.trim());
        meta.setCampana(campana);
        meta.setSupervisor(supervisor);
        meta.setPeriodo(periodo);
        meta.setObjetivoGestiones(objetivoGestiones);
        meta.setObjetivoMonto(objetivoMonto);
        meta.setFechaInicio(fechaInicio);
        meta.setFechaFin(fechaFin);
        meta.setActivo(true);

        return ResponseEntity.status(HttpStatus.CREATED).body(metaRepository.save(meta));
    }

    @GetMapping
    public ResponseEntity<?> listar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestParam(required = false) Long campanaId) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }

        if (sesion.tieneRol(ROL_GESTOR)) {
            if (campanaId != null) {
                return ResponseEntity.ok(metaRepository.findByCampana_IdCampanaAndActivoTrue(campanaId));
            }
            return ResponseEntity.ok(metaRepository.findByActivoTrue());
        }

        if (campanaId != null) {
            return ResponseEntity.ok(metaRepository.findByCampana_IdCampana(campanaId));
        }
        return ResponseEntity.ok(metaRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@RequestHeader(value = "Authorization", required = false) String authorization,
                                    @PathVariable Long id) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }

        Meta meta = metaRepository.findById(id).orElse(null);
        if (meta == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La meta no existe");
        }
        if (sesion.tieneRol(ROL_GESTOR) && !Boolean.TRUE.equals(meta.getActivo())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La meta no existe");
        }
        return ResponseEntity.ok(meta);
    }

    @GetMapping("/{id}/progreso")
    public ResponseEntity<?> progreso(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @PathVariable Long id) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }

        Meta meta = metaRepository.findById(id).orElse(null);
        if (meta == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La meta no existe");
        }

        List<Gestion> gestiones = gestionRepository.findByMeta_IdMeta(id);

        BigDecimal montoPrometido = BigDecimal.ZERO;
        BigDecimal montoCobrado = BigDecimal.ZERO;
        Set<Long> gestores = new LinkedHashSet<>();
        for (Gestion gestion : gestiones) {
            if (gestion.getMontoPromesa() != null) {
                montoPrometido = montoPrometido.add(gestion.getMontoPromesa());
            }
            if (gestion.getMontoPagado() != null) {
                montoCobrado = montoCobrado.add(gestion.getMontoPagado());
            }
            if (gestion.getEmpleado() != null && gestion.getEmpleado().getIdEmpleado() != null) {
                gestores.add(gestion.getEmpleado().getIdEmpleado());
            }
        }

        Integer objetivoGestiones = meta.getObjetivoGestiones();
        BigDecimal cumplimiento = BigDecimal.ZERO;
        if (objetivoGestiones != null && objetivoGestiones > 0) {
            cumplimiento = BigDecimal.valueOf(gestiones.size())
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(objetivoGestiones), 2, RoundingMode.HALF_UP);
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("meta", meta);
        respuesta.put("totalGestiones", gestiones.size());
        respuesta.put("gestoresParticipantes", gestores.size());
        respuesta.put("montoPrometido", montoPrometido);
        respuesta.put("montoCobrado", montoCobrado);
        respuesta.put("cumplimientoPorcentaje", cumplimiento);
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                        @PathVariable Long id,
                                        @RequestBody Map<String, Object> datos) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }

        Meta meta = metaRepository.findById(id).orElse(null);
        if (meta == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La meta no existe");
        }

        boolean esDueño = meta.getSupervisor() != null
                && sesion.idEmpleado().equals(meta.getSupervisor().getIdEmpleado());
        if (!sesion.tieneRol(ROL_ADMIN) && !(sesion.tieneRol(ROL_SUPERVISOR) && esDueño)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el supervisor de la meta o el administrador pueden modificarla");
        }

        String descripcion = texto(datos, "descripcion");
        if (descripcion != null && !descripcion.isBlank()) {
            meta.setDescripcion(descripcion.trim());
        }

        Integer objetivoGestiones = entero(datos, "objetivoGestiones");
        if (objetivoGestiones != null) {
            if (objetivoGestiones < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("El objetivo de gestiones no puede ser negativo");
            }
            meta.setObjetivoGestiones(objetivoGestiones);
        }

        BigDecimal objetivoMonto = decimal(datos, "objetivoMonto");
        if (objetivoMonto != null) {
            if (objetivoMonto.signum() < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("El objetivo de monto no puede ser negativo");
            }
            meta.setObjetivoMonto(objetivoMonto);
        }

        LocalDate fechaFin = fecha(datos, "fechaFin");
        if (fechaFin != null) {
            if (fechaFin.isBefore(meta.getFechaInicio())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("La fecha de fin no puede ser anterior a la fecha de inicio");
            }
            meta.setFechaFin(fechaFin);
        }

        Object activo = datos.get("activo");
        if (activo != null) {
            meta.setActivo(Boolean.parseBoolean(activo.toString()));
        }

        return ResponseEntity.ok(metaRepository.save(meta));
    }

    @GetMapping("/supervisor/{supervisorId}")
    public ResponseEntity<?> listarPorSupervisor(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long supervisorId) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_SUPERVISOR, ROL_ADMIN)
                && !sesion.idEmpleado().equals(supervisorId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No puede consultar las metas de otro supervisor");
        }
        return ResponseEntity.ok(metaRepository.findBySupervisor_IdEmpleado(supervisorId));
    }

    private String texto(Map<String, Object> datos, String clave) {
        Object valor = datos.get(clave);
        return valor == null ? null : valor.toString();
    }

    private Long numero(Map<String, Object> datos, String clave) {
        Object valor = datos.get(clave);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(valor.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer entero(Map<String, Object> datos, String clave) {
        Object valor = datos.get(clave);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(valor.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private BigDecimal decimal(Map<String, Object> datos, String clave) {
        Object valor = datos.get(clave);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(valor.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate fecha(Map<String, Object> datos, String clave) {
        Object valor = datos.get(clave);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(valor.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }
}
