package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Departamento;
import com.cobranza.saas_cobranza.Empresa;
import com.cobranza.saas_cobranza.repository.DepartamentoRepository;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/departamentos")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class DepartamentoController {

    @Autowired
    private DepartamentoRepository departamentoRepository;

    @Autowired
    private EmpresaRepository empresaRepository;

    @GetMapping
    public ResponseEntity<List<Departamento>> listar(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return ResponseEntity.ok(departamentoRepository.findByEmpresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(departamentoRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Map<String, Object> datos) {
        String nombre = datos.get("nombre") == null ? null : datos.get("nombre").toString();
        String prefijo = datos.get("prefijo") == null ? null : datos.get("prefijo").toString();
        Long idEmpresa = datos.get("idEmpresa") == null ? null : Long.parseLong(datos.get("idEmpresa").toString());

        if (nombre == null || nombre.isBlank() || prefijo == null || prefijo.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Nombre y prefijo son obligatorios");
        }
        Optional<Empresa> empresaOpt = idEmpresa == null ? Optional.empty() : empresaRepository.findById(idEmpresa);
        if (empresaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La empresa indicada no existe");
        }

        Departamento depto = new Departamento();
        depto.setNombre(nombre.trim());
        depto.setPrefijo(prefijo.trim().toUpperCase());
        depto.setEmpresa(empresaOpt.get());
        depto.setActivo(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(departamentoRepository.save(depto));
    }
}