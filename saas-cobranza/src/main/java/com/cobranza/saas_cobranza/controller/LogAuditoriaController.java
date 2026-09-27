package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.LogAuditoria;
import com.cobranza.saas_cobranza.repository.LogAuditoriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/logs-auditoria")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class LogAuditoriaController {

    @Autowired
    private LogAuditoriaRepository repository;

    @GetMapping
    public List<LogAuditoria> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public LogAuditoria crear(@RequestBody LogAuditoria logAuditoria) {
        return repository.save(logAuditoria);
    }
}