package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Pago;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.PagoRepository;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/pagos")
@CrossOrigin(origins = "http://localhost:5173")
public class PagoController {

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @GetMapping
    public ResponseEntity<?> listarPagos(@RequestHeader(value = "Authorization", required = false) String authorization,
                                         @RequestParam(required = false) Long empresaId) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        if (empresaId != null) {
            return ResponseEntity.ok(pagoRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(pagoRepository.findAll());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> registrarPago(@RequestHeader(value = "Authorization", required = false) String authorization,
                                           @RequestBody Pago pago) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }

        if (pago.getDeuda() == null || pago.getDeuda().getIdDeuda() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La deuda del pago es obligatoria");
        }

        Deuda deudaOriginal = deudaRepository.findById(pago.getDeuda().getIdDeuda()).orElse(null);
        if (deudaOriginal == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Deuda no encontrada");
        }
        if (deudaOriginal.getSaldoPendiente() == null || pago.getMonto() == null
                || pago.getMonto().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El monto del pago debe ser mayor a cero");
        }
        if (pago.getMonto().compareTo(deudaOriginal.getSaldoPendiente()) > 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El pago excede el saldo pendiente de la deuda");
        }

        deudaOriginal.setSaldoPendiente(deudaOriginal.getSaldoPendiente().subtract(pago.getMonto()));
        deudaRepository.save(deudaOriginal);

        return ResponseEntity.ok(pagoRepository.save(pago));
    }
}
