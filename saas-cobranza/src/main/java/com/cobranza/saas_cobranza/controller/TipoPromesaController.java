package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.TipoPromesa;
import com.cobranza.saas_cobranza.Campana;
import com.cobranza.saas_cobranza.repository.TipoPromesaRepository;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tipos-promesa")
@CrossOrigin(origins = "http://localhost:5173")
public class TipoPromesaController {

    @Autowired
    private TipoPromesaRepository tipoPromesaRepository;

    @Autowired
    private CampanaRepository campanaRepository;

    @GetMapping
    public ResponseEntity<List<TipoPromesa>> listar(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return ResponseEntity.ok(tipoPromesaRepository.findByCampana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(tipoPromesaRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> datos) {
        String nombre = datos.get("nombre") == null ? null : datos.get("nombre").toString();
        Long idCampana = datos.get("idCampana") == null ? null : Long.parseLong(datos.get("idCampana").toString());

        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El nombre es obligatorio");
        }
        Optional<Campana> campanaOpt = idCampana == null ? Optional.empty() : campanaRepository.findById(idCampana);
        if (campanaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La campaña indicada no existe");
        }

        TipoPromesa tipo = new TipoPromesa();
        tipo.setNombre(nombre.trim());
        tipo.setCampana(campanaOpt.get());
        tipo.setActivo(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(tipoPromesaRepository.save(tipo));
    }
}