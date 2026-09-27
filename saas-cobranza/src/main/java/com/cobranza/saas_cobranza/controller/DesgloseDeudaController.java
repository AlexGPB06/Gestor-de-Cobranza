package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.DesgloseDeuda;
import com.cobranza.saas_cobranza.repository.DesgloseDeudaRepository;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/desgloses-deuda")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class DesgloseDeudaController {

    @Autowired
    private DesgloseDeudaRepository repository;

    @GetMapping
    public ResponseEntity<?> listarTodos(@RequestHeader(value = "Authorization", required = false) String authorization) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestBody DesgloseDeuda desglose) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        return ResponseEntity.ok(repository.save(desglose));
    }
}
