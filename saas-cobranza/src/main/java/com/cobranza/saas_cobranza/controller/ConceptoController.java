package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Concepto;
import com.cobranza.saas_cobranza.repository.ConceptoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/conceptos")
@CrossOrigin(origins = "http://localhost:5173")
public class ConceptoController {

    @Autowired
    private ConceptoRepository repository;

    @GetMapping
    public List<Concepto> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public Concepto crear(@RequestBody Concepto concepto) {
        return repository.save(concepto);
    }
}