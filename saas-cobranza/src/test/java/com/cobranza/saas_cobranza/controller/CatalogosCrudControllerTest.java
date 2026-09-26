package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Campana;
import com.cobranza.saas_cobranza.EmpleadoRol;
import com.cobranza.saas_cobranza.LogAuditoria;
import com.cobranza.saas_cobranza.MotivoNoPago;
import com.cobranza.saas_cobranza.Permiso;
import com.cobranza.saas_cobranza.RolCampana;
import com.cobranza.saas_cobranza.RolPermiso;
import com.cobranza.saas_cobranza.RubroCobro;
import com.cobranza.saas_cobranza.Telefono;
import com.cobranza.saas_cobranza.TipoProducto;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRolRepository;
import com.cobranza.saas_cobranza.repository.LogAuditoriaRepository;
import com.cobranza.saas_cobranza.repository.MotivoNoPagoRepository;
import com.cobranza.saas_cobranza.repository.PermisoRepository;
import com.cobranza.saas_cobranza.repository.RolCampanaRepository;
import com.cobranza.saas_cobranza.repository.RolPermisoRepository;
import com.cobranza.saas_cobranza.repository.RubroCobroRepository;
import com.cobranza.saas_cobranza.repository.TelefonoRepository;
import com.cobranza.saas_cobranza.repository.TipoProductoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Catalogos de solo paso: el controlador no filtra ni valida, solo delega en el
 * repositorio. Se prueban en bloque porque comparten exactamente el mismo
 * comportamiento de listar y crear.
 */
@ExtendWith(MockitoExtension.class)
class CatalogosCrudControllerTest {

    @Mock
    private CampanaRepository campanaRepository;

    @Mock
    private TipoProductoRepository tipoProductoRepository;

    @Mock
    private MotivoNoPagoRepository motivoNoPagoRepository;

    @Mock
    private TelefonoRepository telefonoRepository;

    @Mock
    private RubroCobroRepository rubroCobroRepository;

    @Mock
    private LogAuditoriaRepository logAuditoriaRepository;

    @Mock
    private EmpleadoRolRepository empleadoRolRepository;

    @Mock
    private RolCampanaRepository rolCampanaRepository;

    @Mock
    private RolPermisoRepository rolPermisoRepository;

    @Mock
    private PermisoRepository permisoRepository;

    @InjectMocks
    private CampanaController campanaController;

    @InjectMocks
    private TipoProductoController tipoProductoController;

    @InjectMocks
    private MotivoNoPagoController motivoNoPagoController;

    @InjectMocks
    private TelefonoController telefonoController;

    @InjectMocks
    private RubroCobroController rubroCobroController;

    @InjectMocks
    private LogAuditoriaController logAuditoriaController;

    @InjectMocks
    private EmpleadoRolController empleadoRolController;

    @InjectMocks
    private RolCampanaController rolCampanaController;

    @InjectMocks
    private RolPermisoController rolPermisoController;

    @InjectMocks
    private PermisoController permisoController;

    // ------------------------------------------------------------- campanas

    @Test
    void campana_ListarFiltraPorEmpresa() {
        when(campanaRepository.findByEmpresa_IdEmpresa(3L)).thenReturn(List.of(new Campana()));

        assertEquals(1, campanaController.obtenerTodas(3L).size());
        verify(campanaRepository).findByEmpresa_IdEmpresa(3L);
    }

    @Test
    void campana_ListarSinFiltroDevuelveTodas() {
        when(campanaRepository.findAll()).thenReturn(List.of(new Campana()));

        assertEquals(1, campanaController.obtenerTodas(null).size());
        verify(campanaRepository).findAll();
    }

    @Test
    void campana_CrearGuardaLaCampana() {
        Campana campana = new Campana();
        when(campanaRepository.save(campana)).thenReturn(campana);

        assertSame(campana, campanaController.crearCampana(campana));
        verify(campanaRepository).save(campana);
    }

    // -------------------------------------------------------- tipos de producto

    @Test
    void tipoProducto_ListarFiltraPorEmpresa() {
        when(tipoProductoRepository.findByCampana_Empresa_IdEmpresa(3L))
                .thenReturn(List.of(new TipoProducto()));

        assertEquals(1, tipoProductoController.listarTodos(3L).size());
        verify(tipoProductoRepository).findByCampana_Empresa_IdEmpresa(3L);
    }

    @Test
    void tipoProducto_ListarYcrear() {
        when(tipoProductoRepository.findAll()).thenReturn(List.of(new TipoProducto()));
        TipoProducto tipo = new TipoProducto();
        when(tipoProductoRepository.save(tipo)).thenReturn(tipo);

        assertEquals(1, tipoProductoController.listarTodos(null).size());
        assertSame(tipo, tipoProductoController.crear(tipo));
    }

    // ------------------------------------------------------- motivos de no pago

    @Test
    void motivoNoPago_ListarFiltraPorEmpresa() {
        when(motivoNoPagoRepository.findByCampana_Empresa_IdEmpresa(3L))
                .thenReturn(List.of(new MotivoNoPago()));

        assertEquals(1, motivoNoPagoController.listarTodos(3L).size());
        verify(motivoNoPagoRepository).findByCampana_Empresa_IdEmpresa(3L);
    }

    @Test
    void motivoNoPago_ListarYcrear() {
        when(motivoNoPagoRepository.findAll()).thenReturn(List.of(new MotivoNoPago()));
        MotivoNoPago motivo = new MotivoNoPago();
        when(motivoNoPagoRepository.save(motivo)).thenReturn(motivo);

        assertEquals(1, motivoNoPagoController.listarTodos(null).size());
        assertSame(motivo, motivoNoPagoController.crear(motivo));
    }

    // --------------------------------------------------- catalogos sin filtros

    @Test
    void telefonos_ListarYcrear() {
        Telefono telefono = new Telefono();
        when(telefonoRepository.findAll()).thenReturn(List.of(telefono));
        when(telefonoRepository.save(telefono)).thenReturn(telefono);

        assertEquals(1, telefonoController.listarTodos().size());
        assertSame(telefono, telefonoController.crear(telefono));
    }

    @Test
    void rubrosCobro_ListarYcrear() {
        RubroCobro rubro = new RubroCobro();
        when(rubroCobroRepository.findAll()).thenReturn(List.of(rubro));
        when(rubroCobroRepository.save(rubro)).thenReturn(rubro);

        assertEquals(1, rubroCobroController.listarTodos().size());
        assertSame(rubro, rubroCobroController.crear(rubro));
    }

    @Test
    void auditoria_ListarYcrear() {
        LogAuditoria log = new LogAuditoria();
        when(logAuditoriaRepository.findAll()).thenReturn(List.of(log));
        when(logAuditoriaRepository.save(log)).thenReturn(log);

        assertEquals(1, logAuditoriaController.listarTodos().size());
        assertSame(log, logAuditoriaController.crear(log));
    }

    @Test
    void empleadoRol_ListarYcrear() {
        EmpleadoRol empleadoRol = new EmpleadoRol();
        when(empleadoRolRepository.findAll()).thenReturn(List.of(empleadoRol));
        when(empleadoRolRepository.save(empleadoRol)).thenReturn(empleadoRol);

        assertEquals(1, empleadoRolController.listarTodos().size());
        assertSame(empleadoRol, empleadoRolController.crear(empleadoRol));
    }

    @Test
    void rolCampana_ListarYcrear() {
        RolCampana rol = new RolCampana();
        when(rolCampanaRepository.findAll()).thenReturn(List.of(rol));
        when(rolCampanaRepository.save(rol)).thenReturn(rol);

        assertEquals(1, rolCampanaController.obtenerTodos().size());
        assertSame(rol, rolCampanaController.crearRolCampana(rol));
    }

    @Test
    void rolPermiso_ListarYcrear() {
        RolPermiso rol = new RolPermiso();
        when(rolPermisoRepository.findAll()).thenReturn(List.of(rol));
        when(rolPermisoRepository.save(rol)).thenReturn(rol);

        assertEquals(1, rolPermisoController.listarTodos().size());
        assertSame(rol, rolPermisoController.crear(rol));
    }

    @Test
    void permiso_ListarYcrear() {
        Permiso permiso = new Permiso();
        when(permisoRepository.findAll()).thenReturn(List.of(permiso));
        when(permisoRepository.save(permiso)).thenReturn(permiso);

        assertEquals(1, permisoController.listarTodos().size());
        assertSame(permiso, permisoController.crear(permiso));
    }
}
