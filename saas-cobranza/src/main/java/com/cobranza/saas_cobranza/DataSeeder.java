package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.repository.*;
import com.cobranza.saas_cobranza.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "saas.cobranza.semillas", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private TipoPromesaRepository tipoPromesaRepository;

    @Autowired
    private DepartamentoRepository departamentoRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private EmpresaRepository empresaRepository;

    @Autowired
    private CampanaRepository campanaRepository;

    @Autowired
    private ConceptoRepository conceptoRepository;

    @Autowired
    private TipoTicketRepository tipoTicketRepository;

    @Autowired
    private RolCampanaRepository rolCampanaRepository;

    @Autowired
    private DeudorRepository deudorRepository;

    @Autowired
    private DeudaRepository deudaRepository;

    @Autowired
    private AsignacionCarteraRepository asignacionCarteraRepository;

    @Autowired
    private TipoProductoRepository tipoProductoRepository;

    @Override
    @Transactional
    public void run(String... args) {
        semillasTiposPromesa();
        semillasDepartamentos();
        asignarCobranzaAEmpleados();
        semillasPersonalOperativo();
        semillasSupervisoresYEquipos();
        semillasTiposTicket();
        desactivarConceptosPromocionesConvenio();
        semillasCarterasSupervisadas();
        semillasRoles();
    }

    private void semillasTiposPromesa() {
        for (TipoPromesa tp : tipoPromesaRepository.findAll()) {
            if ("Promoción (Descuento)".equalsIgnoreCase(tp.getNombre())) {
                tp.setNombre("Promoción");
                tipoPromesaRepository.save(tp);
            }
        }
        Map<String, List<String>> porTipo = new HashMap<>();
        porTipo.put("BANCO", Arrays.asList("Pago Total", "Parcialidad", "Promoción", "Convenio"));
        porTipo.put("FINANCIERA", Arrays.asList("Pago Total", "Parcialidad", "Promoción", "Convenio"));
        porTipo.put("ASEGURADORA", Arrays.asList("Pago Total", "Parcialidad", "Convenio", "Promoción", "Adelanto de Mensualidades"));

        for (Empresa empresa : empresaRepository.findAll()) {
            String tipoEmpresa = empresa.getTipo() == null ? "FINANCIERA" : empresa.getTipo();
            List<String> nombres = porTipo.getOrDefault(tipoEmpresa, porTipo.get("FINANCIERA"));
            for (Campana campana : campanaRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa())) {
                for (String nombre : nombres) {
                    boolean existe = tipoPromesaRepository.findByCampana_Empresa_IdEmpresa(empresa.getIdEmpresa())
                            .stream().anyMatch(t -> t.getCampana().getIdCampana().equals(campana.getIdCampana())
                                    && t.getNombre().equalsIgnoreCase(nombre));
                    if (existe) {
                        continue;
                    }
                    TipoPromesa tipo = new TipoPromesa();
                    tipo.setCampana(campana);
                    tipo.setNombre(nombre);
                    tipo.setActivo(true);
                    tipoPromesaRepository.save(tipo);
                }
            }
        }
    }

    private void semillasDepartamentos() {
        List<String[]> deptos = Arrays.asList(
                new String[]{"Cobranza", "COB"},
                new String[]{"Seguros", "SEG"},
                new String[]{"Atención", "ATE"},
                new String[]{"Servicio", "SER"},
                new String[]{"Auditoría", "AUD"}
        );
        for (Empresa empresa : empresaRepository.findAll()) {
            for (String[] d : deptos) {
                boolean existe = departamentoRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa())
                        .stream().anyMatch(x -> x.getNombre().equalsIgnoreCase(d[0]));
                if (existe) {
                    continue;
                }
                Departamento depto = new Departamento();
                depto.setEmpresa(empresa);
                depto.setNombre(d[0]);
                depto.setPrefijo(d[1]);
                depto.setActivo(true);
                departamentoRepository.save(depto);
            }
        }
    }

    private void asignarCobranzaAEmpleados() {
        for (Empleado empleado : empleadoRepository.findAll()) {
            if (empleado.getDepartamento() != null || empleado.getEmpresa() == null) {
                continue;
            }
            Departamento cobranza = departamentoRepository.findByEmpresa_IdEmpresa(empleado.getEmpresa().getIdEmpresa())
                    .stream().filter(d -> d.getNombre().equalsIgnoreCase("Cobranza"))
                    .findFirst().orElse(null);
            if (cobranza == null) {
                continue;
            }
            empleado.setDepartamento(cobranza);
            empleadoRepository.save(empleado);
        }
    }

    private void semillasPersonalOperativo() {
        List<String[]> staff = Arrays.asList(
                new String[]{"1", "S1SEG", "Sofía Calderón", "santander.seguros", "seguros.santander@santander.mx", "Seguros", "ANALISTA"},
                new String[]{"1", "A1ATE", "Andrea Molina", "santander.atencion", "atencion.santander@santander.mx", "Atención", "ANALISTA"},
                new String[]{"1", "S1SER", "Sergio Vela", "santander.servicio", "servicio.santander@santander.mx", "Servicio", "ANALISTA"},
                new String[]{"2", "A2ATE", "Alejandra Peña", "crediplus.atencion", "atencion.crediplus@crediplus.mx", "Atención", "ANALISTA"},
                new String[]{"2", "S2SER", "Silvia Ramos", "crediplus.servicio", "servicio.crediplus@crediplus.mx", "Servicio", "ANALISTA"},
                new String[]{"3", "S3SEG", "Daniela Ortiz", "proteccionmx.seguros", "seguros.proteccionmx@proteccionmx.mx", "Seguros", "ANALISTA"},
                new String[]{"3", "A3ATE", "Rodrigo Luna", "proteccionmx.atencion", "atencion.proteccionmx@proteccionmx.mx", "Atención", "ANALISTA"},
                new String[]{"3", "S3SER", "Gabriela Soto", "proteccionmx.servicio", "servicio.proteccionmx@proteccionmx.mx", "Servicio", "ANALISTA"},
                new String[]{"1", "A1AUD", "Armando Díaz", "santander.auditoria", "auditoria.santander@santander.mx", "Auditoría", "AUDITOR"},
                new String[]{"2", "A2AUD", "Alma Reyes", "crediplus.auditoria", "auditoria.crediplus@crediplus.mx", "Auditoría", "AUDITOR"},
                new String[]{"3", "A3AUD", "Ángel Cruz", "proteccionmx.auditoria", "auditoria.proteccionmx@proteccionmx.mx", "Auditoría", "AUDITOR"},
                new String[]{"1", "C6COB", "Carmen Ríos", "santander.cobranza.carmen", "carmena.santander@santander.mx", "Cobranza", "GESTOR"},
                new String[]{"1", "C7COB", "Jorge Castillo", "santander.cobranza.jorge", "jorgec.santander@santander.mx", "Cobranza", "SUPERVISOR"},
                new String[]{"1", "S6SEG", "Beatriz Núñez", "santander.seguros.beatriz", "beatriz.santander@santander.mx", "Seguros", "GERENTE"},
                new String[]{"1", "S7SEG", "Héctor Prado", "santander.seguros.hector", "hector.santander@santander.mx", "Seguros", "ANALISTA"},
                new String[]{"1", "A6ATE", "Elena Vargas", "santander.atencion.elena", "elena.santander@santander.mx", "Atención", "SUPERVISOR"},
                new String[]{"1", "S6SER", "Fabián Cortés", "santander.servicio.fabian", "fabian.santander@santander.mx", "Servicio", "ANALISTA"},
                new String[]{"1", "A6AUD", "Ivonne Salas", "santander.auditoria.ivonne", "ivonne.santander@santander.mx", "Auditoría", "AUDITOR"},
                new String[]{"1", "A7AUD", "Néstor Rivas", "santander.auditoria.nestor", "nestor.santander@santander.mx", "Auditoría", "SUPERVISOR"}
        );
        Map<String, Departamento> deptosByIdEmpresa = new HashMap<>();
        for (Empresa empresa : empresaRepository.findAll()) {
            for (Departamento d : departamentoRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa())) {
                deptosByIdEmpresa.put(empresa.getIdEmpresa() + "-" + d.getNombre().toLowerCase(), d);
            }
        }
        for (String[] s : staff) {
            Long idEmpresa = Long.parseLong(s[0]);
            String numero = s[1];
            String nombre = s[2];
            String usuario = s[3];
            String correo = s[4];
            String deptoNombre = s[5];
            String rol = s[6].toUpperCase();
            if (empleadoRepository.existsByUsuario(usuario) || empleadoRepository.existsByNumeroEmpleado(numero)) {
                continue;
            }
            Departamento depto = deptosByIdEmpresa.get(idEmpresa + "-" + deptoNombre.toLowerCase());
            if (depto == null) {
                continue;
            }
            Empleado emp = new Empleado();
            emp.setNumeroEmpleado(numero);
            emp.setNombreCompleto(nombre);
            emp.setUsuario(usuario);
            emp.setCorreoElectronico(correo);
            emp.setRol(rol);
            emp.setActivo(true);
            emp.setContrasenaHash(PasswordUtil.hash("Operativo123"));
            emp.setFechaCreacion(LocalDateTime.now());
            emp.setDepartamento(depto);
            emp.setEmpresa(depto.getEmpresa());
            empleadoRepository.save(emp);
        }
    }

    private void semillasRoles() {
        for (Empleado empleado : empleadoRepository.findAll()) {
            if (empleado.getEmpresa() == null || empleado.getRol() == null || empleado.getRol().isBlank()) {
                continue;
            }
            String rol = empleado.getRol().toUpperCase();
            for (Campana campana : campanaRepository.findByEmpresa_IdEmpresa(empleado.getEmpresa().getIdEmpresa())) {
                boolean existe = rolCampanaRepository.findAll().stream().anyMatch(r ->
                        r.getEmpleado().getIdEmpleado().equals(empleado.getIdEmpleado())
                                && r.getCampana().getIdCampana().equals(campana.getIdCampana())
                                && r.getRol().equalsIgnoreCase(rol));
                if (existe) {
                    continue;
                }
                RolCampana rc = new RolCampana();
                rc.setEmpleado(empleado);
                rc.setCampana(campana);
                rc.setRol(rol);
                rc.setActivo(true);
                rolCampanaRepository.save(rc);
            }
        }
    }

    private void desactivarConceptosPromocionesConvenio() {
        List<Concepto> conceptos = conceptoRepository.findAll();
        for (Concepto c : conceptos) {
            String nom = c.getNombreConcepto() == null ? "" : c.getNombreConcepto().toLowerCase();
            if (nom.contains("promoción de pago") || nom.contains("promocion de pago") || nom.contains("convenio de pago")) {
                c.setActivo(false);
                conceptoRepository.save(c);
            }
        }
    }

    private void semillasTiposTicket() {
        for (Departamento depto : departamentoRepository.findAll()) {
            List<String[]> filas = plantillasDeDepto(depto.getNombre());
            if (filas == null) {
                continue;
            }
            for (String[] f : filas) {
                boolean existe = tipoTicketRepository.findByDepartamento_Empresa_IdEmpresa(depto.getEmpresa().getIdEmpresa())
                        .stream().anyMatch(t -> t.getNumero().equals(f[0]));
                if (existe) {
                    continue;
                }
                TipoTicket tipo = new TipoTicket();
                tipo.setDepartamento(depto);
                tipo.setNumero(f[0]);
                tipo.setNombre(f[1]);
                tipo.setPlantilla(f[2]);
                tipo.setActivo(true);
                tipoTicketRepository.save(tipo);
            }
        }
    }

    private List<String[]> plantillasDeDepto(String nombre) {
        switch (nombre.toLowerCase()) {
            case "auditoría":
            case "auditoria":
                return Arrays.asList(
                        new String[]{"253", "Liquidación", "Ticket de LIQUIDACIÓN. Se solicita a Auditoría validar el cálculo de liquidación para el cliente [CLIENTE] con la cuenta [CUENTA] y saldo [SALDO]."},
                        new String[]{"110", "Desglose de Saldo", "Ticket de DESGLOSE DE SALDO. Se solicita a Auditoría remitir el desglose de capital, intereses y moratorios del cliente [CLIENTE], cuenta [CUENTA], saldo [SALDO]."},
                        new String[]{"150", "Condonación de Intereses", "Ticket de CONDONACIÓN DE INTERESES. Se solicita a Auditoría validar la condonación de intereses/mora para el cliente [CLIENTE], cuenta [CUENTA], por [MONTO]."},
                        new String[]{"118", "Aprobación de Promoción", "Ticket de APROBACIÓN DE PROMOCIÓN. Se solicita a Auditoría la aprobación de la promoción para [CLIENTE], cuenta [CUENTA], saldo [SALDO], para ponerse al corriente."},
                        new String[]{"262", "Aclaración de Adendo", "Ticket de ACLARACIÓN DE ADENDO. Se solicita a Auditoría revisar el adendo del cliente [CLIENTE], cuenta [CUENTA]."}
                );
            case "seguros":
                return Arrays.asList(
                        new String[]{"301", "Validación de Póliza", "Ticket de VALIDACIÓN DE PÓLIZA. Se solicita a Seguros confirmar la cobertura vigente del cliente [CLIENTE], cuenta [CUENTA]."},
                        new String[]{"305", "Siniestro / Robo", "Ticket de SINIESTRO. Se solicita a Seguros atender el reporte del cliente [CLIENTE], cuenta [CUENTA]."}
                );
            case "atención":
            case "atencion":
                return Arrays.asList(
                        new String[]{"450", "Actualización de Datos", "Ticket de ACTUALIZACIÓN DE DATOS. Se solicita a Atención actualizar la información de contacto del cliente [CLIENTE], cuenta [CUENTA]."},
                        new String[]{"460", "Reclamo del Cliente", "Ticket de RECLAMO. El cliente [CLIENTE], cuenta [CUENTA], presenta el siguiente reclamo:"}
                );
            case "servicio":
                return Arrays.asList(
                        new String[]{"570", "Aclaración de Cobro", "Ticket de ACLARACIÓN DE COBRO. Se solicita a Servicio revisar los pagos aplicados y el vencimiento del cliente [CLIENTE], cuenta [CUENTA]."},
                        new String[]{"580", "Duplicado de Estado de Cuenta", "Ticket de DUPLICADO DE ESTADO DE CUENTA. Se solicita a Servicio enviar el estado de cuenta al cliente [CLIENTE], cuenta [CUENTA]."}
                );
            default:
                return null;
        }
    }

    // ===== SUPERVISORES, EQUIPOS Y CARTERAS =====

    private void semillasSupervisoresYEquipos() {
        String[][] supervisores = {
                {"S1SUP", "María Teresa Gil", "supervisor.s1", "supervisor1.cobranza@santander.mx"},
                {"S2SUP", "Ricardo Mendoza", "supervisor.s2", "supervisor2.cobranza@santander.mx"},
                {"S3SUP", "Lorena Aguilar", "supervisor.s3", "supervisor3.cobranza@santander.mx"}
        };
        Empresa empresa = empresaRepository.findById(1L).orElse(null);
        if (empresa == null) {
            return;
        }
        Departamento cobranza = departamentoRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa())
                .stream().filter(d -> d.getNombre().equalsIgnoreCase("Cobranza"))
                .findFirst().orElse(null);
        if (cobranza == null) {
            return;
        }
        Map<Integer, Empleado> supervisoresCreados = new HashMap<>();
        for (int i = 0; i < supervisores.length; i++) {
            String numero = supervisores[i][0];
            if (empleadoRepository.existsByNumeroEmpleado(numero) || empleadoRepository.existsByUsuario(supervisores[i][2])) {
                Empleado existente = empleadoRepository.findByNumeroEmpleado(numero).orElse(null);
                if (existente != null) {
                    supervisoresCreados.put(i + 1, existente);
                }
                continue;
            }
            Empleado sup = new Empleado();
            sup.setNumeroEmpleado(numero);
            sup.setNombreCompleto(supervisores[i][1]);
            sup.setUsuario(supervisores[i][2]);
            sup.setCorreoElectronico(supervisores[i][3]);
            sup.setRol("SUPERVISOR");
            sup.setActivo(true);
            sup.setContrasenaHash(PasswordUtil.hash("Operativo123"));
            sup.setFechaCreacion(LocalDateTime.now());
            sup.setDepartamento(cobranza);
            sup.setEmpresa(empresa);
            supervisoresCreados.put(i + 1, empleadoRepository.save(sup));
        }

        for (int s = 1; s <= 3; s++) {
            Empleado supervisor = supervisoresCreados.get(s);
            if (supervisor == null) {
                continue;
            }
            for (int g = 1; g <= 10; g++) {
                String numero = String.format("S%dG%02d", s, g);
                String usuario = String.format("gestor.s%d.%02d", s, g);
                if (empleadoRepository.existsByNumeroEmpleado(numero) || empleadoRepository.existsByUsuario(usuario)) {
                    continue;
                }
                Empleado gestor = new Empleado();
                gestor.setNumeroEmpleado(numero);
                gestor.setNombreCompleto(generarNombreGestor(s, g));
                gestor.setUsuario(usuario);
                gestor.setCorreoElectronico(String.format("gestor.s%d.%02d@santander.mx", s, g));
                gestor.setRol("GESTOR");
                gestor.setActivo(true);
                gestor.setContrasenaHash(PasswordUtil.hash("Operativo123"));
                gestor.setFechaCreacion(LocalDateTime.now());
                gestor.setDepartamento(cobranza);
                gestor.setEmpresa(empresa);
                gestor.setSupervisor(supervisor);
                empleadoRepository.save(gestor);
            }
        }
    }

    private String generarNombreGestor(int s, int g) {
        String[] nombres = {"Carlos", "Verónica", "Miguel", "Rosa", "Luis", "Daniela", "Fernando", "Karina", "Oscar", "Paola"};
        String[] apellidos = {"Torres", "Ramírez", "Vargas", "Mora", "Castillo", "Núñez", "Rojas", "Salinas", "Ortega", "Mejía"};
        return nombres[(s * 10 + g) % 10] + " " + apellidos[(s * 3 + g) % 10] + " " + apellidos[(g * 2) % 10];
    }

    private void semillasCarterasSupervisadas() {
        List<Empleado> gestores = empleadoRepository.findByEmpresa_IdEmpresa(1L).stream()
                .filter(e -> e.getRol() != null && e.getRol().equalsIgnoreCase("GESTOR")
                        && e.getNumeroEmpleado() != null && e.getNumeroEmpleado().matches("S\\dG\\d\\d"))
                .toList();
        if (gestores.isEmpty()) {
            return;
        }

        limpiarProductosMixtos();

        int contador = 1;
        for (Empleado gestor : gestores) {
            for (int k = 1; k <= 105; k++) {
                contador = crearCuentaTDC(gestor.getEmpresa(), gestor.getNumeroEmpleado(), k, contador, gestor);
            }
        }

        // Asegurar que NO queden cuentas sin asignar: todo se reparte a los gestores del equipo.
        List<Deuda> todas = deudaRepository.findByDeudor_Campana_Empresa_IdEmpresa(gestores.get(0).getEmpresa().getIdEmpresa());
        Set<Long> activas = asignacionCarteraRepository.findByDeuda_Deudor_Campana_Empresa_IdEmpresa(gestores.get(0).getEmpresa().getIdEmpresa()).stream()
                .filter(a -> Boolean.TRUE.equals(a.getEstatusActiva()))
                .map(a -> a.getDeuda().getIdDeuda())
                .collect(Collectors.toSet());
        int idx = 0;
        for (Deuda deuda : todas) {
            if (activas.contains(deuda.getIdDeuda())) {
                continue;
            }
            Empleado gestor = gestores.get(idx % gestores.size());
            AsignacionCartera asignacion = new AsignacionCartera();
            asignacion.setDeuda(deuda);
            asignacion.setEmpleado(gestor);
            asignacion.setFechaAsignacion(LocalDate.now());
            asignacion.setEstatusActiva(true);
            asignacionCarteraRepository.save(asignacion);
            idx++;
        }
    }

    private void limpiarProductosMixtos() {
        List<Deuda> todas = deudaRepository.findByDeudor_Campana_Empresa_IdEmpresa(1L);
        for (Deuda d : todas) {
            String n = d.getNumeroCuenta();
            if (n != null && n.matches("(AUT|HIP|PER)-(S\\dG\\d\\d|POOL)-.*")) {
                asignacionCarteraRepository.deleteAll(
                        asignacionCarteraRepository.findByDeuda_IdDeudaAndEstatusActivaTrue(d.getIdDeuda()));
                deudaRepository.delete(d);
            }
        }
    }

    private int crearCuentaTDC(Empresa empresa, String prefijo, int k, int contador, Empleado gestor) {
        if (empresa == null) {
            return contador;
        }
        String numeroCuenta = String.format("TDC-%s-%03d", prefijo, k);
        if (deudaRepository.existsByNumeroCuenta(numeroCuenta)) {
            return contador + 1;
        }
        Campana campana = campanaRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa()).stream().findFirst().orElse(null);
        if (campana == null) {
            return contador + 1;
        }

        TipoProducto tipoProducto = elegirTipoProductoTDC(campana);

        Deudor deudor = new Deudor();
        String[] nombres = {"Alberto", "Gabriela", "José", "Mónica", "Raúl", "Leticia", "Eduardo", "Silvia", "Hugo", "Patricia", "Andrés", "Claudia", "Iván", "Marisol", "Tobías", "Nadia", "René", "Yolanda", "Saúl", "Rocío"};
        String[] apellidos = {"Hernández", "García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz", "Flores", "Gómez", "Díaz", "Reyes", "Morales", "Ortiz", "Jiménez", "Vázquez", "Ruiz", "Chávez"};
        deudor.setCampana(campana);
        deudor.setNombreCompleto(nombres[contador % 20] + " " + apellidos[contador % 20] + " " + apellidos[(contador * 2) % 20]);
        deudor.setDocumentoIdentidad(String.format("RFC-TDC-%s-%03d", prefijo, k));
        deudor.setTelefonoPrincipal("55" + String.format("%08d", 10000000 + contador));
        deudor.setCorreoElectronico(String.format("cliente.%s.%03d@correo.com", prefijo, k));
        deudor = deudorRepository.save(deudor);

        Deuda deuda = new Deuda();
        deuda.setDeudor(deudor);
        deuda.setTipoProducto(tipoProducto);
        deuda.setNumeroCuenta(numeroCuenta);
        BigDecimal original = new BigDecimal(20000 + (contador % 120000));
        deuda.setMontoOriginal(original);
        BigDecimal saldo = original.multiply(new BigDecimal("0.85"));
        deuda.setSaldoPendiente(saldo);
        deuda.setFechaVencimiento(LocalDate.now().minusMonths(1 + (contador % 6)));
        deuda.setEstado("PENDIENTE");
        deuda = deudaRepository.save(deuda);

        AsignacionCartera asignacion = new AsignacionCartera();
        asignacion.setDeuda(deuda);
        asignacion.setEmpleado(gestor);
        asignacion.setFechaAsignacion(LocalDate.now());
        asignacion.setEstatusActiva(true);
        asignacionCarteraRepository.save(asignacion);
        return contador + 1;
    }

    private TipoProducto elegirTipoProductoTDC(Campana campana) {
        List<TipoProducto> productos = tipoProductoRepository.findByCampana_Empresa_IdEmpresa(campana.getEmpresa().getIdEmpresa());
        if (productos.isEmpty()) {
            return null;
        }
        for (TipoProducto p : productos) {
            String n = p.getNombreProducto() == null ? "" : p.getNombreProducto().toLowerCase();
            if (n.contains("tarjeta") || n.contains("tdc") || n.contains("crédito") || n.contains("credito")) {
                return p;
            }
        }
        return productos.get(0);
    }

}