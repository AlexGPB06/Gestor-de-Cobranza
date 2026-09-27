package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.RubroCobro;
import com.cobranza.saas_cobranza.repository.RubroCobroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rubros-cobro")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class RubroCobroController {

    @Autowired
    private RubroCobroRepository repository;

    @GetMapping
    public List<RubroCobro> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public RubroCobro crear(@RequestBody RubroCobro rubroCobro) {
        return repository.save(rubroCobro);
    }
}