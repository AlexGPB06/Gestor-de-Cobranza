package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
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
class DeudaControllerTest {

    @Mock
    private DeudaRepository deudaRepository;

    @InjectMocks
    private DeudaController controller;

    private static String cabecera(String rol, long id) {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(id), rol, "u." + rol.toLowerCase(), "X0001");
    }

    // -------------------------------------------------------------------- GET

    @Test
    void obtenerTodas_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.obtenerTodas(null, null).getStatusCode());
    }

    @Test
    void obtenerTodas_LosTresRolesOperacionalesLeen() {
        when(deudaRepository.findAll()).thenReturn(List.of());

        assertEquals(HttpStatus.OK, controller.obtenerTodas(cabecera("GESTOR", 90L), null).getStatusCode());
        assertEquals(HttpStatus.OK, controller.obtenerTodas(cabecera("ADMINISTRADOR", 1L), null).getStatusCode());
        assertEquals(HttpStatus.OK, controller.obtenerTodas(cabecera("SUPERVISOR", 80L), null).getStatusCode());
    }

    @Test
    void obtenerTodas_UnRolAjenoRespondeForbidden() {
        ResponseEntity<?> respuesta = controller.obtenerTodas(cabecera("ANALISTA", 5L), null);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals("Acceso exclusivo del gestor, el administrador o el supervisor.", respuesta.getBody());
    }

    @Test
    void obtenerTodas_FiltraPorEmpresa() {
        when(deudaRepository.findByDeudor_Campana_Empresa_IdEmpresa(3L)).thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.obtenerTodas(cabecera("ADMINISTRADOR", 1L), 3L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(deudaRepository).findByDeudor_Campana_Empresa_IdEmpresa(3L);
        verify(deudaRepository, never()).findAll();
    }

    @Test
    void obtenerTodas_SinFiltroDevuelveTodas() {
        when(deudaRepository.findAll()).thenReturn(List.of(new Deuda()));

        ResponseEntity<?> respuesta = controller.obtenerTodas(cabecera("GESTOR", 90L), null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(deudaRepository).findAll();
    }

    // ------------------------------------------------------------------- POST

    @Test
    void crearDeuda_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.crearDeuda(null, new Deuda()).getStatusCode());
    }

    @Test
    void crearDeuda_SoloElGestorRegistraDeudas() {
        Deuda deuda = new Deuda();

        assertEquals(HttpStatus.FORBIDDEN, controller.crearDeuda(cabecera("ADMINISTRADOR", 1L), deuda)
                .getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, controller.crearDeuda(cabecera("SUPERVISOR", 80L), deuda)
                .getStatusCode());
        verify(deudaRepository, never()).save(any());
    }

    @Test
    void crearDeuda_ElGestorGuardaLaDeuda() {
        Deuda deuda = new Deuda();
        when(deudaRepository.save(deuda)).thenReturn(deuda);

        ResponseEntity<?> respuesta = controller.crearDeuda(cabecera("GESTOR", 90L), deuda);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(deuda, respuesta.getBody());
        verify(deudaRepository).save(deuda);
    }
}
