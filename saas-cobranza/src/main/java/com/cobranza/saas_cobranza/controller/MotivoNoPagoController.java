package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.MotivoNoPago;
import com.cobranza.saas_cobranza.repository.MotivoNoPagoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/motivos-no-pago")
@CrossOrigin(origins = "http://localhost:5173")
public class MotivoNoPagoController {

    @Autowired
    private MotivoNoPagoRepository repository;

    @GetMapping
    public List<MotivoNoPago> listarTodos(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return repository.findByCampana_Empresa_IdEmpresa(empresaId);
        }
        return repository.findAll();
    }

    @PostMapping
    public MotivoNoPago crear(@RequestBody MotivoNoPago motivoNoPago) {
        return repository.save(motivoNoPago);
    }
}