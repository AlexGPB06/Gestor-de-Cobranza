package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.EmpleadoRol;
import com.cobranza.saas_cobranza.repository.EmpleadoRolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/empleado-roles")
@CrossOrigin(origins = "http://localhost:5173")
public class EmpleadoRolController {

    @Autowired
    private EmpleadoRolRepository repository;

    @GetMapping
    public List<EmpleadoRol> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public EmpleadoRol crear(@RequestBody EmpleadoRol empleadoRol) {
        return repository.save(empleadoRol);
    }
}