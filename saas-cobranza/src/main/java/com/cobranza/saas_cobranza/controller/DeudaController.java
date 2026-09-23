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
    public List<Deuda> obtenerTodas(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return deudaRepository.findByDeudor_Campana_Empresa_IdEmpresa(empresaId);
        }
        return deudaRepository.findAll();
    }

    @PostMapping
    public Deuda crearDeuda(@RequestBody Deuda deuda) {
        return deudaRepository.save(deuda);
    }
}