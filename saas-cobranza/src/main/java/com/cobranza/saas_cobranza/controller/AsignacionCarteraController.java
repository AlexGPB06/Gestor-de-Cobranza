package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.AsignacionCartera;
import com.cobranza.saas_cobranza.repository.AsignacionCarteraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/asignaciones-cartera")
@CrossOrigin(origins = "http://localhost:5173")
public class AsignacionCarteraController {

    @Autowired
    private AsignacionCarteraRepository repository;

    @GetMapping
    public List<AsignacionCartera> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public AsignacionCartera crear(@RequestBody AsignacionCartera asignacion) {
        return repository.save(asignacion);
    }
}