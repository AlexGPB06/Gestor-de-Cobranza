package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deudor;
import com.cobranza.saas_cobranza.repository.DeudorRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeudorControllerTest {

    @Mock
    private DeudorRepository deudorRepository;

    @InjectMocks
    private DeudorController controller;

    private static String gestor() {
        return "Bearer " + JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");
    }

    private static String admin() {
        return "Bearer " + JwtUtil.generarToken("1", "ADMINISTRADOR", "admin", "S0ADM");
    }

    // -------------------------------------------------------------------- GET

    @Test
    void obtenerTodos_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.obtenerTodos(null, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, controller.obtenerTodos("", null).getStatusCode());
    }

    @Test
    void obtenerTodos_ElAdministradorNoEntra() {
        ResponseEntity<?> respuesta = controller.obtenerTodos(admin(), null);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals(Seguridad.MENSAJE_NO_GESTOR, respuesta.getBody());
    }

    @Test
    void obtenerTodos_FiltraPorEmpresa() {
        when(deudorRepository.findByCampana_Empresa_IdEmpresa(3L)).thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.obtenerTodos(gestor(), 3L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(deudorRepository).findByCampana_Empresa_IdEmpresa(3L);
        verify(deudorRepository, never()).findAll();
    }

    @Test
    void obtenerTodos_SinFiltroDevuelveTodos() {
        when(deudorRepository.findAll()).thenReturn(List.of(new Deudor()));

        ResponseEntity<?> respuesta = controller.obtenerTodos(gestor(), null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(deudorRepository).findAll();
    }

    // ------------------------------------------------------------------- POST

    @Test
    void crearDeudor_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.crearDeudor(null, new Deudor()).getStatusCode());
    }

    @Test
    void crearDeudor_ElAdministradorNoRegistraDeudores() {
        assertEquals(HttpStatus.FORBIDDEN, controller.crearDeudor(admin(), new Deudor()).getStatusCode());
        verify(deudorRepository, never()).save(any());
    }

    @Test
    void crearDeudor_ElGestorGuardaElDeudor() {
        Deudor deudor = new Deudor();
        when(deudorRepository.save(deudor)).thenReturn(deudor);

        ResponseEntity<?> respuesta = controller.crearDeudor(gestor(), deudor);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(deudor, respuesta.getBody());
        verify(deudorRepository).save(deudor);
    }
}
