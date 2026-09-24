package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Bonificacion;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.BonificacionRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/bonificaciones")
@CrossOrigin(origins = "http://localhost:5173")
public class BonificacionController {

    @Autowired
    private BonificacionRepository bonificacionRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @GetMapping
    public ResponseEntity<List<Bonificacion>> listar(@RequestParam(required = false) Long empresaId,
                                                     @RequestParam(required = false) Long deudaId) {
        if (deudaId != null) {
            return ResponseEntity.ok(bonificacionRepository.findByDeuda_IdDeuda(deudaId));
        }
        if (empresaId != null) {
            return ResponseEntity.ok(bonificacionRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(bonificacionRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> datos) {
        String tipo = datos.get("tipo") == null ? null : datos.get("tipo").toString();
        String descripcion = datos.get("descripcion") == null ? null : datos.get("descripcion").toString();
        Long idDeuda = datos.get("idDeuda") == null ? null : Long.parseLong(datos.get("idDeuda").toString());
        Long idEmpleado = datos.get("idEmpleado") == null ? null : Long.parseLong(datos.get("idEmpleado").toString());

        if (tipo == null || tipo.isBlank() || idDeuda == null || idEmpleado == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Tipo, deuda y empleado son obligatorios");
        }
        Optional<Deuda> deudaOpt = deudaRepository.findById(idDeuda);
        Optional<Empleado> empleadoOpt = empleadoRepository.findById(idEmpleado);
        if (deudaOpt.isEmpty() || empleadoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La deuda o el empleado indicados no existen");
        }

        Bonificacion bonificacion = new Bonificacion();
        bonificacion.setDeuda(deudaOpt.get());
        bonificacion.setEmpleado(empleadoOpt.get());
        bonificacion.setTipo(tipo.trim());
        bonificacion.setDescripcion(descripcion == null || descripcion.isBlank() ? null : descripcion.trim());
        bonificacion.setActivo(true);

        Object monto = datos.get("montoBonificado");
        if (monto != null && !monto.toString().isBlank()) {
            try {
                bonificacion.setMontoBonificado(new BigDecimal(monto.toString()));
            } catch (NumberFormatException ignored) {
            }
        }
        Object fecha = datos.get("fecha");
        if (fecha != null && !fecha.toString().isBlank()) {
            bonificacion.setFecha(LocalDate.parse(fecha.toString()));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(bonificacionRepository.save(bonificacion));
    }
}