package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.DesgloseDeuda;
import com.cobranza.saas_cobranza.repository.DesgloseDeudaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/desgloses-deuda")
@CrossOrigin(origins = "http://localhost:5173")
public class DesgloseDeudaController {

    @Autowired
    private DesgloseDeudaRepository repository;

    @GetMapping
    public List<DesgloseDeuda> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public DesgloseDeuda crear(@RequestBody DesgloseDeuda desglose) {
        return repository.save(desglose);
    }
}