package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.SupervisionController;
import com.cobranza.saas_cobranza.repository.AsignacionCarteraRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.TicketRepository;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SupervisionControllerTest {

    private static final Long ID_SUPERVISOR = 80L;
    private static final Long ID_GESTOR_UNO = 90L;
    private static final Long ID_GESTOR_DOS = 91L;

    @InjectMocks
    private SupervisionController supervisionController;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private AsignacionCarteraRepository asignacionCarteraRepository;

    @Mock
    private GestionRepository gestionRepository;

    @Mock
    private TicketRepository ticketRepository;

    private String tokenSupervisor() {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(ID_SUPERVISOR), "SUPERVISOR",
                "supervisor.s1", "S1SUP");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> equipoDe(String token, String periodo) {
        return (List<Map<String, Object>>) supervisionController.equipo(token, ID_SUPERVISOR, periodo).getBody();
    }

    @SuppressWarnings("unchecked")
    private List<Gestion> promesasDe(String token) {
        return (List<Gestion>) supervisionController.promesas(token, ID_SUPERVISOR, null).getBody();
    }

    private Empleado gestorUno;
    private Empleado gestorDos;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        gestorUno = new Empleado();
        gestorUno.setIdEmpleado(ID_GESTOR_UNO);
        gestorUno.setUsuario("gestor.s1.01");
        gestorUno.setNombreCompleto("Verónica Castillo");
        gestorUno.setRol("GESTOR");

        gestorDos = new Empleado();
        gestorDos.setIdEmpleado(ID_GESTOR_DOS);
        gestorDos.setUsuario("gestor.s1.02");
        gestorDos.setNombreCompleto("Miguel Núñez");
        gestorDos.setRol("GESTOR");
    }

    private Deuda deuda(BigDecimal saldo, int diasMora) {
        Deuda deuda = new Deuda();
        deuda.setIdDeuda((long) diasMora);
        deuda.setSaldoPendiente(saldo);
        deuda.setFechaVencimiento(LocalDate.now().minusDays(diasMora));
        return deuda;
    }

    private AsignacionCartera cartera(Empleado empleado, Deuda deuda) {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(empleado);
        asignacion.setDeuda(deuda);
        asignacion.setEstatusActiva(true);
        asignacion.setFechaAsignacion(LocalDate.now());
        return asignacion;
    }

    private Gestion gestion(Empleado empleado, BigDecimal montoPromesa, int diasAtras) {
        Gestion gestion = new Gestion();
        gestion.setEmpleado(empleado);
        gestion.setMontoPromesa(montoPromesa);
        gestion.setMontoPagado(BigDecimal.ZERO);
        gestion.setCodigoResultado("PROMESA");
        gestion.setFechaRegistro(LocalDateTime.now().minusDays(diasAtras));
        return gestion;
    }

    @Test
    void equipo_SinPeriodo_DeberaCalcularSaldosPorMoraYGestiones() {
        Deuda deudaUno = deuda(new BigDecimal("1000.00"), 45);
        Deuda deudaDos = deuda(new BigDecimal("500.00"), 200);

        when(empleadoRepository.findBySupervisor_IdEmpleado(ID_SUPERVISOR))
                .thenReturn(List.of(gestorUno, gestorDos));
        when(asignacionCarteraRepository.findByEmpleado_IdEmpleadoInAndEstatusActivaTrue(any()))
                .thenReturn(List.of(cartera(gestorUno, deudaUno), cartera(gestorDos, deudaDos)));
        when(gestionRepository.findByEmpleado_IdEmpleadoIn(any()))
                .thenReturn(List.of(
                        gestion(gestorUno, new BigDecimal("300.00"), 0),
                        gestion(gestorUno, null, 1),
                        gestion(gestorDos, null, 2)));
        when(ticketRepository.findByEmpleadoOrigen_IdEmpleadoIn(any())).thenReturn(List.of());

        List<Map<String, Object>> filas = equipoDe(tokenSupervisor(), null);

        assertEquals(2, filas.size());

        Map<String, Object> filaUno = filas.get(0);
        assertEquals(1, filaUno.get("cuentasAsignadas"));
        assertEquals(new BigDecimal("1000.00"), filaUno.get("saldoTotal"));
        assertEquals(new BigDecimal("1000.00"), filaUno.get("saldoMora1y2"));
        assertEquals(BigDecimal.ZERO, filaUno.get("saldoMora3y4"));
        assertEquals(BigDecimal.ZERO, filaUno.get("saldoMora5y6"));
        assertEquals(2, filaUno.get("gestiones"));
        assertEquals(1L, filaUno.get("promesas"));
        assertEquals(0L, filaUno.get("tickets"));
        assertEquals(2, ((List<?>) filaUno.get("ultimasGestiones")).size());

        Map<String, Object> filaDos = filas.get(1);
        assertEquals(new BigDecimal("500.00"), filaDos.get("saldoMora5y6"));
        assertEquals(BigDecimal.ZERO, filaDos.get("saldoMora3y4"));
        assertEquals(0L, filaDos.get("promesas"));
    }

    @Test
    void equipo_PeriodoHoy_DeberaFiltrarPorFechaDeRegistro() {
        when(empleadoRepository.findBySupervisor_IdEmpleado(ID_SUPERVISOR)).thenReturn(List.of(gestorUno));
        when(asignacionCarteraRepository.findByEmpleado_IdEmpleadoInAndEstatusActivaTrue(any()))
                .thenReturn(List.of());
        when(gestionRepository.findByEmpleado_IdEmpleadoInAndFechaRegistroGreaterThanEqual(any(), any()))
                .thenReturn(List.of(gestion(gestorUno, null, 0)));
        when(ticketRepository.findByEmpleadoOrigen_IdEmpleadoInAndFechaCreacionGreaterThanEqual(any(), any()))
                .thenReturn(List.of());

        List<Map<String, Object>> filas = equipoDe(tokenSupervisor(), "HOY");

        assertEquals(1, filas.size());
        assertEquals(1, filas.get(0).get("gestiones"));
        verify(gestionRepository).findByEmpleado_IdEmpleadoInAndFechaRegistroGreaterThanEqual(
                eq(List.of(ID_GESTOR_UNO)), any(LocalDateTime.class));
    }

    @Test
    void promesas_DebeDevolverSoloGestionesConMontoPromesa() {
        when(empleadoRepository.findBySupervisor_IdEmpleado(ID_SUPERVISOR))
                .thenReturn(List.of(gestorUno, gestorDos));
        when(gestionRepository.findByEmpleado_IdEmpleadoIn(any())).thenReturn(List.of(
                gestion(gestorUno, new BigDecimal("300.00"), 0),
                gestion(gestorDos, null, 1),
                gestion(gestorUno, new BigDecimal("150.00"), 2)));

        List<Gestion> promesas = promesasDe(tokenSupervisor());

        assertEquals(2, promesas.size());
        assertEquals(new BigDecimal("300.00"), promesas.get(0).getMontoPromesa());
        assertEquals(new BigDecimal("150.00"), promesas.get(1).getMontoPromesa());
    }

    @Test
    void equipo_SinEquipoAsignado_DeberaDevolverListaVacia() {
        when(empleadoRepository.findBySupervisor_IdEmpleado(ID_SUPERVISOR)).thenReturn(List.of());

        List<Map<String, Object>> filas = equipoDe(tokenSupervisor(), "MES");

        assertEquals(0, filas.size());
        verify(asignacionCarteraRepository, never())
                .findByEmpleado_IdEmpleadoInAndEstatusActivaTrue(any());
        verify(gestionRepository, never()).findByEmpleado_IdEmpleadoIn(any());
    }
}
