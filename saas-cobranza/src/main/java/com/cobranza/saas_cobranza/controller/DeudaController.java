package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deudas")
public class DeudaController {

    @Autowired
    private DeudaRepository deudaRepository;

    @GetMapping
    public List<Deuda> obtenerTodas() {
        return deudaRepository.findAll();
    }

    @PostMapping
    public Deuda crearDeuda(@RequestBody Deuda deuda) {
        return deudaRepository.save(deuda);
    }
}