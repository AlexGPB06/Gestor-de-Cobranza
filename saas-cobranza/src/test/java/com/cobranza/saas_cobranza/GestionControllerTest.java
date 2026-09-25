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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GestionControllerTest {

    private static final Long ID_GESTOR = 90L;
    private static final Long ID_SUPERVISOR = 80L;

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

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        gestor = new Empleado();
        gestor.setIdEmpleado(ID_GESTOR);
        gestor.setNumeroEmpleado("S1G01");
        gestor.setUsuario("gestor.s1.01");
        gestor.setNombreCompleto("Verónica Castillo");
        gestor.setCorreoElectronico("vcastillo@santander.mx");
        gestor.setRol("GESTOR");
        gestor.setActivo(true);
    }

    private String token(String rol, Long idEmpleado) {
        return "Bearer " + JwtUtil.generarToken(String.valueOf(idEmpleado), rol, "usuario.test", "T0000");
    }

    private Gestion gestionBase() {
        Gestion gestion = new Gestion();
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(1L);
        gestion.setDeuda(deuda);
        gestion.setCodigoResultado("CONTACTO_NO_EXITOSO");
        gestion.setComentarios("Se marco, no contesto");
        return gestion;
    }

    @Test
    void crearGestion_Gestor_DeberiaUsarEmpleadoDelToken() {
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestor));
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(1L);
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda));
        when(gestionRepository.save(any(Gestion.class))).thenAnswer(inv -> inv.getArgument(0));

        Gestion gestion = gestionBase();
        Empleado suplantado = new Empleado();
        suplantado.setIdEmpleado(999L);
        gestion.setEmpleado(suplantado);

        ResponseEntity<?> response = gestionController.crearGestion(token("GESTOR", ID_GESTOR), gestion);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<Gestion> captor = ArgumentCaptor.forClass(Gestion.class);
        verify(gestionRepository).save(captor.capture());
        assertEquals(ID_GESTOR, captor.getValue().getEmpleado().getIdEmpleado());
    }

    @Test
    void crearGestion_Supervisor_DeberiaRetornar403() {
        ResponseEntity<?> response = gestionController.crearGestion(
                token("SUPERVISOR", ID_SUPERVISOR), gestionBase());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("El supervisor solo puede dar de alta metas", response.getBody());
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void crearGestion_SinToken_DeberiaRetornar401() {
        ResponseEntity<?> response = gestionController.crearGestion(null, gestionBase());

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(gestionRepository, never()).save(any(Gestion.class));
    }

    @Test
    void crearGestion_MetaDeCampanaDistinta_DeberiaRetornar400() {
        when(empleadoRepository.findById(ID_GESTOR)).thenReturn(Optional.of(gestor));

        Campana campanaMeta = new Campana();
        campanaMeta.setIdCampana(2L);
        Meta meta = new Meta();
        meta.setIdMeta(5L);
        meta.setCampana(campanaMeta);
        meta.setActivo(true);
        when(metaRepository.findById(5L)).thenReturn(Optional.of(meta));

        Campana campanaDeuda = new Campana();
        campanaDeuda.setIdCampana(1L);
        Deudor deudor = new Deudor();
        deudor.setIdDeudor(1L);
        deudor.setCampana(campanaDeuda);
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(1L);
        deuda.setDeudor(deudor);
        when(deudaRepository.findById(1L)).thenReturn(Optional.of(deuda));

        Gestion gestion = gestionBase();
        gestion.setDeuda(deuda);
        Meta referencia = new Meta();
        referencia.setIdMeta(5L);
        gestion.setMeta(referencia);

        ResponseEntity<?> response = gestionController.crearGestion(token("GESTOR", ID_GESTOR), gestion);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("La meta y la deuda pertenecen a campañas distintas", response.getBody());
        verify(gestionRepository, never()).save(any(Gestion.class));
    }
}
