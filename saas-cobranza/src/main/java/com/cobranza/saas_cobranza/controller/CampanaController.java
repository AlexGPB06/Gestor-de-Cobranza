package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Campana;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campanas")
public class CampanaController {

    @Autowired
    private CampanaRepository campanaRepository;

    @GetMapping
    public List<Campana> obtenerTodas(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return campanaRepository.findByEmpresa_IdEmpresa(empresaId);
        }
        return campanaRepository.findAll();
    }

    @PostMapping
    public Campana crearCampana(@RequestBody Campana campana) {
        return campanaRepository.save(campana);
    }
}