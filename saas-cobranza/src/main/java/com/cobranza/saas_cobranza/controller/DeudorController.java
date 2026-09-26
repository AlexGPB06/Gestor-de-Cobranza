package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deudor;
import com.cobranza.saas_cobranza.repository.DeudorRepository;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deudores")
public class DeudorController {

    @Autowired
    private DeudorRepository deudorRepository;

    @GetMapping
    public ResponseEntity<?> obtenerTodos(@RequestHeader(value = "Authorization", required = false) String authorization,
                                          @RequestParam(required = false) Long empresaId) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        if (empresaId != null) {
            return ResponseEntity.ok(deudorRepository.findByCampana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(deudorRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> crearDeudor(@RequestHeader(value = "Authorization", required = false) String authorization,
                                         @RequestBody Deudor deudor) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        return ResponseEntity.ok(deudorRepository.save(deudor));
    }
}
