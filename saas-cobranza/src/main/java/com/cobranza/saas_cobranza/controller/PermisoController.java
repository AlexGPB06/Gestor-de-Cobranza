package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Permiso;
import com.cobranza.saas_cobranza.repository.PermisoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/permisos")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class PermisoController {

    @Autowired
    private PermisoRepository repository;

    @GetMapping
    public List<Permiso> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public Permiso crear(@RequestBody Permiso permiso) {
        return repository.save(permiso);
    }
}