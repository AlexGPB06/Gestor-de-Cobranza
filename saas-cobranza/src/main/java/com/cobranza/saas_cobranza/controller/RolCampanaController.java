package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.RolCampana;
import com.cobranza.saas_cobranza.repository.RolCampanaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles-campana")
public class RolCampanaController {

    @Autowired
    private RolCampanaRepository rolCampanaRepository;

    @GetMapping
    public List<RolCampana> obtenerTodos() {
        return rolCampanaRepository.findAll();
    }

    @PostMapping
    public RolCampana crearRolCampana(@RequestBody RolCampana rolCampana) {
        return rolCampanaRepository.save(rolCampana);
    }
}