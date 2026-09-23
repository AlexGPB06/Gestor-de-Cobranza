package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Gestion;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gestiones")
public class GestionController {

    @Autowired
    private GestionRepository gestionRepository;

    @GetMapping
    public List<Gestion> obtenerTodas(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return gestionRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(empresaId);
        }
        return gestionRepository.findAll();
    }

    @PostMapping
    public Gestion crearGestion(@RequestBody Gestion gestion) {
        return gestionRepository.save(gestion);
    }
}