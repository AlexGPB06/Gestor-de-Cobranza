package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.EmpleadoController;
import com.cobranza.saas_cobranza.repository.AsignacionCarteraRepository;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.DepartamentoRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.RolCampanaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import com.cobranza.saas_cobranza.util.PasswordUtil;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmpleadoControllerTest {

    @InjectMocks
    private EmpleadoController empleadoController;

    @Mock
    private EmpleadoRepository empleadoRepository;

    @Mock
    private EmpresaRepository empresaRepository;

    @Mock
    private DepartamentoRepository departamentoRepository;

    @Mock
    private CampanaRepository campanaRepository;

    @Mock
    private RolCampanaRepository rolCampanaRepository;

    @Mock
    private GestionRepository gestionRepository;

    @Mock
    private AsignacionCarteraRepository asignacionCarteraRepository;

    private Empleado empleadoMock;
    private Empleado empleadoGestorMock;
    private Empleado empleadoPendienteMock;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        empleadoMock = new Empleado();
        empleadoMock.setIdEmpleado(1L);
        empleadoMock.setNumeroEmpleado("A1B2C");
        empleadoMock.setUsuario("alex.perez");
        empleadoMock.setNombreCompleto("Alex");
        empleadoMock.setCorreoElectronico("alex@bpo.com");
        empleadoMock.setRol("ADMINISTRADOR");
        empleadoMock.setContrasenaHash(PasswordUtil.hash("admin123"));
        empleadoMock.setActivo(true);

        empleadoGestorMock = new Empleado();
        empleadoGestorMock.setIdEmpleado(83L);
        empleadoGestorMock.setNumeroEmpleado("S1G01");
        empleadoGestorMock.setUsuario("gestor.s1.01");
        empleadoGestorMock.setNombreCompleto("Verónica Castillo");
        empleadoGestorMock.setCorreoElectronico("gestor1@santander.mx");
        empleadoGestorMock.setRol("GESTOR");
        empleadoGestorMock.setContrasenaHash(PasswordUtil.hash("Clave#2026e"));
        empleadoGestorMock.setActivo(true);

        empleadoPendienteMock = new Empleado();
        empleadoPendienteMock.setIdEmpleado(238L);
        empleadoPendienteMock.setNumeroEmpleado("S1G09");
        empleadoPendienteMock.setUsuario(null);
        empleadoPendienteMock.setNombreCompleto("Sofia Mora Delgado");
        empleadoPendienteMock.setCorreoElectronico("gestor.s1.09@santander.mx");
        empleadoPendienteMock.setRol("GESTOR");
        empleadoPendienteMock.setActivo(false);
    }

    @Test
    void login_CredencialesCorrectas_DeberiaRetornarTokenYRol() {
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("usuario", "alex.perez");
        credenciales.put("password", "admin123");

        when(empleadoRepository.findByUsuario("alex.perez")).thenReturn(Optional.of(empleadoMock));

        ResponseEntity<?> response = empleadoController.login(credenciales);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.containsKey("token"));
        assertTrue(body.containsKey("idEmpleado"));
        assertEquals("ADMINISTRADOR", body.get("rol"));
        assertEquals("alex.perez", body.get("usuario"));
    }

    @Test
    void login_ContrasenaIncorrecta_DeberiaRetornar401() {
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("usuario", "alex.perez");
        credenciales.put("password", "clave_falsa");

        when(empleadoRepository.findByUsuario("alex.perez")).thenReturn(Optional.of(empleadoMock));

        ResponseEntity<?> response = empleadoController.login(credenciales);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Credenciales inválidas o inactivo", response.getBody());
    }

    @Test
    void login_UsuarioNoEncontrado_DeberiaRetornar404() {
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("usuario", "no.existe");
        credenciales.put("password", "admin123");

        when(empleadoRepository.findByUsuario("no.existe")).thenReturn(Optional.empty());

        ResponseEntity<?> response = empleadoController.login(credenciales);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void login_DatosIncompletos_DeberiaRetornar400() {
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("usuario", "alex.perez");

        ResponseEntity<?> response = empleadoController.login(credenciales);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void activar_CodigoValido_DeberiaActivarCuenta() {
        empleadoMock.setUsuario(null);
        empleadoMock.setContrasenaHash(null);
        empleadoMock.setActivo(false);

        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "a1b2c");
        datos.put("nuevoUsuario", "alex.perez");
        datos.put("nuevaContrasena", "miClave123");

        when(empleadoRepository.findByNumeroEmpleado("A1B2C")).thenReturn(Optional.of(empleadoMock));
        when(empleadoRepository.existsByUsuario("alex.perez")).thenReturn(false);
        when(empleadoRepository.save(any(Empleado.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = empleadoController.activar(datos);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(empleadoMock.getActivo());
        assertEquals("alex.perez", empleadoMock.getUsuario());
        assertTrue(PasswordUtil.verificar("miClave123", empleadoMock.getContrasenaHash()));
    }

    @Test
    void activar_CodigoNoRegistrado_DeberiaRetornar404() {
        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "ZZZZZ");
        datos.put("nuevoUsuario", "juan");
        datos.put("nuevaContrasena", "miClave123");

        when(empleadoRepository.findByNumeroEmpleado("ZZZZZ")).thenReturn(Optional.empty());

        ResponseEntity<?> response = empleadoController.activar(datos);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void activar_CuentaYaActivada_DeberiaRetornar409() {
        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "A1B2C");
        datos.put("nuevoUsuario", "alex.perez");
        datos.put("nuevaContrasena", "miClave123");

        when(empleadoRepository.findByNumeroEmpleado("A1B2C")).thenReturn(Optional.of(empleadoMock));

        ResponseEntity<?> response = empleadoController.activar(datos);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("La cuenta ya fue activada", response.getBody());
    }

    @Test
    void activar_FormatoCodigoInvalido_DeberiaRetornar400() {
        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "123");
        datos.put("nuevoUsuario", "juan");
        datos.put("nuevaContrasena", "miClave123");

        ResponseEntity<?> response = empleadoController.activar(datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void registrar_DatosValidos_DeberiaCrearEmpleadoInactivo() {
        Map<String, String> datos = new HashMap<>();
        datos.put("nombreCompleto", "Juan Pérez");
        datos.put("correoElectronico", "juan@bpo.com");
        datos.put("numeroEmpleado", "x9y8z");
        datos.put("rol", "GESTOR");

        when(empleadoRepository.existsByNumeroEmpleado("X9Y8Z")).thenReturn(false);
        when(empleadoRepository.existsByCorreoElectronico("juan@bpo.com")).thenReturn(false);
        when(empleadoRepository.save(any(Empleado.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = empleadoController.registrar(tokenAdmin(), datos);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("X9Y8Z", body.get("numeroEmpleado"));
        assertEquals("GESTOR", body.get("rol"));
        assertEquals(Boolean.FALSE, body.get("activo"));
    }

    @Test
    void registrar_CodigoDuplicado_DeberiaRetornar409() {
        Map<String, String> datos = new HashMap<>();
        datos.put("nombreCompleto", "Juan Pérez");
        datos.put("correoElectronico", "juan@bpo.com");
        datos.put("numeroEmpleado", "A1B2C");
        datos.put("rol", "GESTOR");

        when(empleadoRepository.existsByNumeroEmpleado("A1B2C")).thenReturn(true);

        ResponseEntity<?> response = empleadoController.registrar(tokenAdmin(), datos);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void registrar_SinToken_DeberiaRetornar401() {
        Map<String, String> datos = new HashMap<>();
        datos.put("nombreCompleto", "Juan Pérez");
        datos.put("correoElectronico", "juan@bpo.com");
        datos.put("numeroEmpleado", "X9Y8Z");
        datos.put("rol", "GESTOR");

        ResponseEntity<?> response = empleadoController.registrar(null, datos);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void registrar_Gestor_DeberiaRetornar403() {
        Map<String, String> datos = new HashMap<>();
        datos.put("nombreCompleto", "Juan Pérez");
        datos.put("correoElectronico", "juan@bpo.com");
        datos.put("numeroEmpleado", "X9Y8Z");
        datos.put("rol", "GESTOR");

        String tokenGestor = JwtUtil.generarToken("2", "GESTOR", "gestor.s1.01", "S1G01");

        ResponseEntity<?> response = empleadoController.registrar("Bearer " + tokenGestor, datos);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void registrar_RolNoValido_DeberiaRetornar400() {
        Map<String, String> datos = new HashMap<>();
        datos.put("nombreCompleto", "Juan Pérez");
        datos.put("correoElectronico", "juan@bpo.com");
        datos.put("numeroEmpleado", "X9Y8Z");
        datos.put("rol", "DIRECTOR");

        ResponseEntity<?> response = empleadoController.registrar(tokenAdmin(), datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void registrar_SinRol_DeberiaRetornar400() {
        Map<String, String> datos = new HashMap<>();
        datos.put("nombreCompleto", "Juan Pérez");
        datos.put("correoElectronico", "juan@bpo.com");
        datos.put("numeroEmpleado", "X9Y8Z");

        ResponseEntity<?> response = empleadoController.registrar(tokenAdmin(), datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void listar_SinToken_DeberiaRetornar401() {
        ResponseEntity<?> response = empleadoController.listar(null, null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void cambiarEstado_DarDeBaja_DeberiaDesactivarYConservarUsuario() {
        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "S1G01");
        datos.put("activo", "false");

        when(empleadoRepository.findByNumeroEmpleado("S1G01")).thenReturn(Optional.of(empleadoGestorMock));
        when(empleadoRepository.findAll()).thenReturn(List.of(empleadoGestorMock));
        when(empleadoRepository.save(any(Empleado.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<?> response = empleadoController.cambiarEstado(tokenAdmin(), datos);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Boolean.FALSE, empleadoGestorMock.getActivo());
        assertEquals("gestor.s1.01", empleadoGestorMock.getUsuario());
    }

    @Test
    void cambiarEstado_SobreSiMismo_DeberiaRetornar400() {
        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "A1B2C");
        datos.put("activo", "false");

        when(empleadoRepository.findByNumeroEmpleado("A1B2C")).thenReturn(Optional.of(empleadoMock));

        ResponseEntity<?> response = empleadoController.cambiarEstado(tokenAdmin(), datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void cambiarEstado_ReactivarSinUsuario_DeberiaRetornar400() {
        empleadoGestorMock.setUsuario(null);

        Map<String, String> datos = new HashMap<>();
        datos.put("numeroEmpleado", "S1G01");
        datos.put("activo", "true");

        when(empleadoRepository.findByNumeroEmpleado("S1G01")).thenReturn(Optional.of(empleadoGestorMock));

        ResponseEntity<?> response = empleadoController.cambiarEstado(tokenAdmin(), datos);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void eliminar_EmpleadoYaRegistrado_DeberiaRetornar400() {
        when(empleadoRepository.findByNumeroEmpleado("S1G01")).thenReturn(Optional.of(empleadoGestorMock));

        ResponseEntity<?> response = empleadoController.eliminar(tokenAdmin(), "S1G01");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void eliminar_AltaPendiente_DeberiaRetornar200() {
        when(empleadoRepository.findByNumeroEmpleado("S1G09")).thenReturn(Optional.of(empleadoPendienteMock));
        when(empleadoRepository.findAll()).thenReturn(List.of(empleadoPendienteMock));
        when(rolCampanaRepository.findAll()).thenReturn(List.of());

        ResponseEntity<?> response = empleadoController.eliminar(tokenAdmin(), "S1G09");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(empleadoRepository).delete(empleadoPendienteMock);
    }

    private String tokenAdmin() {
        return "Bearer " + JwtUtil.generarToken("1", "ADMINISTRADOR", "admin", "A1X2B");
    }
}