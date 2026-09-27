package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Ticket;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Departamento;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.TicketRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.DepartamentoRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class TicketController {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @Autowired
    private DepartamentoRepository departamentoRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @GetMapping
    public ResponseEntity<?> listar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestParam(required = false) Long empresaId,
                                   @RequestParam(required = false) Long deudaId) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        if (deudaId != null) {
            return ResponseEntity.ok(ticketRepository.findByDeuda_IdDeuda(deudaId));
        }
        if (empresaId != null) {
            return ResponseEntity.ok(ticketRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(ticketRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                       @RequestBody Map<String, Object> datos) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        String numero = datos.get("numero") == null ? null : datos.get("numero").toString();
        String asunto = datos.get("asunto") == null ? null : datos.get("asunto").toString();
        String descripcion = datos.get("descripcion") == null ? null : datos.get("descripcion").toString();
        Long idDeuda = datos.get("idDeuda") == null ? null : Long.parseLong(datos.get("idDeuda").toString());
        Long idDepartamento = datos.get("idDepartamento") == null ? null : Long.parseLong(datos.get("idDepartamento").toString());
        Long idEmpleadoOrigen = datos.get("idEmpleadoOrigen") == null ? null : Long.parseLong(datos.get("idEmpleadoOrigen").toString());

        if (numero == null || numero.isBlank() || descripcion == null || descripcion.isBlank() || idDepartamento == null || idEmpleadoOrigen == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Número, descripción, departamento y empleado son obligatorios");
        }

String numeroNormalizado = numero.trim().toUpperCase();

        Optional<Departamento> deptoOpt = departamentoRepository.findById(idDepartamento);
        Optional<Empleado> origenOpt = empleadoRepository.findById(idEmpleadoOrigen);
        if (deptoOpt.isEmpty() || origenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El departamento o el empleado indicados no existen");
        }

        Ticket ticket = new Ticket();
        ticket.setNumero(numeroNormalizado);
        ticket.setAsunto(asunto == null || asunto.isBlank() ? null : asunto.trim());
        ticket.setDescripcion(descripcion.trim());
        ticket.setDepartamento(deptoOpt.get());
        ticket.setEmpleadoOrigen(origenOpt.get());
        ticket.setEstado("ABIERTO");

        if (idDeuda != null) {
            Optional<Deuda> deudaOpt = deudaRepository.findById(idDeuda);
            if (deudaOpt.isPresent()) {
                ticket.setDeuda(deudaOpt.get());
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(ticketRepository.save(ticket));
    }
}