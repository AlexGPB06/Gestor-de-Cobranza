package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Concepto;
import com.cobranza.saas_cobranza.repository.ConceptoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/conceptos")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class ConceptoController {

    @Autowired
    private ConceptoRepository repository;

    @GetMapping
    public List<Concepto> listarTodos(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return repository.findByCampana_Empresa_IdEmpresaAndActivoTrue(empresaId);
        }
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Concepto concepto) {
        if (concepto.getNombreConcepto() == null || concepto.getNombreConcepto().isBlank()) {
            return ResponseEntity.badRequest().body("El nombre del concepto es obligatorio");
        }
        if (concepto.getCategoria() == null || concepto.getCategoria().isBlank()) {
            return ResponseEntity.badRequest().body("La categoría del concepto es obligatoria");
        }
        return ResponseEntity.ok(repository.save(concepto));
    }
}