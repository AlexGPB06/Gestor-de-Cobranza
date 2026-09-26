package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Departamento;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.Ticket;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.DepartamentoRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.TicketRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketControllerTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private DeudaRepository deudaRepository;

    @Mock
    private DepartamentoRepository departamentoRepository;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @InjectMocks
    private TicketController controller;

    private static String gestor() {
        return "Bearer " + JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");
    }

    private static String admin() {
        return "Bearer " + JwtUtil.generarToken("1", "ADMINISTRADOR", "admin", "S0ADM");
    }

    private static Departamento departamento() {
        Departamento departamento = new Departamento();
        departamento.setIdDepartamento(2L);
        return departamento;
    }

    private static Empleado empleado() {
        Empleado empleado = new Empleado();
        empleado.setIdEmpleado(3L);
        return empleado;
    }

    private static Map<String, Object> cuerpo(Object numero, Object descripcion, Object idDepartamento,
                                              Object idEmpleadoOrigen, Object idDeuda, Object asunto) {
        Map<String, Object> body = new HashMap<>();
        body.put("numero", numero);
        body.put("descripcion", descripcion);
        body.put("idDepartamento", idDepartamento);
        body.put("idEmpleadoOrigen", idEmpleadoOrigen);
        body.put("idDeuda", idDeuda);
        body.put("asunto", asunto);
        return body;
    }

    private static Map<String, Object> cuerpoMinimo() {
        return cuerpo("tc-01", "No contesta", 2L, 3L, null, null);
    }

    // -------------------------------------------------------------------- GET

    @Test
    void listar_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.listar(null, null, null).getStatusCode());
    }

    @Test
    void listar_ElAdministradorNoConsultaTickets() {
        assertEquals(HttpStatus.FORBIDDEN, controller.listar(admin(), null, null).getStatusCode());
    }

    @Test
    void listar_FiltraPorDeuda() {
        when(ticketRepository.findByDeuda_IdDeuda(5L)).thenReturn(List.of());

        assertEquals(HttpStatus.OK, controller.listar(gestor(), null, 5L).getStatusCode());
        verify(ticketRepository).findByDeuda_IdDeuda(5L);
        verify(ticketRepository, never()).findAll();
    }

    @Test
    void listar_FiltraPorEmpresa() {
        when(ticketRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L)).thenReturn(List.of());

        assertEquals(HttpStatus.OK, controller.listar(gestor(), 3L, null).getStatusCode());
        verify(ticketRepository).findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L);
    }

    @Test
    void listar_SinFiltroDevuelveTodos() {
        when(ticketRepository.findAll()).thenReturn(List.of(new Ticket()));

        assertEquals(HttpStatus.OK, controller.listar(gestor(), null, null).getStatusCode());
        verify(ticketRepository).findAll();
    }

    // ------------------------------------------------------------------- POST

    @Test
    void registrar_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.registrar(null, cuerpoMinimo()).getStatusCode());
    }

    @Test
    void registrar_ElAdministradorNoAbreTickets() {
        assertEquals(HttpStatus.FORBIDDEN, controller.registrar(admin(), cuerpoMinimo()).getStatusCode());
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void registrar_SinCamposObligatoriosRespondeBadRequest() {
        Map<String, Object> sinNumero = cuerpo(null, "No contesta", 2L, 3L, null, null);
        Map<String, Object> numeroEnBlanco = cuerpo("   ", "No contesta", 2L, 3L, null, null);
        Map<String, Object> sinDescripcion = cuerpo("tc-01", null, 2L, 3L, null, null);
        Map<String, Object> descripcionEnBlanco = cuerpo("tc-01", "  ", 2L, 3L, null, null);
        Map<String, Object> sinDepartamento = cuerpo("tc-01", "No contesta", null, 3L, null, null);
        Map<String, Object> sinEmpleado = cuerpo("tc-01", "No contesta", 2L, null, null, null);
        Map<String, Object> vacio = new HashMap<>();

        for (Map<String, Object> body : List.of(sinNumero, numeroEnBlanco, sinDescripcion,
                descripcionEnBlanco, sinDepartamento, sinEmpleado, vacio)) {
            ResponseEntity<?> respuesta = controller.registrar(gestor(), body);
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("Número, descripción, departamento y empleado son obligatorios",
                    respuesta.getBody());
        }
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void registrar_DepartamentoOEmpleadoInexistenteRespondeBadRequest() {
        when(departamentoRepository.findById(2L)).thenReturn(Optional.empty());
        when(empleadoRepository.findById(3L)).thenReturn(Optional.of(empleado()));

        ResponseEntity<?> sinDepartamento = controller.registrar(gestor(), cuerpoMinimo());
        assertEquals(HttpStatus.BAD_REQUEST, sinDepartamento.getStatusCode());
        assertEquals("El departamento o el empleado indicados no existen", sinDepartamento.getBody());

        when(departamentoRepository.findById(2L)).thenReturn(Optional.of(departamento()));
        when(empleadoRepository.findById(3L)).thenReturn(Optional.empty());

        ResponseEntity<?> sinEmpleado = controller.registrar(gestor(), cuerpoMinimo());
        assertEquals(HttpStatus.BAD_REQUEST, sinEmpleado.getStatusCode());
        assertEquals("El departamento o el empleado indicados no existen", sinEmpleado.getBody());
    }

    @Test
    void registrar_NormalizaElNumeroYAbreElTicket() {
        when(departamentoRepository.findById(2L)).thenReturn(Optional.of(departamento()));
        when(empleadoRepository.findById(3L)).thenReturn(Optional.of(empleado()));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpo("  tc-07  ", "  No contesta  ", 2L, 3L, null, "  Llamada  ");
        ResponseEntity<?> respuesta = controller.registrar(gestor(), body);

        assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
        Ticket ticket = (Ticket) respuesta.getBody();
        assertEquals("TC-07", ticket.getNumero());
        assertEquals("No contesta", ticket.getDescripcion());
        assertEquals("Llamada", ticket.getAsunto());
        assertEquals("ABIERTO", ticket.getEstado());
        assertNotNull(ticket.getDepartamento());
        assertNotNull(ticket.getEmpleadoOrigen());
        assertNull(ticket.getDeuda());
    }

    @Test
    void registrar_ElAsuntoEnBlancoQuedaNulo() {
        when(departamentoRepository.findById(2L)).thenReturn(Optional.of(departamento()));
        when(empleadoRepository.findById(3L)).thenReturn(Optional.of(empleado()));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpo("TC-08", "Sin asunto", 2L, 3L, null, "   ");
        Ticket ticket = (Ticket) controller.registrar(gestor(), body).getBody();

        assertNull(ticket.getAsunto());
    }

    @Test
    void registrar_AdjudicaLaDeudaCuandoExiste() {
        when(departamentoRepository.findById(2L)).thenReturn(Optional.of(departamento()));
        when(empleadoRepository.findById(3L)).thenReturn(Optional.of(empleado()));
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(4L);
        when(deudaRepository.findById(4L)).thenReturn(Optional.of(deuda));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpo("TC-09", "PROMESA", 2L, 3L, 4L, null);
        Ticket ticket = (Ticket) controller.registrar(gestor(), body).getBody();

        assertEquals(deuda, ticket.getDeuda());
    }

    @Test
    void registrar_SiLaDeudaNoExisteElTicketQuedaSinAdjudicar() {
        when(departamentoRepository.findById(2L)).thenReturn(Optional.of(departamento()));
        when(empleadoRepository.findById(3L)).thenReturn(Optional.of(empleado()));
        when(deudaRepository.findById(4L)).thenReturn(Optional.empty());
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = cuerpo("TC-10", "SIN DEUDA", 2L, 3L, 4L, null);
        Ticket ticket = (Ticket) controller.registrar(gestor(), body).getBody();

        assertNull(ticket.getDeuda());
    }

    @Test
    void registrar_GuardaElTicketConSusRelaciones() {
        when(departamentoRepository.findById(2L)).thenReturn(Optional.of(departamento()));
        when(empleadoRepository.findById(3L)).thenReturn(Optional.of(empleado()));
        ArgumentCaptor<Ticket> captor = ArgumentCaptor.forClass(Ticket.class);
        when(ticketRepository.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        controller.registrar(gestor(), cuerpoMinimo());

        verify(ticketRepository).save(captor.capture());
        assertEquals(2L, captor.getValue().getDepartamento().getIdDepartamento());
        assertEquals(3L, captor.getValue().getEmpleadoOrigen().getIdEmpleado());
    }
}
