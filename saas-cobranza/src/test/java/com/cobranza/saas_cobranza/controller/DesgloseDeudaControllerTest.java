package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.DesgloseDeuda;
import com.cobranza.saas_cobranza.repository.DesgloseDeudaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
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
class DesgloseDeudaControllerTest {

    @Mock
    private DesgloseDeudaRepository repository;

    @InjectMocks
    private DesgloseDeudaController controller;

    private static String gestor() {
        return "Bearer " + JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");
    }

    private static String admin() {
        return "Bearer " + JwtUtil.generarToken("1", "ADMINISTRADOR", "admin", "S0ADM");
    }

    @Test
    void listarTodos_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.listarTodos(null).getStatusCode());
    }

    @Test
    void listarTodos_ElAdministradorNoConsultaElDesglose() {
        assertEquals(HttpStatus.FORBIDDEN, controller.listarTodos(admin()).getStatusCode());
    }

    @Test
    void listarTodos_ElGestorConsulta() {
        when(repository.findAll()).thenReturn(List.of(new DesgloseDeuda()));

        assertEquals(HttpStatus.OK, controller.listarTodos(gestor()).getStatusCode());
        verify(repository).findAll();
    }

    @Test
    void crear_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.crear(null, new DesgloseDeuda()).getStatusCode());
    }

    @Test
    void crear_ElAdministradorNoRegistraDesgloses() {
        assertEquals(HttpStatus.FORBIDDEN, controller.crear(admin(), new DesgloseDeuda()).getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void crear_ElGestorGuardaElDesglose() {
        DesgloseDeuda desglose = new DesgloseDeuda();
        when(repository.save(desglose)).thenReturn(desglose);

        ResponseEntity<?> respuesta = controller.crear(gestor(), desglose);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(desglose, respuesta.getBody());
        verify(repository).save(desglose);
    }
}
