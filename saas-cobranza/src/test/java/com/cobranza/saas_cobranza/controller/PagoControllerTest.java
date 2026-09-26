package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Pago;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.PagoRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PagoControllerTest {

    @Mock
    private PagoRepository pagoRepository;

    @Mock
    private DeudaRepository deudaRepository;

    @InjectMocks
    private PagoController controller;

    private static final BigDecimal SALDO = new BigDecimal("1000.00");

    private static String gestor() {
        return "Bearer " + JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");
    }

    private static String admin() {
        return "Bearer " + JwtUtil.generarToken("1", "ADMINISTRADOR", "admin", "S0ADM");
    }

    private static Deuda deudaConSaldo(BigDecimal saldo) {
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(1L);
        deuda.setSaldoPendiente(saldo);
        return deuda;
    }

    private static Pago pagoDe(BigDecimal monto) {
        Pago pago = new Pago();
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(1L);
        pago.setDeuda(deuda);
        pago.setMonto(monto);
        return pago;
    }

    // -------------------------------------------------------------------- GET

    @Test
    void listarPagos_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.listarPagos(null, null).getStatusCode());
    }

    @Test
    void listarPagos_ElAdministradorNoConsultaPagos() {
        assertEquals(HttpStatus.FORBIDDEN, controller.listarPagos(admin(), null).getStatusCode());
    }

    @Test
    void listarPagos_FiltraPorEmpresa() {
        when(pagoRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L)).thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.listarPagos(gestor(), 3L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(pagoRepository).findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L);
        verify(pagoRepository, never()).findAll();
    }

    @Test
    void listarPagos_SinFiltroDevuelveTodos() {
        when(pagoRepository.findAll()).thenReturn(List.of(new Pago()));

        ResponseEntity<?> respuesta = controller.listarPagos(gestor(), null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(pagoRepository).findAll();
    }

    // ------------------------------------------------- guardia de saldo de deuda

    @Test
    void registrarPago_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.registrarPago(null, pagoDe(BigDecimal.ONE))
                .getStatusCode());
    }

    @Test
    void registrarPago_SoloElGestorRegistra() {
        assertEquals(HttpStatus.FORBIDDEN, controller.registrarPago(admin(), pagoDe(BigDecimal.ONE))
                .getStatusCode());
        verify(pagoRepository, never()).save(any());
    }

    @Test
    void registrarPago_SinDeudaRespondeBadRequest() {
        Pago sinDeuda = new Pago();
        sinDeuda.setMonto(BigDecimal.TEN);

        ResponseEntity<?> sinRelacion = controller.registrarPago(gestor(), sinDeuda);
        Pago sinIdDeDeuda = new Pago();
        sinIdDeDeuda.setDeuda(new Deuda());
        sinIdDeDeuda.setMonto(BigDecimal.TEN);
        ResponseEntity<?> sinId = controller.registrarPago(gestor(), sinIdDeDeuda);

        for (ResponseEntity<?> respuesta : List.of(sinRelacion, sinId)) {
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("La deuda del pago es obligatoria", respuesta.getBody());
        }
        verify(pagoRepository, never()).save(any());
    }

    @Test
    void registrarPago_DeudaInexistenteRespondeBadRequest() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = controller.registrarPago(gestor(), pagoDe(BigDecimal.TEN));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("Deuda no encontrada", respuesta.getBody());
        verify(pagoRepository, never()).save(any());
    }

    @Test
    void registrarPago_ElMontoDebeSerMayorACero() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deudaConSaldo(SALDO)));

        ResponseEntity<?> cero = controller.registrarPago(gestor(), pagoDe(BigDecimal.ZERO));
        ResponseEntity<?> negativo = controller.registrarPago(gestor(), pagoDe(new BigDecimal("-5")));
        ResponseEntity<?> sinMonto = controller.registrarPago(gestor(), pagoDe(null));

        for (ResponseEntity<?> respuesta : List.of(cero, negativo, sinMonto)) {
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("El monto del pago debe ser mayor a cero", respuesta.getBody());
        }
    }

    @Test
    void registrarPago_LaDeudaSinSaldoPendienteSeRechaza() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deudaConSaldo(null)));

        ResponseEntity<?> respuesta = controller.registrarPago(gestor(), pagoDe(BigDecimal.ONE));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("El monto del pago debe ser mayor a cero", respuesta.getBody());
    }

    @Test
    void registrarPago_NoSePuedePagarMasQueElSaldoPendiente() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deudaConSaldo(SALDO)));

        ResponseEntity<?> respuesta = controller.registrarPago(gestor(),
                pagoDe(new BigDecimal("1000.01")));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("El pago excede el saldo pendiente de la deuda", respuesta.getBody());
        verify(deudaRepository, never()).save(any());
        verify(pagoRepository, never()).save(any());
    }

    @Test
    void registrarPago_DescuentaElSaldoYGuardaElPago() {
        Deuda deuda = deudaConSaldo(SALDO);
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda));
        Pago pago = pagoDe(new BigDecimal("250.50"));
        when(pagoRepository.save(pago)).thenReturn(pago);

        ResponseEntity<?> respuesta = controller.registrarPago(gestor(), pago);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(pago, respuesta.getBody());
        assertEquals(new BigDecimal("749.50"), deuda.getSaldoPendiente());
        verify(deudaRepository).save(deuda);
        verify(pagoRepository).save(pago);
    }

    @Test
    void registrarPago_PagarElSaldoCompletoLoDejaEnCero() {
        Deuda deuda = deudaConSaldo(SALDO);
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda));
        Pago pago = pagoDe(SALDO);
        when(pagoRepository.save(pago)).thenReturn(pago);

        assertEquals(HttpStatus.OK, controller.registrarPago(gestor(), pago).getStatusCode());
        assertEquals(0, deuda.getSaldoPendiente().compareTo(BigDecimal.ZERO));
    }
}
