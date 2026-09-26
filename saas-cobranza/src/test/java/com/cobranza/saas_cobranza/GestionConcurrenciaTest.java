package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.controller.GestionController;
import com.cobranza.saas_cobranza.controller.MetaController;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.ConceptoRepository;
import com.cobranza.saas_cobranza.repository.DeudaRepository;
import com.cobranza.saas_cobranza.repository.DeudorRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import com.cobranza.saas_cobranza.repository.GestionRepository;
import com.cobranza.saas_cobranza.repository.MetaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "saas.cobranza.semillas=false")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("Concurrencia: dos empleados gestionando al mismo tiempo")
class GestionConcurrenciaTest {

    private static final String SUFIJO = Long.toString(System.nanoTime(), 36).toUpperCase(Locale.ROOT);

    @Autowired
    private GestionController gestionController;

    @Autowired
    private MetaController metaController;

    @Autowired
    private EmpresaRepository empresaRepository;

    @Autowired
    private CampanaRepository campanaRepository;

    @Autowired
    private DeudorRepository deudorRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @Autowired
    private ConceptoRepository conceptoRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private GestionRepository gestionRepository;

    @Autowired
    private MetaRepository metaRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private Long idEmpresa;
    private Long idCampana;
    private Long idDeudor;
    private Long idConceptoPromesa;
    private Long idConceptoContacto;
    private Long idMeta;
    private String tokenGestorA;
    private String tokenGestorB;
    private final List<Long> idsDeuda = new ArrayList<>();

    @BeforeAll
    void prepararEscenario() {
        Empresa empresa = new Empresa();
        empresa.setNombre("EMPRESA_CONC_" + SUFIJO);
        empresa.setRfc("RFC" + SUFIJO);
        empresa.setTipo("PRUEBA_CONCURRENCIA");
        empresa.setActivo(true);
        empresa = empresaRepository.save(empresa);
        idEmpresa = empresa.getIdEmpresa();

        Campana campana = new Campana();
        campana.setEmpresa(empresa);
        campana.setNombreEmpresa(empresa.getNombre());
        campana.setDiasMaximosPromesa(30);
        campana.setActivo(true);
        campana = campanaRepository.save(campana);
        idCampana = campana.getIdCampana();

        Deudor deudor = new Deudor();
        deudor.setCampana(campana);
        deudor.setNombreCompleto("Deudor Concurrencia " + SUFIJO);
        deudor.setDocumentoIdentidad("DNI" + SUFIJO);
        deudor.setTelefonoPrincipal("5550000000");
        deudor.setCorreoElectronico("concurrencia." + SUFIJO.toLowerCase(Locale.ROOT) + "@test.local");
        deudor = deudorRepository.save(deudor);
        idDeudor = deudor.getIdDeudor();

        Concepto conceptoPromesa = new Concepto();
        conceptoPromesa.setCampana(campana);
        conceptoPromesa.setNombreConcepto("Registro de promesa de pago");
        conceptoPromesa.setCategoria("PROMESA");
        conceptoPromesa.setRequiereAutorizacion(false);
        conceptoPromesa.setActivo(true);
        conceptoPromesa = conceptoRepository.save(conceptoPromesa);
        idConceptoPromesa = conceptoPromesa.getIdConcepto();

        Concepto conceptoContacto = new Concepto();
        conceptoContacto.setCampana(campana);
        conceptoContacto.setNombreConcepto("Contacto telefonico");
        conceptoContacto.setCategoria("CONTACTO");
        conceptoContacto.setRequiereAutorizacion(false);
        conceptoContacto.setActivo(true);
        conceptoContacto = conceptoRepository.save(conceptoContacto);
        idConceptoContacto = conceptoContacto.getIdConcepto();

        tokenGestorA = tokenDeGestor("A", "Gestor Concurrencia A");
        tokenGestorB = tokenDeGestor("B", "Gestor Concurrencia B");

        Meta meta = new Meta();
        meta.setDescripcion("Meta de prueba de concurrencia");
        meta.setCampana(campana);
        meta.setSupervisor(empleadoRepository.findById(empleadoDeSupervisor()).orElseThrow());
        meta.setPeriodo("MENSUAL");
        meta.setObjetivoGestiones(10);
        meta.setObjetivoMonto(new BigDecimal("50000.00"));
        meta.setFechaInicio(LocalDate.now().minusDays(5));
        meta.setFechaFin(LocalDate.now().plusDays(25));
        meta.setActivo(true);
        idMeta = metaRepository.save(meta).getIdMeta();

        for (int i = 1; i <= 10; i++) {
            Deuda deuda = new Deuda();
            deuda.setDeudor(deudor);
            deuda.setNumeroCuenta("CTA" + SUFIJO + i);
            deuda.setMontoOriginal(new BigDecimal("10000.00"));
            deuda.setSaldoPendiente(new BigDecimal("10000.00"));
            deuda.setFechaVencimiento(LocalDate.now().minusDays(30));
            deuda.setEstado("PENDIENTE");
            idsDeuda.add(deudaRepository.save(deuda).getIdDeuda());
        }
    }

    private Long empleadoDeSupervisor() {
        Empleado supervisor = new Empleado();
        supervisor.setNumeroEmpleado(("SU" + SUFIJO).substring(0, 5));
        supervisor.setUsuario("conc.sup." + SUFIJO);
        supervisor.setNombreCompleto("Supervisor Concurrencia");
        supervisor.setCorreoElectronico("conc.sup." + SUFIJO.toLowerCase(Locale.ROOT) + "@test.local");
        supervisor.setRol("SUPERVISOR");
        supervisor.setActivo(true);
        return empleadoRepository.save(supervisor).getIdEmpleado();
    }

    private String tokenDeGestor(String letra, String nombre) {
        Empleado gestor = new Empleado();
        gestor.setNumeroEmpleado(("G" + letra + SUFIJO).substring(0, 5));
        gestor.setUsuario("conc.gestor." + letra.toLowerCase(Locale.ROOT) + "." + SUFIJO);
        gestor.setNombreCompleto(nombre);
        gestor.setCorreoElectronico("conc.gestor." + letra.toLowerCase(Locale.ROOT) + "."
                + SUFIJO.toLowerCase(Locale.ROOT) + "@test.local");
        gestor.setRol("GESTOR");
        gestor.setActivo(true);
        gestor = empleadoRepository.save(gestor);
        return "Bearer " + JwtUtil.generarToken(String.valueOf(gestor.getIdEmpleado()), "GESTOR",
                gestor.getUsuario(), gestor.getNumeroEmpleado());
    }

    private Gestion promesa(Long idDeuda, BigDecimal monto) {
        Gestion gestion = new Gestion();
        gestion.setDeuda(deuda(idDeuda));
        gestion.setConcepto(concepto(idConceptoPromesa));
        gestion.setCodigoResultado("PROMESA");
        gestion.setFechaPromesa(LocalDate.now().plusDays(7));
        gestion.setMontoPromesa(monto);
        return gestion;
    }

    private Gestion contacto(Long idDeuda, Long idMetaUsada) {
        Gestion gestion = new Gestion();
        gestion.setDeuda(deuda(idDeuda));
        gestion.setConcepto(concepto(idConceptoContacto));
        gestion.setCodigoResultado("CONTACTO");
        if (idMetaUsada != null) {
            Meta meta = new Meta();
            meta.setIdMeta(idMetaUsada);
            gestion.setMeta(meta);
        }
        return gestion;
    }

    private Deuda deuda(Long idDeuda) {
        Deuda deuda = new Deuda();
        deuda.setIdDeuda(idDeuda);
        return deuda;
    }

    private Concepto concepto(Long idConcepto) {
        Concepto concepto = new Concepto();
        concepto.setIdConcepto(idConcepto);
        return concepto;
    }

    private List<ResponseEntity<?>> enParalelo(Callable<ResponseEntity<?>> primera,
                                               Callable<ResponseEntity<?>> segunda) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CyclicBarrier barrera = new CyclicBarrier(2);
        try {
            Future<ResponseEntity<?>> f1 = pool.submit(() -> {
                barrera.await(15, TimeUnit.SECONDS);
                return primera.call();
            });
            Future<ResponseEntity<?>> f2 = pool.submit(() -> {
                barrera.await(15, TimeUnit.SECONDS);
                return segunda.call();
            });
            return List.of(f1.get(90, TimeUnit.SECONDS), f2.get(90, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }

    private long promesasVigentes(Long idDeuda) {
        return gestionRepository.findByDeuda_IdDeudaAndFechaPromesaGreaterThanEqual(idDeuda, LocalDate.now())
                .stream()
                .filter(g -> g.getConcepto() != null
                        && g.getConcepto().getCategoria() != null
                        && g.getConcepto().getCategoria().toLowerCase(Locale.ROOT).contains("promesa"))
                .count();
    }

    @Test
    @DisplayName("Dos gestores no pueden dejar dos promesas vigentes en la misma deuda")
    void dosGestoresNoDejanDosPromesasVigentes() throws Exception {
        for (int ronda = 0; ronda < 5; ronda++) {
            Long idDeuda = idsDeuda.get(ronda);

            List<ResponseEntity<?>> respuestas = enParalelo(
                    () -> gestionController.crearGestion(tokenGestorA, promesa(idDeuda, new BigDecimal("2500.00"))),
                    () -> gestionController.crearGestion(tokenGestorB, promesa(idDeuda, new BigDecimal("3000.00"))));

            long aceptadas = respuestas.stream()
                    .filter(r -> r.getStatusCode().value() == HttpStatus.OK.value()).count();
            List<ResponseEntity<?>> rechazadas = respuestas.stream()
                    .filter(r -> r.getStatusCode().value() == HttpStatus.BAD_REQUEST.value()).toList();

            assertEquals(1, aceptadas,
                    "En la ronda " + ronda + " solo un gestor debe poder registrar la promesa vigente");
            assertEquals(1, rechazadas.size(),
                    "En la ronda " + ronda + " el segundo gestor debe recibir 400");
            assertTrue(String.valueOf(rechazadas.get(0).getBody()).contains("Ya existe una promesa vigente"),
                    "El mensaje debe explicar que ya hay una promesa vigente");
            assertEquals(1, promesasVigentes(idDeuda),
                    "En la ronda " + ronda + " la deuda debe quedar con una sola promesa vigente");
        }
    }

    @Test
    @DisplayName("Dos gestores si pueden gestionar la misma deuda al mismo tiempo si no es promesa")
    void dosGestoresSiPuedenGestionarEnParalelo() throws Exception {
        Long idDeuda = idsDeuda.get(5);

        List<ResponseEntity<?>> respuestas = enParalelo(
                () -> gestionController.crearGestion(tokenGestorA, contacto(idDeuda, null)),
                () -> gestionController.crearGestion(tokenGestorB, contacto(idDeuda, null)));

        assertEquals(2, respuestas.stream().filter(r -> r.getStatusCode().value() == HttpStatus.OK.value()).count(),
                "Las dos gestiones de contacto deben guardarse");
        assertEquals(2, gestionRepository.countByDeuda_IdDeuda(idDeuda),
                "Deben quedar las dos gestures registradas en la base");

        Set<Long> empleados = new HashSet<>();
        for (Gestion g : gestionRepository.findByDeuda_IdDeuda(idDeuda)) {
            assertNotNull(g.getEmpleado(), "La gestion debe quedar con empleado");
            empleados.add(g.getEmpleado().getIdEmpleado());
        }
        assertEquals(2, empleados.size(), "Cada gestion debe quedar a nombre del gestor que la registro");
    }

    @Test
    @DisplayName("El progreso de la meta suma las gestiones simultaneas de dos gestores distintos")
    void elProgresoDeLaMetaSumaLasGestionesSimultaneas() throws Exception {
        Long idDeudaA = idsDeuda.get(6);
        Long idDeudaB = idsDeuda.get(7);

        List<ResponseEntity<?>> respuestas = enParalelo(
                () -> gestionController.crearGestion(tokenGestorA, contacto(idDeudaA, idMeta)),
                () -> gestionController.crearGestion(tokenGestorB, contacto(idDeudaB, idMeta)));

        assertEquals(2, respuestas.stream().filter(r -> r.getStatusCode().value() == HttpStatus.OK.value()).count(),
                "Los dos gestores deben poder reportar contra la misma meta");

        ResponseEntity<?> progreso = metaController.progreso(tokenGestorA, idMeta);
        assertEquals(HttpStatus.OK, progreso.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> datos = (Map<String, Object>) progreso.getBody();
        assertNotNull(datos);
        assertEquals(2, datos.get("totalGestiones"), "La meta debe contar las dos gestiones simultaneas");
        assertEquals(2, datos.get("gestoresParticipantes"), "Deben participar los dos gestores");
    }

    private Callable<String> asentarPago(TransactionTemplate tx, CyclicBarrier barrera,
                                          Long idGestion, BigDecimal monto) {
        return () -> tx.execute(estado -> {
            Gestion gestion = gestionRepository.findById(idGestion).orElseThrow();
            try {
                barrera.await(15, TimeUnit.SECONDS);
            } catch (Exception e) {
                throw new IllegalStateException("No se pudo sincronizar la carrera de montos", e);
            }
            gestion.setMontoPagado(monto);
            gestionRepository.saveAndFlush(gestion);
            return "ok";
        });
    }

    @Test
    @DisplayName("Dos actualizaciones simultaneas del monto pagado no se pisan en silencio")
    void dosUsuariosNoPisanElMontoPagadoDeLaMismaGestion() throws Exception {
        Long idDeuda = idsDeuda.get(8);

        ResponseEntity<?> creada = gestionController.crearGestion(tokenGestorA, contacto(idDeuda, null));
        assertEquals(HttpStatus.OK, creada.getStatusCode());
        Long idGestion = ((Gestion) creada.getBody()).getIdGestion();

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        CyclicBarrier barrera = new CyclicBarrier(2);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<String> f1 = pool.submit(asentarPago(tx, barrera, idGestion, new BigDecimal("1000.00")));
            Future<String> f2 = pool.submit(asentarPago(tx, barrera, idGestion, new BigDecimal("2000.00")));

            int exitos = 0;
            int conflictos = 0;
            for (Future<String> f : List.of(f1, f2)) {
                try {
                    if ("ok".equals(f.get(60, TimeUnit.SECONDS))) {
                        exitos++;
                    }
                } catch (ExecutionException e) {
                    if (e.getCause() instanceof OptimisticLockingFailureException) {
                        conflictos++;
                    } else {
                        throw e;
                    }
                }
            }

            assertEquals(1, exitos, "Solo un usuario debe poder asentar el monto pagado");
            assertEquals(1, conflictos,
                    "El segundo usuario debe recibir un conflicto de version y no perder el cambio en silencio");

            BigDecimal montoFinal = gestionRepository.findById(idGestion).orElseThrow().getMontoPagado();
            assertTrue(List.of(new BigDecimal("1000.00"), new BigDecimal("2000.00")).contains(montoFinal),
                    "El monto final debe ser exactamente uno de los dos montos, nunca una mezcla");
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("Un conflicto de actualizacion simultanea se responde con 409")
    void elConflictoDeVersionSeRespondeCon409() {
        ResponseEntity<?> respuesta = gestionController.manejarActualizacionSimultanea(
                new ObjectOptimisticLockingFailureException(Gestion.class, 1L));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertTrue(String.valueOf(respuesta.getBody()).contains("al mismo tiempo"));
    }

    @Test
    @DisplayName("El monto pagado no puede superar el monto prometido")
    void elMontoPagadoNoPuedeSuperarLaPromesa() {
        Long idDeuda = idsDeuda.get(9);

        ResponseEntity<?> promesaCreada = gestionController.crearGestion(
                tokenGestorA, promesa(idDeuda, new BigDecimal("1000.00")));
        assertEquals(HttpStatus.OK, promesaCreada.getStatusCode());
        Long idGestion = ((Gestion) promesaCreada.getBody()).getIdGestion();

        ResponseEntity<?> excedido = gestionController.actualizarMontoPagado(tokenGestorA,
                idGestion, Map.of("montoPagado", "1500.00"));
        assertEquals(HttpStatus.BAD_REQUEST, excedido.getStatusCode());
        assertTrue(String.valueOf(excedido.getBody()).contains("no puede superar el monto prometido"));

        ResponseEntity<?> negativo = gestionController.actualizarMontoPagado(tokenGestorA,
                idGestion, Map.of("montoPagado", "-50.00"));
        assertEquals(HttpStatus.BAD_REQUEST, negativo.getStatusCode());

        ResponseEntity<?> valido = gestionController.actualizarMontoPagado(tokenGestorA,
                idGestion, Map.of("montoPagado", "1000.00"));
        assertEquals(HttpStatus.OK, valido.getStatusCode());
    }

    @AfterAll
    void limpiarEscenario() {
        if (idEmpresa != null) {
            for (Gestion gestion : gestionRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(idEmpresa)) {
                gestionRepository.delete(gestion);
            }
        }
        if (idMeta != null) {
            metaRepository.deleteById(idMeta);
        }
        for (Long idDeuda : idsDeuda) {
            deudaRepository.deleteById(idDeuda);
        }
        if (idDeudor != null) {
            deudorRepository.deleteById(idDeudor);
        }
        if (idConceptoPromesa != null) {
            conceptoRepository.deleteById(idConceptoPromesa);
        }
        if (idConceptoContacto != null) {
            conceptoRepository.deleteById(idConceptoContacto);
        }
        if (idCampana != null) {
            campanaRepository.deleteById(idCampana);
        }
        List<Empleado> empleados = new ArrayList<>();
        empleadoRepository.findAll().stream()
                .filter(e -> e.getUsuario() != null && e.getUsuario().contains("conc."))
                .forEach(empleados::add);
        empleadoRepository.deleteAll(empleados);
        if (idEmpresa != null) {
            empresaRepository.deleteById(idEmpresa);
        }
    }
}
