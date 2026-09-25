package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Gestion;
import com.cobranza.saas_cobranza.Telefono;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Concepto;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.Meta;
import com.cobranza.saas_cobranza.TipoPromesa;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.TelefonoRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.ConceptoRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.MetaRepository;
import com.cobranza.saas_cobranza.repository.TipoPromesaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/gestiones")
public class GestionController {

    private static final String ROL_ADMIN = "ADMINISTRADOR";
    private static final String ROL_SUPERVISOR = "SUPERVISOR";
    private static final String ROL_GESTOR = "GESTOR";

    @Autowired
    private GestionRepository gestionRepository;

    @Autowired
    private TelefonoRepository telefonoRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @Autowired
    private ConceptoRepository conceptoRepository;

    @Autowired
    private TipoPromesaRepository tipoPromesaRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private MetaRepository metaRepository;

    @GetMapping
    public List<Gestion> obtenerTodas(@RequestParam(required = false) Long empresaId,
                                      @RequestParam(required = false) Long empleadoId) {
        if (empleadoId != null) {
            return gestionRepository.findByEmpleado_IdEmpleado(empleadoId);
        }
        if (empresaId != null) {
            return gestionRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(empresaId);
        }
        return gestionRepository.findAll();
    }

    private boolean esConceptoPromesa(Concepto concepto) {
        if (concepto == null) return false;
        String cat = concepto.getCategoria() == null ? "" : concepto.getCategoria().toLowerCase();
        String nom = concepto.getNombreConcepto() == null ? "" : concepto.getNombreConcepto().toLowerCase();
        return cat.contains("promesa") || nom.contains("promesa");
    }

    private boolean esTipoPromocionConvenio(Gestion gestion) {
        if (gestion == null || gestion.getTipoPromesa() == null || gestion.getTipoPromesa().getIdTipoPromesa() == null) {
            return false;
        }
        TipoPromesa tp = tipoPromesaRepository.findById(gestion.getTipoPromesa().getIdTipoPromesa()).orElse(null);
        if (tp == null || tp.getNombre() == null) {
            return false;
        }
        String nom = tp.getNombre().toLowerCase();
        return nom.contains("promoci") || nom.contains("conveni");
    }

    @PostMapping
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ResponseEntity<?> crearGestion(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Gestion gestion) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (sesion.tieneRol(ROL_SUPERVISOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("El supervisor solo puede dar de alta metas");
        }
        if (!sesion.tieneRol(ROL_GESTOR, ROL_ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el gestor o el administrador pueden registrar gestiones");
        }

        Empleado empleadoAutenticado = empleadoRepository.findById(sesion.idEmpleado()).orElse(null);
        if (empleadoAutenticado == null || !Boolean.TRUE.equals(empleadoAutenticado.getActivo())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("El empleado del token no está activo");
        }
        gestion.setEmpleado(empleadoAutenticado);

        // --- Validación de promesas ---
        Long idDeuda = gestion.getDeuda() != null ? gestion.getDeuda().getIdDeuda() : null;
        Long idConcepto = gestion.getConcepto() != null ? gestion.getConcepto().getIdConcepto() : null;

        Deuda deudaBD = null;
        if (idDeuda != null) {
            deudaBD = deudaRepository.findByIdBloqueado(idDeuda).orElse(null);
            if (deudaBD == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La deuda no existe");
            }
        }

        if (idDeuda != null && idConcepto != null) {
            Concepto concepto = conceptoRepository.findById(idConcepto).orElse(null);

            if (esConceptoPromesa(concepto)) {
                LocalDate hoy = LocalDate.now();

                if (gestion.getFechaPromesa() == null) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("La promesa requiere una fecha de pago.");
                }

                // a) Ventana de días permitida según la campaña (empresa)
                Integer diasMaximos = (deudaBD.getDeudor() != null && deudaBD.getDeudor().getCampana() != null)
                        ? deudaBD.getDeudor().getCampana().getDiasMaximosPromesa()
                        : null;
                if (diasMaximos != null && gestion.getFechaPromesa().isAfter(hoy.plusDays(diasMaximos))) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("La fecha de promesa excede la ventana permitida de " + diasMaximos + " día(s) de la campaña.");
                }

                // b) Solo puede existir UNA promesa vigente por producto
                List<Gestion> conFecha = gestionRepository
                        .findByDeuda_IdDeudaAndFechaPromesaGreaterThanEqual(idDeuda, hoy);
                boolean hayVigente = conFecha.stream().anyMatch(g -> esConceptoPromesa(g.getConcepto()));
                if (hayVigente) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("Ya existe una promesa vigente para este producto. No se puede registrar otra promesa hasta que venza.");
                }
            }
        }

        // --- Validación de promesa ---
        if (gestion.getMeta() != null && gestion.getMeta().getIdMeta() != null) {
            Meta meta = metaRepository.findById(gestion.getMeta().getIdMeta()).orElse(null);
            if (meta == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La meta no existe");
            }
            if (!Boolean.TRUE.equals(meta.getActivo())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La meta no está activa");
            }
            if (idDeuda != null) {
                Long campanaDeuda = (deudaBD.getDeudor() != null && deudaBD.getDeudor().getCampana() != null)
                        ? deudaBD.getDeudor().getCampana().getIdCampana() : null;
                Long campanaMeta = meta.getCampana() != null ? meta.getCampana().getIdCampana() : null;
                if (campanaDeuda != null && campanaMeta != null && !campanaDeuda.equals(campanaMeta)) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                            .body("La meta y la deuda pertenecen a campañas distintas");
                }
            }
            gestion.setMeta(meta);
        }

        // --- Validación de montos ---
        if (gestion.getMontoPagado() != null && gestion.getMontoPromesa() != null
                && gestion.getMontoPagado().compareTo(gestion.getMontoPromesa()) > 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El monto pagado no puede superar el monto prometido");
        }

        // --- Guardado ---
        if (gestion.getEstadoBonificacion() == null && esTipoPromocionConvenio(gestion)) {
            gestion.setEstadoBonificacion("PENDIENTE");
        }
        Gestion guardada = gestionRepository.save(gestion);
        if (deudaId(gestion) != null && gestion.getNumeroMarcado() != null && !gestion.getNumeroMarcado().isBlank()) {
            Long idDeudor = null;
            if (gestion.getDeuda().getDeudor() != null) {
                idDeudor = gestion.getDeuda().getDeudor().getIdDeudor();
            }
            if (idDeudor == null && gestion.getDeuda().getIdDeuda() != null) {
                idDeudor = gestionRepository.findById(gestion.getDeuda().getIdDeuda())
                        .map(g -> g.getDeuda().getDeudor().getIdDeudor()).orElse(null);
            }
            if (idDeudor != null) {
                List<Telefono> coincidencias = telefonoRepository
                        .findByDeudor_IdDeudorAndNumeroTelefono(idDeudor, gestion.getNumeroMarcado());
                for (Telefono tel : coincidencias) {
                    tel.setEstatus("Efectivo");
                    telefonoRepository.save(tel);
                }
            }
        }
        return ResponseEntity.ok(guardada);
    }

    private Long deudaId(Gestion gestion) {
        return gestion.getDeuda() != null ? gestion.getDeuda().getIdDeuda() : null;
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<?> manejarActualizacionSimultanea(OptimisticLockingFailureException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("Otro usuario actualizó esta gestión al mismo tiempo. Vuelve a cargarla e intenta de nuevo.");
    }

    @PutMapping("/{id}/monto-pagado")
    @Transactional
    public ResponseEntity<?> actualizarMontoPagado(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Gestion> gestionOpt = gestionRepository.findById(id);
        if (gestionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La gestión no existe");
        }
        Gestion gestion = gestionOpt.get();
        Object valor = body.get("montoPagado");
        BigDecimal montoPagado;
        try {
            montoPagado = valor == null ? BigDecimal.ZERO : new BigDecimal(valor.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El monto pagado no es válido");
        }
        if (montoPagado.signum() < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El monto pagado no puede ser negativo");
        }
        if (gestion.getMontoPromesa() != null && montoPagado.compareTo(gestion.getMontoPromesa()) > 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El monto pagado no puede superar el monto prometido");
        }
        gestion.setMontoPagado(montoPagado);
        Gestion actualizada = gestionRepository.save(gestion);
        return ResponseEntity.ok(actualizada);
    }

    @PutMapping("/{id}/estado-bonificacion")
    @Transactional
    public ResponseEntity<?> actualizarEstadoBonificacion(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Gestion> gestionOpt = gestionRepository.findById(id);
        if (gestionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La gestión no existe");
        }
        Object estado = body.get("estado");
        if (estado == null || estado.toString().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El estado es obligatorio");
        }
        String estadoStr = estado.toString().toUpperCase();
        if (!estadoStr.matches("PENDIENTE|APROBADA|APLICADA|RECHAZADA")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Estado no válido");
        }
        Gestion gestion = gestionOpt.get();
        gestion.setEstadoBonificacion(estadoStr);
        return ResponseEntity.ok(gestionRepository.save(gestion));
    }

    @PutMapping("/{id}/promesa")
    @Transactional
    public ResponseEntity<?> modificarPromesa(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Gestion> gestionOpt = gestionRepository.findById(id);
        if (gestionOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La gestión no existe");
        }
        Gestion gestion = gestionOpt.get();

        Object monto = body.get("montoPromesa");
        if (monto != null && !monto.toString().isBlank()) {
            try {
                gestion.setMontoPromesa(new BigDecimal(monto.toString()));
            } catch (NumberFormatException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El monto de la promesa no es válido");
            }
        }

        Object fecha = body.get("fechaPromesa");
        if (fecha != null && !fecha.toString().isBlank()) {
            try {
                gestion.setFechaPromesa(LocalDate.parse(fecha.toString()));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La fecha de la promesa no es válida");
            }
        }

        Object tipoId = body.get("tipoPromesaId");
        if (tipoId != null && !tipoId.toString().isBlank()) {
            Long tId = Long.parseLong(tipoId.toString());
            TipoPromesa tipoPromesa = tipoPromesaRepository.findById(tId).orElse(null);
            if (tipoPromesa == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El tipo de promesa no existe");
            }
            gestion.setTipoPromesa(tipoPromesa);
        }

        if (gestion.getFechaPromesa() != null && gestion.getDeuda() != null && gestion.getDeuda().getIdDeuda() != null) {
            Deuda deuda = deudaRepository.findById(gestion.getDeuda().getIdDeuda()).orElse(null);
            Integer diasMaximos = (deuda != null && deuda.getDeudor() != null && deuda.getDeudor().getCampana() != null)
                    ? deuda.getDeudor().getCampana().getDiasMaximosPromesa()
                    : null;
            if (diasMaximos != null && gestion.getFechaPromesa().isAfter(LocalDate.now().plusDays(diasMaximos))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("La fecha de promesa excede la ventana permitida de " + diasMaximos + " día(s) de la campaña.");
            }
        }

        return ResponseEntity.ok(gestionRepository.save(gestion));
    }
}