package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.EmpleadoController;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class EmpleadoControllerTest {

    @InjectMocks
    private EmpleadoController empleadoController;

    @Mock
    private EmpleadoRepository empleadoRepository;

    private Empleado empleadoMock;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        empleadoMock = new Empleado();
        empleadoMock.setIdEmpleado(1L);
        empleadoMock.setNombreCompleto("Alex");
        empleadoMock.setContrasenaHash("admin123");
        empleadoMock.setActivo(true);
    }

    @Test
    void login_CredencialesCorrectas_DeberiaRetornarTokenYRol() {
        // Arrange
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("idEmpleado", "1");
        credenciales.put("password", "admin123");
        
        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(empleadoMock));

        // Act
        ResponseEntity<?> response = empleadoController.login(credenciales);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.containsKey("token"));
        assertEquals("ADMINISTRADOR", body.get("rol"));
    }

    @Test
    void login_ContrasenaIncorrecta_DeberiaRetornar401() {
        // Arrange
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("idEmpleado", "1");
        credenciales.put("password", "clave_falsa");
        
        when(empleadoRepository.findById(1L)).thenReturn(Optional.of(empleadoMock));

        // Act
        ResponseEntity<?> response = empleadoController.login(credenciales);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Credenciales inválidas o inactivo", response.getBody());
    }

    @Test
    void login_UsuarioNoEncontrado_DeberiaRetornar404() {
        // Arrange
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("idEmpleado", "99");
        credenciales.put("password", "admin123");
        
        when(empleadoRepository.findById(99L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = empleadoController.login(credenciales);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void login_DatosMalFormateados_DeberiaRetornar400() {
        // Arrange
        Map<String, String> credenciales = new HashMap<>();
        credenciales.put("idEmpleado", "texto_invalido"); // Provocará NumberFormatException
        
        // Act
        ResponseEntity<?> response = empleadoController.login(credenciales);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }
}