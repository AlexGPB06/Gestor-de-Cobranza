package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Concepto;
import com.cobranza.saas_cobranza.Empresa;
import com.cobranza.saas_cobranza.repository.ConceptoRepository;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogosControllerTest {

    // ------------------------------------------------------- TipoTicketController

    @Mock
    private com.cobranza.saas_cobranza.repository.TipoTicketRepository tipoTicketRepository;

    @Mock
    private com.cobranza.saas_cobranza.repository.DepartamentoRepository departamentoRepository;

    @InjectMocks
    private TipoTicketController tipoTicketController;

    @Test
    void tipoTicket_ListarFiltraPorEmpresa() {
        when(tipoTicketRepository.findByDepartamento_Empresa_IdEmpresa(3L)).thenReturn(List.of());

        assertEquals(HttpStatus.OK, tipoTicketController.listar(3L).getStatusCode());
        verify(tipoTicketRepository).findByDepartamento_Empresa_IdEmpresa(3L);
    }

    @Test
    void tipoTicket_ListarSinFiltroDevuelveTodos() {
        when(tipoTicketRepository.findAll()).thenReturn(List.of());

        assertEquals(HttpStatus.OK, tipoTicketController.listar(null).getStatusCode());
        verify(tipoTicketRepository).findAll();
    }

    @Test
    void tipoTicket_RegistrarExigeNumeroNombreYDepartamento() {
        var sinNumero = cuerpoTipoTicket("num", "Nombre", null);
        var numeroEnBlanco = cuerpoTipoTicket("  ", "Nombre", 1L);
        var sinNombre = cuerpoTipoTicket("num", null, 1L);
        var nombreEnBlanco = cuerpoTipoTicket("num", "   ", 1L);
        var sinDepartamento = cuerpoTipoTicket("num", "Nombre", null);
        var vacio = cuerpoTipoTicket(null, null, null);

        for (var body : List.of(sinNumero, numeroEnBlanco, sinNombre, nombreEnBlanco,
                sinDepartamento, vacio)) {
            ResponseEntity<?> respuesta = tipoTicketController.registrar(body);
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("Número, nombre y departamento son obligatorios", respuesta.getBody());
        }
        verify(tipoTicketRepository, never()).save(any());
    }

    @Test
    void tipoTicket_DepartamentoInexistenteRespondeBadRequest() {
        when(departamentoRepository.findById(1L)).thenReturn(java.util.Optional.empty());

        ResponseEntity<?> respuesta = tipoTicketController.registrar(cuerpoTipoTicket("num", "Nombre", 1L));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("El departamento indicado no existe", respuesta.getBody());
    }

    @Test
    void tipoTicket_RegistrarNormalizaNumeroYNombre() {
        var departamento = new com.cobranza.saas_cobranza.Departamento();
        departamento.setIdDepartamento(1L);
        when(departamentoRepository.findById(1L)).thenReturn(java.util.Optional.of(departamento));
        when(tipoTicketRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var body = cuerpoTipoTicket("  tt-01 ", "  Llamada  ", 1L);
        body.put("plantilla", "  Hola {{nombre}}  ");

        com.cobranza.saas_cobranza.TipoTicket tipo =
                (com.cobranza.saas_cobranza.TipoTicket) tipoTicketController.registrar(body).getBody();

        assertEquals("TT-01", tipo.getNumero());
        assertEquals("Llamada", tipo.getNombre());
        assertEquals("  Hola {{nombre}}  ", tipo.getPlantilla());
        assertEquals(Boolean.TRUE, tipo.getActivo());
    }

    // ---------------------------------------------------- DepartamentoController

    @Mock
    private EmpresaRepository empresaRepository;

    @InjectMocks
    private DepartamentoController departamentoController;

    @Test
    void departamento_ListarFiltraPorEmpresa() {
        when(departamentoRepository.findByEmpresa_IdEmpresa(3L)).thenReturn(List.of());

        assertEquals(HttpStatus.OK, departamentoController.listar(3L).getStatusCode());
        verify(departamentoRepository).findByEmpresa_IdEmpresa(3L);
    }

    @Test
    void departamento_ListarSinFiltroDevuelveTodos() {
        when(departamentoRepository.findAll()).thenReturn(List.of());

        assertEquals(HttpStatus.OK, departamentoController.listar(null).getStatusCode());
        verify(departamentoRepository).findAll();
    }

    @Test
    void departamento_RegistrarExigeNombreYPrefijo() {
        var sinNombre = cuerpoDepartamento(null, "CO", 1L);
        var nombreEnBlanco = cuerpoDepartamento("  ", "CO", 1L);
        var sinPrefijo = cuerpoDepartamento("Cobranza", null, 1L);
        var prefijoEnBlanco = cuerpoDepartamento("Cobranza", "  ", 1L);

        for (var body : List.of(sinNombre, nombreEnBlanco, sinPrefijo, prefijoEnBlanco)) {
            ResponseEntity<?> respuesta = departamentoController.registrar(body);
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("Nombre y prefijo son obligatorios", respuesta.getBody());
        }
        verify(departamentoRepository, never()).save(any());
    }

    @Test
    void departamento_EmpresaInexistenteRespondeBadRequest() {
        when(empresaRepository.findById(1L)).thenReturn(java.util.Optional.empty());

        ResponseEntity<?> conId = departamentoController.registrar(cuerpoDepartamento("Cobranza", "CO", 1L));
        assertEquals(HttpStatus.BAD_REQUEST, conId.getStatusCode());
        assertEquals("La empresa indicada no existe", conId.getBody());

        ResponseEntity<?> sinId = departamentoController.registrar(cuerpoDepartamento("Cobranza", "CO", null));
        assertEquals(HttpStatus.BAD_REQUEST, sinId.getStatusCode());
        assertEquals("La empresa indicada no existe", sinId.getBody());
    }

    @Test
    void departamento_RegistrarNormalizaElPrefijo() {
        var empresa = new Empresa();
        empresa.setIdEmpresa(1L);
        when(empresaRepository.findById(1L)).thenReturn(java.util.Optional.of(empresa));
        when(departamentoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        com.cobranza.saas_cobranza.Departamento depto =
                (com.cobranza.saas_cobranza.Departamento)
                        departamentoController.registrar(cuerpoDepartamento("  Cobranza  ", "  co  ", 1L)).getBody();

        assertEquals("Cobranza", depto.getNombre());
        assertEquals("CO", depto.getPrefijo());
        assertEquals(empresa, depto.getEmpresa());
        assertEquals(Boolean.TRUE, depto.getActivo());
    }

    // --------------------------------------------------------- EmpresaController

    @InjectMocks
    private EmpresaController empresaController;

    @Test
    void empresa_ListarDevuelveTodas() {
        when(empresaRepository.findAll()).thenReturn(List.of(new Empresa()));

        assertEquals(1, empresaController.listar().size());
    }

    @Test
    void empresa_CrearExigeElNombre() {
        var sinNombre = empresaCon(null, "RFC1");
        var nombreEnBlanco = empresaCon("   ", "RFC1");

        for (var body : List.of(sinNombre, nombreEnBlanco)) {
            ResponseEntity<?> respuesta = empresaController.crear(body);
            assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
            assertEquals("El nombre de la empresa es obligatorio", respuesta.getBody());
        }
        verify(empresaRepository, never()).save(any());
    }

    @Test
    void empresa_CrearRechazaElDuplicadoConConflict() {
        when(empresaRepository.existsByNombre("Acme")).thenReturn(true);

        ResponseEntity<?> respuesta = empresaController.crear(empresaCon("  Acme  ", "RFC1"));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertEquals("La empresa ya existe", respuesta.getBody());
        verify(empresaRepository, never()).save(any());
    }

    @Test
    void empresa_CrearGuardaLaEmpresaActiva() {
        when(empresaRepository.existsByNombre("Acme")).thenReturn(false);
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<?> respuesta = empresaController.crear(empresaCon("  Acme  ", "RFC1"));

        assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
        Empresa empresa = (Empresa) respuesta.getBody();
        assertEquals("Acme", empresa.getNombre());
        assertEquals("RFC1", empresa.getRfc());
        assertEquals(Boolean.TRUE, empresa.getActivo());
    }

    // -------------------------------------------------------- ConceptoController

    @Mock
    private ConceptoRepository conceptoRepository;

    @InjectMocks
    private ConceptoController conceptoController;

    @Test
    void concepto_ListarFiltraPorEmpresa() {
        when(conceptoRepository.findByCampana_Empresa_IdEmpresaAndActivoTrue(3L)).thenReturn(List.of(new Concepto()));

        assertEquals(1, conceptoController.listarTodos(3L).size());
        verify(conceptoRepository).findByCampana_Empresa_IdEmpresaAndActivoTrue(3L);
    }

    @Test
    void concepto_ListarSinFiltroDevuelveTodos() {
        when(conceptoRepository.findAll()).thenReturn(List.of(new Concepto()));

        assertEquals(1, conceptoController.listarTodos(null).size());
        verify(conceptoRepository).findAll();
    }

    @Test
    void concepto_CrearExigeNombreYCategoria() {
        Concepto sinNombre = conceptoCon(null, "PROMESA");
        Concepto nombreEnBlanco = conceptoCon("  ", "PROMESA");
        Concepto sinCategoria = conceptoCon("PROMESA", null);
        Concepto categoriaEnBlanco = conceptoCon("PROMESA", "   ");

        assertEquals(HttpStatus.BAD_REQUEST,
                conceptoController.crear(sinNombre).getStatusCode());
        assertEquals("El nombre del concepto es obligatorio",
                conceptoController.crear(sinNombre).getBody());
        assertEquals(HttpStatus.BAD_REQUEST,
                conceptoController.crear(nombreEnBlanco).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,
                conceptoController.crear(sinCategoria).getStatusCode());
        assertEquals("La categoría del concepto es obligatoria",
                conceptoController.crear(categoriaEnBlanco).getBody());
        verify(conceptoRepository, never()).save(any());
    }

    @Test
    void concepto_CrearGuardaElConcepto() {
        Concepto concepto = conceptoCon("PROMESA", "GESTION");
        when(conceptoRepository.save(concepto)).thenReturn(concepto);

        ResponseEntity<?> respuesta = conceptoController.crear(concepto);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(concepto, respuesta.getBody());
        verify(conceptoRepository).save(concepto);
    }

    // --------------------------------------------------------------- utilidades

    /** Cuerpo de alta de un tipo de ticket: numero, nombre, idDepartamento, plantilla. */
    private static java.util.Map<String, Object> cuerpoTipoTicket(Object numero, Object nombre,
                                                                  Object idDepartamento) {
        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.put("numero", numero);
        body.put("nombre", nombre);
        body.put("idDepartamento", idDepartamento);
        return body;
    }

    /** Cuerpo de alta de un departamento: nombre, prefijo, idEmpresa. */
    private static java.util.Map<String, Object> cuerpoDepartamento(Object nombre, Object prefijo,
                                                                     Object idEmpresa) {
        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.put("nombre", nombre);
        body.put("prefijo", prefijo);
        body.put("idEmpresa", idEmpresa);
        return body;
    }

    private static java.util.Map<String, String> empresaCon(String nombre, String rfc) {
        java.util.Map<String, String> body = new java.util.HashMap<>();
        body.put("nombre", nombre);
        body.put("rfc", rfc);
        return body;
    }

    private static Concepto conceptoCon(String nombre, String categoria) {
        Concepto concepto = new Concepto();
        concepto.setNombreConcepto(nombre);
        concepto.setCategoria(categoria);
        return concepto;
    }
}
