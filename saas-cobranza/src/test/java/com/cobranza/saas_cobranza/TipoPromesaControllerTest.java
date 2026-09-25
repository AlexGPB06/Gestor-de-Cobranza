package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.TipoPromesaController;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.TipoPromesaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TipoPromesaControllerTest {

    @InjectMocks
    private TipoPromesaController tipoPromesaController;

    @Mock
    private TipoPromesaRepository tipoPromesaRepository;

    @Mock
    private CampanaRepository campanaRepository;

    private Campana campana;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        campana = new Campana();
        campana.setIdCampana(1L);
        campana.setNombreEmpresa("Banco Santander");
        campana.setDiasMaximosPromesa(15);
        campana.setActivo(true);
    }

    @Test
    void registrar_NombreYCampanaValidos_DeberiaCrearTipoActivo() {
        Map<String, Object> datos = new HashMap<>();
        datos.put("nombre", "  Pago Total  ");
        datos.put("idCampana", 1L);

        when(campanaRepository.findById(1L)).thenReturn(Optional.of(campana));
        when(tipoPromesaRepository.save(any(TipoPromesa.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = tipoPromesaController.registrar(datos);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        TipoPromesa creado = (TipoPromesa) response.getBody();
        assertEquals("Pago Total", creado.getNombre());
        assertEquals(1L, creado.getCampana().getIdCampana());
        assertEquals(Boolean.TRUE, creado.getActivo());
    }

    @Test
    void registrar_SinNombre_DeberiaRetornar400() {
        Map<String, Object> datos = new HashMap<>();
        datos.put("idCampana", 1L);

        ResponseEntity<?> response = tipoPromesaController.registrar(datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("El nombre es obligatorio", response.getBody());
        verify(tipoPromesaRepository, never()).save(any(TipoPromesa.class));
    }

    @Test
    void registrar_CampanaInexistente_DeberiaRetornar400() {
        Map<String, Object> datos = new HashMap<>();
        datos.put("nombre", "Pago Total");
        datos.put("idCampana", 99L);

        when(campanaRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = tipoPromesaController.registrar(datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("La campaña indicada no existe", response.getBody());
    }

    @Test
    void listar_SinFiltro_DeberiaDevolverTodos() {
        TipoPromesa tipo = new TipoPromesa();
        tipo.setIdTipoPromesa(1L);
        tipo.setNombre("Pago Total");
        tipo.setCampana(campana);
        tipo.setActivo(true);
        when(tipoPromesaRepository.findAll()).thenReturn(List.of(tipo));

        ResponseEntity<List<TipoPromesa>> response = tipoPromesaController.listar(null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void listar_ConEmpresa_DeberiaFiltrarPorEmpresa() {
        when(tipoPromesaRepository.findByCampana_Empresa_IdEmpresa(1L)).thenReturn(List.of());

        ResponseEntity<List<TipoPromesa>> response = tipoPromesaController.listar(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
        verify(tipoPromesaRepository).findByCampana_Empresa_IdEmpresa(1L);
    }
}
