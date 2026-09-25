package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.MetaController;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.MetaRepository;
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

class MetaControllerTest {

    private static final Long ID_SUPERVISOR = 80L;
    private static final Long ID_GESTOR = 90L;
    private static final Long ID_CAMPANA = 1L;

    @InjectMocks
    private MetaController metaController;

    @Mock
    private MetaRepository metaRepository;

    @Mock
    private GestionRepository gestionRepository;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private CampanaRepository campanaRepository;

    private Campana campana;
    private Empleado supervisor;
    private Map<String, Object> cuerpo;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        campana = new Campana();
        campana.setIdCampana(ID_CAMPANA);
        campana.setNombreEmpresa("Banco Santander");
        campana.setActivo(true);

        supervisor = new Empleado();
        supervisor.setIdEmpleado(ID_SUPERVISOR);
        supervisor.setNumeroEmpleado("S1SUP");
        supervisor.setUsuario("supervisor.s1");
        supervisor.setNombreCompleto("María Teresa Gil");
        supervisor.setCorreoElectronico("mtgil@santander.mx");
        supervisor.setRol("SUPERVISOR");
        supervisor.setActivo(true);

        cuerpo = new HashMap<>();
        cuerpo.put("descripcion", "  Meta de cobranza semanal  ");
        cuerpo.put("idCampana", ID_CAMPANA);
        cuerpo.put("fechaInicio", "2026-09-01");
        cuerpo.put("fechaFin", "2026-09-30");
        cuerpo.put("periodo", "mensual");
        cuerpo.put("objetivoGestiones", 40);
        cuerpo.put("objetivoMonto", "150000.00");
    }

    private String token(String rol, Long idEmpleado) {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(idEmpleado), rol, "usuario.test", "T0000");
    }

    @Test
    void crearMeta_Supervisor_DeberiaRegistrarMeta() {
        when(campanaRepository.findById(ID_CAMPANA)).thenReturn(Optional.of(campana));
        when(empleadoRepository.findById(ID_SUPERVISOR)).thenReturn(Optional.of(supervisor));
        when(metaRepository.save(any(Meta.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = metaController.crearMeta(token("SUPERVISOR", ID_SUPERVISOR), cuerpo);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Meta guardada = (Meta) response.getBody();
        assertEquals("Meta de cobranza semanal", guardada.getDescripcion());
        assertEquals(ID_CAMPANA, guardada.getCampana().getIdCampana());
        assertEquals(ID_SUPERVISOR, guardada.getSupervisor().getIdEmpleado());
        assertEquals("MENSUAL", guardada.getPeriodo());
        assertEquals(40, guardada.getObjetivoGestiones());
        assertEquals(new BigDecimal("150000.00"), guardada.getObjetivoMonto());
        assertEquals(LocalDate.parse("2026-09-01"), guardada.getFechaInicio());
        assertEquals(Boolean.TRUE, guardada.getActivo());
    }

    @Test
    void crearMeta_Gestor_DeberiaRetornar403() {
        ResponseEntity<?> response = metaController.crearMeta(token("GESTOR", ID_GESTOR), cuerpo);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(metaRepository, never()).save(any(Meta.class));
    }

    @Test
    void crearMeta_SinToken_DeberiaRetornar401() {
        ResponseEntity<?> response = metaController.crearMeta(null, cuerpo);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(metaRepository, never()).save(any(Meta.class));
    }

    @Test
    void crearMeta_CampanaInexistente_DeberiaRetornar400() {
        when(campanaRepository.findById(ID_CAMPANA)).thenReturn(Optional.empty());
        when(empleadoRepository.findById(ID_SUPERVISOR)).thenReturn(Optional.of(supervisor));

        ResponseEntity<?> response = metaController.crearMeta(token("SUPERVISOR", ID_SUPERVISOR), cuerpo);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("La campaña no existe", response.getBody());
        verify(metaRepository, never()).save(any(Meta.class));
    }

    @Test
    void listarMetas_Gestor_DeberiaVerSoloActivas() {
        Meta activa = new Meta();
        activa.setIdMeta(1L);
        activa.setDescripcion("Meta activa");
        activa.setActivo(true);
        when(metaRepository.findByActivoTrue()).thenReturn(List.of(activa));

        ResponseEntity<?> response = metaController.listar(token("GESTOR", ID_GESTOR), null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> metas = (List<?>) response.getBody();
        assertEquals(1, metas.size());
        verify(metaRepository, never()).findAll();
    }

    @Test
    void progresoMeta_DeberiaCalcularTotalesYCumplimiento() {
        Meta meta = new Meta();
        meta.setIdMeta(5L);
        meta.setDescripcion("Meta del mes");
        meta.setObjetivoGestiones(4);
        meta.setActivo(true);
        when(metaRepository.findById(5L)).thenReturn(Optional.of(meta));

        Empleado gestorUno = new Empleado();
        gestorUno.setIdEmpleado(90L);
        Empleado gestorDos = new Empleado();
        gestorDos.setIdEmpleado(91L);

        Gestion primera = new Gestion();
        primera.setEmpleado(gestorUno);
        primera.setMontoPromesa(new BigDecimal("1000.00"));
        primera.setMontoPagado(new BigDecimal("400.00"));

        Gestion segunda = new Gestion();
        segunda.setEmpleado(gestorDos);
        segunda.setMontoPromesa(new BigDecimal("500.00"));
        segunda.setMontoPagado(BigDecimal.ZERO);

        when(gestionRepository.findByMeta_IdMeta(5L)).thenReturn(List.of(primera, segunda));

        ResponseEntity<?> response = metaController.progreso(token("SUPERVISOR", ID_SUPERVISOR), 5L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(2, body.get("totalGestiones"));
        assertEquals(2, body.get("gestoresParticipantes"));
        assertEquals(new BigDecimal("1500.00"), body.get("montoPrometido"));
        assertEquals(new BigDecimal("400.00"), body.get("montoCobrado"));
        assertEquals(new BigDecimal("50.00"), body.get("cumplimientoPorcentaje"));
    }

    @Test
    void crearMeta_PeriodoInvalido_DeberiaRetornar400() {
        cuerpo.put("periodo", "trimestral");
        when(campanaRepository.findById(ID_CAMPANA)).thenReturn(Optional.of(campana));
        when(empleadoRepository.findById(ID_SUPERVISOR)).thenReturn(Optional.of(supervisor));

        ResponseEntity<?> response = metaController.crearMeta(token("SUPERVISOR", ID_SUPERVISOR), cuerpo);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("El periodo debe ser DIARIO, SEMANAL o MENSUAL", response.getBody());
        verify(metaRepository, never()).save(any(Meta.class));
    }

    @Test
    void crearMeta_SinDescripcion_DeberiaRetornar400() {
        cuerpo.remove("descripcion");

        ResponseEntity<?> response = metaController.crearMeta(token("SUPERVISOR", ID_SUPERVISOR), cuerpo);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("La descripción es obligatoria", response.getBody());
    }

    @Test
    void obtenerMeta_GestorConMetaInactiva_DeberiaRetornar404() {
        Meta inactiva = new Meta();
        inactiva.setIdMeta(7L);
        inactiva.setActivo(false);
        when(metaRepository.findById(7L)).thenReturn(Optional.of(inactiva));

        ResponseEntity<?> response = metaController.obtener(token("GESTOR", ID_GESTOR), 7L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("La meta no existe", response.getBody());
    }

    @Test
    void obtenerMeta_Inexistente_DeberiaRetornar404() {
        when(metaRepository.findById(404L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = metaController.obtener(token("ADMINISTRADOR", ID_SUPERVISOR), 404L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void actualizarMeta_Gestor_DeberiaRetornar403() {
        Meta meta = new Meta();
        meta.setIdMeta(3L);
        meta.setSupervisor(supervisor);
        meta.setActivo(true);
        when(metaRepository.findById(3L)).thenReturn(Optional.of(meta));

        Map<String, Object> cambios = new HashMap<>();
        cambios.put("objetivoGestiones", 99);

        ResponseEntity<?> response = metaController.actualizar(token("GESTOR", ID_GESTOR), 3L, cambios);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(metaRepository, never()).save(any(Meta.class));
    }

    @Test
    void actualizarMeta_SupervisorDueno_DeberiaActualizarObjetivo() {
        Meta meta = new Meta();
        meta.setIdMeta(3L);
        meta.setDescripcion("Meta inicial");
        meta.setSupervisor(supervisor);
        meta.setFechaInicio(LocalDate.parse("2026-09-01"));
        meta.setActivo(true);
        when(metaRepository.findById(3L)).thenReturn(Optional.of(meta));
        when(metaRepository.save(any(Meta.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> cambios = new HashMap<>();
        cambios.put("objetivoGestiones", 99);
        cambios.put("activo", false);

        ResponseEntity<?> response = metaController.actualizar(token("SUPERVISOR", ID_SUPERVISOR), 3L, cambios);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        Meta actualizada = (Meta) response.getBody();
        assertEquals(99, actualizada.getObjetivoGestiones());
        assertEquals(Boolean.FALSE, actualizada.getActivo());
    }

    @Test
    void actualizarMeta_OtroSupervisor_DeberiaRetornar403() {
        Meta meta = new Meta();
        meta.setIdMeta(3L);
        meta.setSupervisor(supervisor);
        meta.setActivo(true);
        when(metaRepository.findById(3L)).thenReturn(Optional.of(meta));

        ResponseEntity<?> response = metaController.actualizar(token("SUPERVISOR", 999L), 3L, new HashMap<>());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void listarPorSupervisor_GestorConsultandoOtro_DeberiaRetornar403() {
        ResponseEntity<?> response = metaController.listarPorSupervisor(token("GESTOR", ID_GESTOR), ID_SUPERVISOR);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("No puede consultar las metas de otro supervisor", response.getBody());
    }

    @Test
    void listarPorSupervisor_SupervisorConsultandoElMismo_DeberiaDevolverSusMetas() {
        Meta meta = new Meta();
        meta.setIdMeta(3L);
        meta.setSupervisor(supervisor);
        when(metaRepository.findBySupervisor_IdEmpleado(ID_SUPERVISOR)).thenReturn(List.of(meta));

        ResponseEntity<?> response = metaController.listarPorSupervisor(
                token("SUPERVISOR", ID_SUPERVISOR), ID_SUPERVISOR);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, ((List<?>) response.getBody()).size());
    }

    @Test
    void progresoMeta_SinToken_DeberiaRetornar401() {
        ResponseEntity<?> response = metaController.progreso(null, 5L);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void progresoMeta_MetaInexistente_DeberiaRetornar404() {
        when(metaRepository.findById(404L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = metaController.progreso(token("SUPERVISOR", ID_SUPERVISOR), 404L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
