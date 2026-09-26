package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.GestionController;
import com.cobranza.saas_cobranza.repository.ConceptoRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.MetaRepository;
import com.cobranza.saas_cobranza.repository.TelefonoRepository;
import com.cobranza.saas_cobranza.repository.TipoPromesaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
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

class GestionPromesaTest {

    private static final Long ID_GESTOR = 90L;
    private static final Long ID_DEUDA = 1L;
    private static final Long ID_CONCEPTO_PROMESA = 7L;
    private static final int DIAS_MAXIMOS = 15;

    @InjectMocks
    private GestionController gestionController;

    @Mock
    private GestionRepository gestionRepository;

    @Mock
    private TelefonoRepository telefonoRepository;

    @Mock
    private DeudaRepository deudaRepository;

    @Mock
    private ConceptoRepository conceptoRepository;

    @Mock
    private TipoPromesaRepository tipoPromesaRepository;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private MetaRepository metaRepository;

    private Empleado gestor;
    private Concepto conceptoPromesa;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        gestor = new Empleado();
        gestor.setIdEmpleado(ID_GESTOR);
        gestor.setUsuario("gestor.s1.01");
        gestor.setRol("GESTOR");
        gestor.setActivo(true);

        conceptoPromesa = new Concepto();
        conceptoPromesa.setIdConcepto(ID_CONCEPTO_PROMESA);
        conceptoPromesa.setNombreConcepto("Promesa de pago");
        conceptoPromesa.setCategoria("PROMESA");
        conceptoPromesa.setActivo(true);

        Campana campana = new Campana();
        campana.setIdCampana(1L);
        campana.setDiasMaximosPromesa(DIAS_MAXIMOS);

        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestor));
        when(conceptoRepository.findById(ID_CONCEPTO_PROMESA)).thenReturn(Optional.of(conceptoPromesa));

        Deudor deudor = new Deudor();
        deudor.setIdDeudor(1L);
        deudor.setCampana(campana);

        Deuda deuda = new Deuda();
        deuda.setIdDeuda(ID_DEUDA);
        deuda.setDeudor(deudor);
        when(deudaRepository.findByIdBloqueado(ID_DEUDA)).thenReturn(Optional.of(deuda));
    }

    private String tokenGestor() {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(ID_GESTOR), "GESTOR", "gestor.s1.01", "S1G01");
    }

    private Gestion gestionPromesa(LocalDate fechaPromesa) {
        Gestion gestion = new Gestion();
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(ID_DEUDA);
        Concepto concepto = new Concepto();
        concepto.setIdConcepto(ID_CONCEPTO_PROMESA);
        gestion.setDeuda(deuda);
        gestion.setConcepto(concepto);
        gestion.setCodigoResultado("PROMESA");
        gestion.setFechaPromesa(fechaPromesa);
        return gestion;
    }

    @Test
    void crearGestion_PromesaSinFecha_DeberiaRetornar400() {
        when(gestionRepository.save(any(Gestion.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = gestionController.crearGestion(tokenGestor(), gestionPromesa(null));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("La promesa requiere una fecha de pago.", response.getBody());
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void crearGestion_PromesaFueraDeLaVentanaDeCampana_DeberiaRetornar400() {
        LocalDate fueraDeVentana = LocalDate.now().plusDays(DIAS_MAXIMOS + 5L);

        ResponseEntity<?> response = gestionController.crearGestion(tokenGestor(), gestionPromesa(fueraDeVentana));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("ventana permitida"));
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void crearGestion_PromesaDuplicadaVigente_DeberiaRetornar400() {
        LocalDate dentroDeVentana = LocalDate.now().plusDays(3L);

        Gestion vigente = new Gestion();
        Concepto concepto = new Concepto();
        concepto.setNombreConcepto("Promesa de pago");
        concepto.setCategoria("PROMESA");
        vigente.setConcepto(concepto);
        vigente.setFechaPromesa(dentroDeVentana);
        when(gestionRepository.findByDeuda_IdDeudaAndFechaPromesaGreaterThanEqual(ID_DEUDA, LocalDate.now()))
                .thenReturn(List.of(vigente));

        ResponseEntity<?> response = gestionController.crearGestion(tokenGestor(), gestionPromesa(dentroDeVentana));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Ya existe una promesa vigente"));
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void crearGestion_PromesaValida_DeberiaRegistrarse() {
        LocalDate dentroDeVentana = LocalDate.now().plusDays(3L);
        when(gestionRepository.findByDeuda_IdDeudaAndFechaPromesaGreaterThanEqual(ID_DEUDA, LocalDate.now()))
                .thenReturn(List.of());
        when(gestionRepository.save(any(Gestion.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = gestionController.crearGestion(tokenGestor(), gestionPromesa(dentroDeVentana));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Gestion guardada = (Gestion) response.getBody();
        assertEquals(dentroDeVentana, guardada.getFechaPromesa());
        assertEquals(ID_GESTOR, guardada.getEmpleado().getIdEmpleado());
    }

    @Test
    void crearGestion_EmpleadoInactivo_DeberiaRetornar401() {
        gestor.setActivo(false);

        Gestion gestion = new Gestion();
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(ID_DEUDA);
        gestion.setDeuda(deuda);
        gestion.setCodigoResultado("CONTACTO");

        ResponseEntity<?> response = gestionController.crearGestion(tokenGestor(), gestion);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("El empleado del token no está activo", response.getBody());
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void crearGestion_DeudaInexistente_DeberiaRetornar400() {
        when(deudaRepository.findByIdBloqueado(999999L)).thenReturn(Optional.empty());

        Gestion gestion = new Gestion();
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(999999L);
        gestion.setDeuda(deuda);
        gestion.setCodigoResultado("CONTACTO");

        ResponseEntity<?> response = gestionController.crearGestion(tokenGestor(), gestion);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("La deuda no existe", response.getBody());
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void actualizarMontoPagado_ValorInvalido_DeberiaRetornar400() {
        Gestion existente = new Gestion();
        existente.setIdGestion(500L);
        when(gestionRepository.findById(500L)).thenReturn(Optional.of(existente));

        Map<String, Object> body = new HashMap<>();
        body.put("montoPagado", "no-es-un-numero");

        ResponseEntity<?> response = gestionController.actualizarMontoPagado(tokenGestor(), 500L, body);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("El monto pagado no es válido", response.getBody());
    }

    @Test
    void actualizarEstadoBonificacion_EstadoInvalido_DeberiaRetornar400() {
        Gestion existente = new Gestion();
        existente.setIdGestion(500L);
        when(gestionRepository.findById(500L)).thenReturn(Optional.of(existente));

        Map<String, Object> body = new HashMap<>();
        body.put("estado", "CUALQUIER_COSA");

        ResponseEntity<?> response = gestionController.actualizarEstadoBonificacion(tokenGestor(), 500L, body);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Estado no válido", response.getBody());
    }

    @Test
    void actualizarEstadoBonificacion_EstadoValido_DeberiaGuardarEnMayusculas() {
        Gestion existente = new Gestion();
        existente.setIdGestion(500L);
        when(gestionRepository.findById(500L)).thenReturn(Optional.of(existente));
        when(gestionRepository.save(any(Gestion.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = new HashMap<>();
        body.put("estado", "aprobada");

        ResponseEntity<?> response = gestionController.actualizarEstadoBonificacion(tokenGestor(), 500L, body);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("APROBADA", ((Gestion) response.getBody()).getEstadoBonificacion());
    }

    @Test
    void actualizarMontoPagado_GestionInexistente_DeberiaRetornar404() {
        when(gestionRepository.findById(999L)).thenReturn(Optional.empty());

        Map<String, Object> body = new HashMap<>();
        body.put("montoPagado", "100");

        ResponseEntity<?> response = gestionController.actualizarMontoPagado(tokenGestor(), 999L, body);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("La gestión no existe", response.getBody());
    }

    @Test
    void actualizarMontoPagado_ValorValido_DeberiaGuardarElMonto() {
        Gestion existente = new Gestion();
        existente.setIdGestion(500L);
        when(gestionRepository.findById(500L)).thenReturn(Optional.of(existente));
        when(gestionRepository.save(any(Gestion.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = new HashMap<>();
        body.put("montoPagado", 2500.75);

        ResponseEntity<?> response = gestionController.actualizarMontoPagado(tokenGestor(), 500L, body);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(new BigDecimal("2500.75"), ((Gestion) response.getBody()).getMontoPagado());
    }
}
