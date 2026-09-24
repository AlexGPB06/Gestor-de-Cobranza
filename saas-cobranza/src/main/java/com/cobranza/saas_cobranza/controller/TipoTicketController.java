package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.TipoTicket;
import com.cobranza.saas_cobranza.Departamento;
import com.cobranza.saas_cobranza.repository.TipoTicketRepository;
import com.cobranza.saas_cobranza.repository.DepartamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tipos-ticket")
@CrossOrigin(origins = "http://localhost:5173")
public class TipoTicketController {

    @Autowired
    private TipoTicketRepository tipoTicketRepository;

    @Autowired
    private DepartamentoRepository departamentoRepository;

    @GetMapping
    public ResponseEntity<List<TipoTicket>> listar(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return ResponseEntity.ok(tipoTicketRepository.findByDepartamento_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(tipoTicketRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> datos) {
        String numero = datos.get("numero") == null ? null : datos.get("numero").toString();
        String nombre = datos.get("nombre") == null ? null : datos.get("nombre").toString();
        String plantilla = datos.get("plantilla") == null ? null : datos.get("plantilla").toString();
        Long idDepartamento = datos.get("idDepartamento") == null ? null : Long.parseLong(datos.get("idDepartamento").toString());

        if (numero == null || numero.isBlank() || nombre == null || nombre.isBlank() || idDepartamento == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Número, nombre y departamento son obligatorios");
        }
        Optional<Departamento> deptoOpt = departamentoRepository.findById(idDepartamento);
        if (deptoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El departamento indicado no existe");
        }

        TipoTicket tipo = new TipoTicket();
        tipo.setDepartamento(deptoOpt.get());
        tipo.setNumero(numero.trim().toUpperCase());
        tipo.setNombre(nombre.trim());
        tipo.setPlantilla(plantilla);
        tipo.setActivo(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(tipoTicketRepository.save(tipo));
    }
}