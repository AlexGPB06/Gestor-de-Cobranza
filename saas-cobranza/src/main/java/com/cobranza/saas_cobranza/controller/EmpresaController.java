package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Empresa;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/empresas")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class EmpresaController {

    @Autowired
    private EmpresaRepository empresaRepository;

    @GetMapping
    public List<Empresa> listar() {
        return empresaRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, String> datos) {
        String nombre = datos.get("nombre");
        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El nombre de la empresa es obligatorio");
        }
        if (empresaRepository.existsByNombre(nombre.trim())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("La empresa ya existe");
        }

        Empresa empresa = new Empresa();
        empresa.setNombre(nombre.trim());
        empresa.setRfc(datos.get("rfc"));
        empresa.setActivo(true);

        return ResponseEntity.status(HttpStatus.CREATED).body(empresaRepository.save(empresa));
    }
}