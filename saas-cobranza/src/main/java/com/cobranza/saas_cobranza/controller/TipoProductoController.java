package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.TipoProducto;
import com.cobranza.saas_cobranza.repository.TipoProductoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tipos-producto")
@CrossOrigin(origins = "http://localhost:5173")
public class TipoProductoController {

    @Autowired
    private TipoProductoRepository repository;

    @GetMapping
    public List<TipoProducto> listarTodos(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return repository.findByCampana_Empresa_IdEmpresa(empresaId);
        }
        return repository.findAll();
    }

    @PostMapping
    public TipoProducto crear(@RequestBody TipoProducto tipoProducto) {
        return repository.save(tipoProducto);
    }
}