package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deudor;
import com.cobranza.saas_cobranza.repository.DeudorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deudores")
public class DeudorController {

    @Autowired
    private DeudorRepository deudorRepository;

    @GetMapping
    public List<Deudor> obtenerTodos() {
        return deudorRepository.findAll();
    }

    @PostMapping
    public Deudor crearDeudor(@RequestBody Deudor deudor) {
        return deudorRepository.save(deudor);
    }
}