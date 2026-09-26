package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Bonificacion;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.BonificacionRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BonificacionControllerTest {

    @Mock
    private BonificacionRepository bonificacionRepository;

    @Mock
    private DeudaRepository deudaRepository;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @InjectMocks
    private BonificacionController controller;

    private static Deuda deuda() {
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(1L);
        return deuda;
    }

    private static Empleado empleado() {
        Empleado empleado = new Empleado();
        empleado.setIdEmpleado(2L);
        return empleado;
    }

    private static Map<String, Object> cuerpo(Object tipo, Object idDeuda, Object idEmpleado) {
        Map<String, Object> body = new HashMap<>();
        body.put("tipo", tipo);
        body.put("idDeuda", idDeuda);
        body.put("idEmpleado", idEmpleado);
        return body;
    }

    private static Map<String, Object> cuerpoMinimo() {
        return cuerpo("DESCUENTO", 1L, 2L);
    }

    // -------------------------------------------------------------------- GET

    @Test
    void listar_FiltraPorDeuda() {
        when(bonificacionRepository.findByDeuda_IdDeuda(1L)).thenReturn(List.of());

        assertEquals(HttpStatus.OK, controller.listar(null, 1L).getStatusCode());
        verify(bonificacionRepository).findByDeuda_IdDeuda(1L);
        verify(bonificacionRepository, never()).findAll();
    }

    @Test
    void listar_FiltraPorEmpresa() {
        when(bonificacionRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L))
                .thenReturn(List.of());

        assertEquals(HttpStatus.OK, controller.listar(3L, null).getStatusCode());
        verify(bonificacionRepository).findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L);
    }

    @Test
    void listar_SinFiltroDevuelveTodas() {
        when(bonificacionRepository.findAll()).thenReturn(List.of(new Bonificacion()));

        assertEquals(HttpStatus.OK, controller.listar(null, null).getStatusCode());
        verify(bonificacionRepository).findAll();
    }

    // ------------------------------------------------------------------- POST

    @Test
    void registrar_SinCamposObligatoriosRespondeBadRequest() {
        Map<String, Object> sinTipo = cuerpo(null, 1L, 2L);
        Map<String, Object> tipoEnBlanco = cuerpo("  ", 1L, 2L);
        Map<String, Object> sinDeuda = cuerpo("DESCUENTO", null, 2L);
        Map<String, Object> sinEmpleado = cuerpo("DESCUENTO", 1L, null);

        for (Map<String, Object> body : List.of(sinTipo, tipoEnBlanco, sinDeuda, sinEmpleado)) {
            ResponseEntity<?> respuesta = controller.registrar(body);
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("Tipo, deuda y empleado son obligatorios", respuesta.getBody());
        }
        verify(bonificacionRepository, never()).save(any());
    }

    @Test
    void registrar_DeudaOEmpleadoInexistenteRespondeBadRequest() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.empty());
        when(empleadoRepository.findById(2L)).thenReturn(Optional.of(empleado()));

        ResponseEntity<?> sinDeuda = controller.registrar(cuerpoMinimo());
        assertEquals(HttpStatus.BAD_REQUEST, sinDeuda.getStatusCode());
        assertEquals("La deuda o el empleado indicados no existen", sinDeuda.getBody());

        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda()));
        when(empleadoRepository.findById(2L)).thenReturn(Optional.empty());

        ResponseEntity<?> sinEmpleado = controller.registrar(cuerpoMinimo());
        assertEquals(HttpStatus.BAD_REQUEST, sinEmpleado.getStatusCode());
    }

    @Test
    void registrar_CreaLaBonificacionActivaYNormalizada() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda()));
        when(empleadoRepository.findById(2L)).thenReturn(Optional.of(empleado()));
        when(bonificacionRepository.save(any(Bonificacion.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpoMinimo();
        body.put("descripcion", "  Descuento comercial  ");
        ResponseEntity<?> respuesta = controller.registrar(body);

        assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
        Bonificacion bonificacion = (Bonificacion) respuesta.getBody();
        assertEquals("DESCUENTO", bonificacion.getTipo());
        assertEquals("Descuento comercial", bonificacion.getDescripcion());
        assertEquals(Boolean.TRUE, bonificacion.getActivo());
        assertNull(bonificacion.getMontoBonificado());
        assertNull(bonificacion.getFecha());
    }

    @Test
    void registrar_LaDescripcionEnBlancoQuedaNula() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda()));
        when(empleadoRepository.findById(2L)).thenReturn(Optional.of(empleado()));
        when(bonificacionRepository.save(any(Bonificacion.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpoMinimo();
        body.put("descripcion", "   ");

        assertNull(((Bonificacion) controller.registrar(body).getBody()).getDescripcion());
    }

    @Test
    void registrar_AceptaMontoYFecha() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda()));
        when(empleadoRepository.findById(2L)).thenReturn(Optional.of(empleado()));
        when(bonificacionRepository.save(any(Bonificacion.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpoMinimo();
        body.put("montoBonificado", "150.75");
        body.put("fecha", "2026-03-15");

        Bonificacion bonificacion = (Bonificacion) controller.registrar(body).getBody();

        assertEquals(0, new BigDecimal("150.75").compareTo(bonificacion.getMontoBonificado()));
        assertEquals("2026-03-15", bonificacion.getFecha().toString());
    }

    @Test
    void registrar_ElMontoNoNumericoSeIgnoraEnLieuDeRomper() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda()));
        when(empleadoRepository.findById(2L)).thenReturn(Optional.of(empleado()));
        when(bonificacionRepository.save(any(Bonificacion.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpoMinimo();
        body.put("montoBonificado", "no-es-un-numero");
        body.put("fecha", "2026-01-02");

        Bonificacion bonificacion = (Bonificacion) controller.registrar(body).getBody();

        assertNull(bonificacion.getMontoBonificado());
        assertEquals("2026-01-02", bonificacion.getFecha().toString());
    }

    @Test
    void registrar_ElMontoEnBlancoSeIgnora() {
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda()));
        when(empleadoRepository.findById(2L)).thenReturn(Optional.of(empleado()));
        when(bonificacionRepository.save(any(Bonificacion.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpoMinimo();
        body.put("montoBonificado", "   ");
        body.put("fecha", "   ");

        Bonificacion bonificacion = (Bonificacion) controller.registrar(body).getBody();

        assertNull(bonificacion.getMontoBonificado());
        assertNull(bonificacion.getFecha());
    }
}
