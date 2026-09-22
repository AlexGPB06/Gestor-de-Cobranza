package com.cobranza.saas_cobranza.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

// --- ESTAS SON LAS IMPORTACIONES QUE FALTABAN ---
import com.cobranza.saas_cobranza.Pago;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.repository.PagoRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;

@RestController
@RequestMapping("/api/pagos")
@CrossOrigin(origins = "http://localhost:5173")
public class PagoController {

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @GetMapping
    public List<Pago> listarPagos() {
        return pagoRepository.findAll();
    }

    @PostMapping
    public Pago registrarPago(@RequestBody Pago pago) {
        // 1. Buscamos la deuda a la que se le está abonando
        Deuda deudaOriginal = deudaRepository.findById(pago.getDeuda().getIdDeuda())
                .orElseThrow(() -> new RuntimeException("Deuda no encontrada"));
        
        // 2. Lógica de negocio: Restamos el monto del pago al saldo pendiente
        deudaOriginal.setSaldoPendiente(deudaOriginal.getSaldoPendiente().subtract(pago.getMonto()));
        
        // 3. Guardamos el nuevo saldo en la base de datos
        deudaRepository.save(deudaOriginal);

        // 4. Guardamos el registro histórico del pago
        return pagoRepository.save(pago);
    }
}      