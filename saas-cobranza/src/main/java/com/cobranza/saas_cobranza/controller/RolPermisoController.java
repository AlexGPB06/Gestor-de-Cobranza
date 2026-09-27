package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.RolPermiso;
import com.cobranza.saas_cobranza.repository.RolPermisoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rol-permisos")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class RolPermisoController {

    @Autowired
    private RolPermisoRepository repository;

    @GetMapping
    public List<RolPermiso> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public RolPermiso crear(@RequestBody RolPermiso rolPermiso) {
        return repository.save(rolPermiso);
    }
}