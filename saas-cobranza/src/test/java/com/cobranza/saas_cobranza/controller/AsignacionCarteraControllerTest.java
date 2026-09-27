package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.AsignacionCartera;
import com.cobranza.saas_cobranza.Deuda;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.AsignacionCarteraRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AsignacionCarteraControllerTest {

    @Mock
    private AsignacionCarteraRepository repository;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private DeudaRepository deudaRepository;

    @InjectMocks
    private AsignacionCarteraController controller;

    private static final long ID_GESTOR = 90L;
    private static final long ID_SUPERVISOR = 80L;

    private static String cabecera(String rol, long id) {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(id), rol, "u." + rol.toLowerCase(), "X0001");
    }

    private static String admin() {
        return cabecera("ADMINISTRADOR", 1L);
    }

    private static String supervisor() {
        return cabecera("SUPERVISOR", ID_SUPERVISOR);
    }

    private static String gestor() {
        return cabecera("GESTOR", ID_GESTOR);
    }

    private static Deuda deuda(long id) {
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(id);
        return deuda;
    }

    private static AsignacionCartera asignacion(long idDeuda) {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setDeuda(deuda(idDeuda));
        asignacion.setEstatusActiva(true);
        return asignacion;
    }

    // ------------------------------------------------------------- listarTodos

    @Test
    void listarTodos_SinTokenRespondeUnauthorized() {
        ResponseEntity<?> respuesta = controller.listarTodos(null, null, null);

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
    }

    @Test
    void listarTodos_ElGestorSoloVeSuPropiaCartera() {
        List<AsignacionCartera> suCartera = List.of(asignacion(1L));
        when(repository.findByEmpleado_IdEmpleadoAndEstatusActivaTrue(ID_GESTOR)).thenReturn(suCartera);

        ResponseEntity<?> respuesta = controller.listarTodos(gestor(), 7L, 55L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(suCartera, respuesta.getBody());
        verify(repository).findByEmpleado_IdEmpleadoAndEstatusActivaTrue(ID_GESTOR);
        verify(repository, never()).findAll();
    }

    @Test
    void listarTodos_UnRolQueNoOperaLaCarteraRespondeForbidden() {
        String token = cabecera("ANALISTA", 5L);

        ResponseEntity<?> respuesta = controller.listarTodos(token, null, null);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals("Acceso exclusivo del gestor, el administrador o el supervisor.", respuesta.getBody());
    }

    @Test
    void listarTodos_ElSupervisorNoConsultaLaCarteraDeOtro() {
        ResponseEntity<?> respuesta = controller.listarTodos(supervisor(), null, 99L);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals("Un supervisor solo puede consultar las carteras de su propio equipo.",
                respuesta.getBody());
    }

    @Test
    void listarTodos_ElSupervisorConsultaLaCarteraDeSuPropioEquipo() {
        when(repository.findByEmpleado_IdEmpleadoAndEstatusActivaTrue(ID_SUPERVISOR))
                .thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.listarTodos(supervisor(), null, ID_SUPERVISOR);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository).findByEmpleado_IdEmpleadoAndEstatusActivaTrue(ID_SUPERVISOR);
    }

    @Test
    void listarTodos_ElAdministradorFiltraPorEmpleado() {
        when(repository.findByEmpleado_IdEmpleadoAndEstatusActivaTrue(55L)).thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.listarTodos(admin(), null, 55L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository).findByEmpleado_IdEmpleadoAndEstatusActivaTrue(55L);
    }

    @Test
    void listarTodos_ElAdministradorFiltraPorEmpresa() {
        when(repository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L)).thenReturn(List.of());

        ResponseEntity<?> respuesta = controller.listarTodos(admin(), 3L, null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository).findByDeuda_Deudor_Campana_Empresa_IdEmpresa(3L);
    }

    @Test
    void listarTodos_SinFiltrosDevuelveTodo() {
        when(repository.findAll()).thenReturn(List.of(asignacion(9L)));

        ResponseEntity<?> respuesta = controller.listarTodos(admin(), null, null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository).findAll();
    }

    // -------------------------------------------------------------------- crear

    @Test
    void crear_SinTokenRespondeUnauthorized() {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(new Empleado());
        asignacion.setDeuda(deuda(1L));

        assertEquals(HttpStatus.UNAUTHORIZED, controller.crear(null, asignacion).getStatusCode());
    }

    @Test
    void crear_ElGestorNoAsignaCarteras() {
        ResponseEntity<?> respuesta = controller.crear(gestor(), new AsignacionCartera());

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void crear_SinEmpleadoODeudaRespondeBadRequest() {
        AsignacionCartera sinEmpleado = new AsignacionCartera();
        sinEmpleado.setDeuda(deuda(1L));
        AsignacionCartera sinIdDeEmpleado = new AsignacionCartera();
        sinIdDeEmpleado.setEmpleado(new Empleado());
        sinIdDeEmpleado.setDeuda(deuda(1L));
        AsignacionCartera sinDeuda = new AsignacionCartera();
        sinDeuda.setEmpleado(empleadoConId());
        AsignacionCartera sinIdDeuda = new AsignacionCartera();
        sinIdDeuda.setEmpleado(empleadoConId());
        sinIdDeuda.setDeuda(new Deuda());

        for (AsignacionCartera asignacion : List.of(sinEmpleado, sinIdDeEmpleado, sinDeuda, sinIdDeuda)) {
            ResponseEntity<?> respuesta = controller.crear(admin(), asignacion);
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("La asignación requiere el empleado y la deuda", respuesta.getBody());
        }
        verify(repository, never()).save(any());
    }

    private static Empleado empleadoConId() {
        Empleado empleado = new Empleado();
        empleado.setIdEmpleado(55L);
        return empleado;
    }

    private static Empleado gestorDe(long idGestor, long idSupervisor) {
        Empleado gestor = new Empleado();
        gestor.setIdEmpleado(idGestor);
        gestor.setRol("GESTOR");
        Empleado supervisor = new Empleado();
        supervisor.setIdEmpleado(idSupervisor);
        gestor.setSupervisor(supervisor);
        return gestor;
    }

    @Test
    void crear_ElAdministradorGuardaLaAsignacion() {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(empleadoConId());
        asignacion.setDeuda(deuda(4L));
        when(repository.save(asignacion)).thenReturn(asignacion);

        ResponseEntity<?> respuesta = controller.crear(admin(), asignacion);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(asignacion, respuesta.getBody());
        verify(repository).save(asignacion);
    }

    @Test
    void crear_ElSupervisorAsignaASuPropioGestor() {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(gestorDe(ID_GESTOR, ID_SUPERVISOR));
        asignacion.setDeuda(deuda(4L));
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestorDe(ID_GESTOR, ID_SUPERVISOR)));
        when(repository.save(asignacion)).thenReturn(asignacion);

        ResponseEntity<?> respuesta = controller.crear(supervisor(), asignacion);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository).save(asignacion);
    }

    @Test
    void crear_ElSupervisorNoAsignaAGestorDeOtroEquipo() {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(gestorDe(ID_GESTOR, 99L));
        asignacion.setDeuda(deuda(4L));
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestorDe(ID_GESTOR, 99L)));

        ResponseEntity<?> respuesta = controller.crear(supervisor(), asignacion);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void crear_ElSupervisorNoAsignaANoGestor() {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(gestorDe(ID_GESTOR, ID_SUPERVISOR));
        asignacion.setDeuda(deuda(4L));
        Empleado noGestor = gestorDe(ID_GESTOR, ID_SUPERVISOR);
        noGestor.setRol("SUPERVISOR");
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(noGestor));

        ResponseEntity<?> respuesta = controller.crear(supervisor(), asignacion);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void crear_ElSupervisorRespondeNotFoundSiElEmpleadoNoExiste() {
        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setEmpleado(gestorDe(ID_GESTOR, ID_SUPERVISOR));
        asignacion.setDeuda(deuda(4L));
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = controller.crear(supervisor(), asignacion);

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
        assertEquals("El empleado no existe", respuesta.getBody());
        verify(repository, never()).save(any());
    }

    // ------------------------------------------------------------ crearPorLote

    private static Map<String, Object> cuerpo(Object empleadoId, Object deudaIds) {
        Map<String, Object> body = new HashMap<>();
        if (empleadoId != null) {
            body.put("empleadoId", empleadoId);
        }
        if (deudaIds != null) {
            body.put("deudaIds", deudaIds);
        }
        return body;
    }

    @Test
    @SuppressWarnings("unchecked")
    void crearPorLote_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED,
                controller.crearPorLote(null, cuerpo(55L, List.of(1L))).getStatusCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void crearPorLote_SinCamposObligatoriosRespondeBadRequest() {
        ResponseEntity<?> sinEmpleado = controller.crearPorLote(admin(), cuerpo(null, List.of(1L)));
        ResponseEntity<?> sinDeudas = controller.crearPorLote(admin(), cuerpo(55L, null));
        ResponseEntity<?> vacio = controller.crearPorLote(admin(), cuerpo(null, null));

        for (ResponseEntity<?> respuesta : List.of(sinEmpleado, sinDeudas, vacio)) {
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("empleadoId y deudaIds son obligatorios", respuesta.getBody());
        }
    }

    @Test
    void crearPorLote_ElGestorNoAsignaPorLote() {
        ResponseEntity<?> respuesta = controller.crearPorLote(gestor(), cuerpo(55L, List.of(1L)));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void crearPorLote_EmpleadoInexistenteRespondeNotFound() {
        when(empleadoRepository.findById(55L)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = controller.crearPorLote(admin(), cuerpo(55L, List.of(1L)));

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
        assertEquals("El empleado no existe", respuesta.getBody());
    }

    @Test
    void crearPorLote_DeudaIdsDebeSerUnaLista() {
        when(empleadoRepository.findById(55L)).thenReturn(Optional.of(empleadoConId()));

        ResponseEntity<?> respuesta = controller.crearPorLote(admin(), cuerpo(55L, "no-es-lista"));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("deudaIds debe ser una lista", respuesta.getBody());
    }

    @Test
    @SuppressWarnings("unchecked")
    void crearPorLote_AsignaLasDeudasLibresYReportaElConteo() {
        when(empleadoRepository.findById(55L)).thenReturn(Optional.of(empleadoConId()));
        when(repository.findByDeuda_IdDeudaAndEstatusActivaTrue(anyLong())).thenReturn(List.of());
        when(deudaRepository.findById(anyLong())).thenAnswer(i -> Optional.of(deuda(i.getArgument(0))));
        when(repository.save(any(AsignacionCartera.class)))
                .thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> respuesta = controller.crearPorLote(admin(), cuerpo(55L, List.of(1L, 2L, 3L)));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> cuerpoRespuesta = (Map<String, Object>) respuesta.getBody();
        assertEquals(3, cuerpoRespuesta.get("asignadas"));
        assertTrue(((List<String>) cuerpoRespuesta.get("errores")).isEmpty());
        verify(repository, org.mockito.Mockito.times(3)).save(any(AsignacionCartera.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void crearPorLote_NoDuplicaLaDeudaYaActiva() {
        when(empleadoRepository.findById(55L)).thenReturn(Optional.of(empleadoConId()));
        when(repository.findByDeuda_IdDeudaAndEstatusActivaTrue(1L))
                .thenReturn(List.of(asignacion(1L)));
        when(repository.findByDeuda_IdDeudaAndEstatusActivaTrue(2L)).thenReturn(List.of());
        when(deudaRepository.findById(2L)).thenReturn(Optional.of(deuda(2L)));
        when(repository.save(any(AsignacionCartera.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> respuesta = controller.crearPorLote(admin(), cuerpo(55L, List.of(1L, 2L)));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(1, ((Map<String, Object>) respuesta.getBody()).get("asignadas"));
        verify(repository, org.mockito.Mockito.times(1)).save(any(AsignacionCartera.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void crearPorLote_ReportaLasDeudasInexistentesYLosIdsInvalidos() {
        when(empleadoRepository.findById(55L)).thenReturn(Optional.of(empleadoConId()));
        when(repository.findByDeuda_IdDeudaAndEstatusActivaTrue(anyLong())).thenReturn(List.of());
        when(deudaRepository.findById(10L)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = controller.crearPorLote(admin(),
                cuerpo(55L, java.util.Arrays.asList(10L, "abc", null)));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> cuerpoRespuesta = (Map<String, Object>) respuesta.getBody();
        assertEquals(0, cuerpoRespuesta.get("asignadas"));
        List<String> errores = (List<String>) cuerpoRespuesta.get("errores");
        assertNotNull(errores);
        assertEquals(List.of("Deuda inexistente: 10", "Id inválido: abc"), errores);
    }

    @Test
    void crearPorLote_ElSupervisorAsignaASuEquipo() {
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestorDe(ID_GESTOR, ID_SUPERVISOR)));

        ResponseEntity<?> respuesta = controller.crearPorLote(supervisor(), cuerpo(ID_GESTOR, List.of()));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void crearPorLote_ElSupervisorNoTocaElEquipoAjeno() {
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestorDe(ID_GESTOR, 99L)));

        ResponseEntity<?> respuesta = controller.crearPorLote(supervisor(), cuerpo(ID_GESTOR, List.of(1L)));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    // ---------------------------------------------------------------- eliminar

    @Test
    void eliminar_SinTokenRespondeUnauthorized() {
        assertEquals(HttpStatus.UNAUTHORIZED, controller.eliminar(null, 1L).getStatusCode());
    }

    @Test
    void eliminar_ElGestorNoLiberaCuentas() {
        ResponseEntity<?> respuesta = controller.eliminar(gestor(), 1L);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void eliminar_AdminLiberaLaCuenta() {
        AsignacionCartera asignacion = asignacion(1L);
        asignacion.setEmpleado(gestorDe(ID_GESTOR, ID_SUPERVISOR));
        when(repository.findById(1L)).thenReturn(Optional.of(asignacion));
        when(repository.save(asignacion)).thenReturn(asignacion);

        ResponseEntity<?> respuesta = controller.eliminar(admin(), 1L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(false, asignacion.getEstatusActiva());
        Map<String, Object> cuerpo = (Map<String, Object>) respuesta.getBody();
        assertEquals("Cuenta liberada", cuerpo.get("mensaje"));
        verify(repository).save(asignacion);
    }

    @Test
    void eliminar_SupervisorLiberaLaCuentaDeSuEquipo() {
        AsignacionCartera asignacion = asignacion(1L);
        asignacion.setEmpleado(gestorDe(ID_GESTOR, ID_SUPERVISOR));
        when(repository.findById(1L)).thenReturn(Optional.of(asignacion));
        when(repository.save(asignacion)).thenReturn(asignacion);

        ResponseEntity<?> respuesta = controller.eliminar(supervisor(), 1L);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(repository).save(asignacion);
    }

    @Test
    void eliminar_SupervisorNoLiberaCuentasAjenas() {
        AsignacionCartera asignacion = asignacion(1L);
        asignacion.setEmpleado(gestorDe(ID_GESTOR, 99L));
        when(repository.findById(1L)).thenReturn(Optional.of(asignacion));

        ResponseEntity<?> respuesta = controller.eliminar(supervisor(), 1L);

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void eliminar_AsignacionInexistenteRespondeNotFound() {
        when(repository.findById(77L)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = controller.eliminar(admin(), 77L);

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
        assertEquals("La asignación no existe", respuesta.getBody());
    }
}
