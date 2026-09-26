package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deudas")
public class DeudaController {

    @Autowired
    private DeudaRepository deudaRepository;

    /**
     * Lectura: la necesitan el gestor (su cartera), el administrador y el
     * supervisor porque "Asignar Cartera" muestra las deudas por asignar.
     * Alta de deuda: solo el gestor.
     */
    @GetMapping
    public ResponseEntity<?> obtenerTodas(@RequestHeader(value = "Authorization", required = false) String authorization,
                                          @RequestParam(required = false) Long empresaId) {
        JwtUtil.Sesion sesion = Seguridad.sesion(authorization);
        if (sesion == null) {
            return Seguridad.sinToken();
        }
        if (!Seguridad.esGestor(sesion) && !Seguridad.esAdmin(sesion) && !Seguridad.esSupervisor(sesion)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body("Acceso exclusivo del gestor, el administrador o el supervisor.");
        }
        if (empresaId != null) {
            return ResponseEntity.ok(deudaRepository.findByDeudor_Campana_Empresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(deudaRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> crearDeuda(@RequestHeader(value = "Authorization", required = false) String authorization,
                                        @RequestBody Deuda deuda) {
        ResponseEntity<?> bloqueado = Seguridad.soloGestor(authorization);
        if (bloqueado != null) {
            return bloqueado;
        }
        return ResponseEntity.ok(deudaRepository.save(deuda));
    }
}
