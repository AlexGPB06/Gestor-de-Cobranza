package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Telefono;
import com.cobranza.saas_cobranza.repository.TelefonoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/telefonos")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class TelefonoController {

    @Autowired
    private TelefonoRepository repository;

    @GetMapping
    public List<Telefono> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public Telefono crear(@RequestBody Telefono telefono) {
        return repository.save(telefono);
    }
}