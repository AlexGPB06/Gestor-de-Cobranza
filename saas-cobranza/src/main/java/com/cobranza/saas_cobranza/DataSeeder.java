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
        semillasEmpresas();
        semillasCampanas();
        semillasTiposPromesa();
        semillasDepartamentos();
        semillasAdmin();
        asignarCobranzaAEmpleados();
        semillasPersonalOperativo();
        semillasSupervisoresYEquipos();
        semillasTiposTicket();
        desactivarConceptosPromocionesConvenio();
        semillasTiposProducto();
        semillasClientesDemo();
        semillasRoles();
    }

    private void semillasEmpresas() {
        String[][] base = {
                {"Santander", "SAN010101XX1", "BANCO"},
                {"Crediplus", "CRE010101XX2", "FINANCIERA"},
                {"Proteccion MX", "PRO010101XX3", "ASEGURADORA"}
        };
        for (String[] e : base) {
            if (empresaRepository.existsByNombre(e[0])) {
                continue;
            }
            Empresa empresa = new Empresa();
            empresa.setNombre(e[0]);
            empresa.setRfc(e[1]);
            empresa.setTipo(e[2]);
            empresa.setActivo(true);
            empresaRepository.save(empresa);
        }
    }

    private void semillasCampanas() {
        for (Empresa empresa : empresaRepository.findAll()) {
            if (!campanaRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa()).isEmpty()) {
                continue;
            }
            Campana campana = new Campana();
            campana.setEmpresa(empresa);
            campana.setNombreEmpresa(empresa.getNombre() + " - Cobranza");
            campana.setDiasMaximosPromesa(5);
            campana.setActivo(true);
            campanaRepository.save(campana);
        }
    }

    private void semillasTiposProducto() {
        List<TipoProducto> existentes = tipoProductoRepository.findAll();
        for (Campana campana : campanaRepository.findAll()) {
            boolean yaExiste = existentes.stream().anyMatch(p ->
                    p.getCampana() != null && p.getCampana().getIdCampana().equals(campana.getIdCampana())
                            && esProductoTDC(p.getNombreProducto()));
            if (yaExiste) {
                continue;
            }
            TipoProducto producto = new TipoProducto();
            producto.setCampana(campana);
            producto.setNombreProducto("Tarjeta de Crédito");
            producto.setTasaInteres(new BigDecimal("42.00"));
            producto.setActivo(true);
            tipoProductoRepository.save(producto);
        }
    }

    private void semillasClientesDemo() {
        Empleado gestor = empleadoRepository.findByUsuario("gestor.s1.01").orElse(null);
        if (gestor == null || gestor.getEmpresa() == null) {
            return;
        }
        Campana campana = campanaRepository.findByEmpresa_IdEmpresa(gestor.getEmpresa().getIdEmpresa())
                .stream().findFirst().orElse(null);
        if (campana == null) {
            return;
        }
        TipoProducto tdc = elegirTipoProductoTDC(campana);

        String[] nombres = {
                "Ana Luisa Robles", "Carlos Mendoza Ruiz", "Patricia Herrera", "Jorge Delgado Cruz",
                "Mariana Solís Vega", "Héctor Iván Palacios", "Fernanda Cortés Nava", "Rodrigo Amaya León",
                "Silvia Elena Fuentes", "Omar Bustos Paredes"
        };

        for (int i = 1; i <= 10; i++) {
            String numeroCuenta = String.format("TDC-DEMO-%03d", i);
            if (deudaRepository.existsByNumeroCuenta(numeroCuenta)) {
                continue;
            }

            Deudor deudor = new Deudor();
            deudor.setCampana(campana);
            deudor.setNombreCompleto(nombres[i - 1]);
            deudor.setDocumentoIdentidad(String.format("RFC-DEMO-%03d", i));
            deudor.setTelefonoPrincipal("55" + String.format("%08d", 40000000 + i));
            deudor.setCorreoElectronico(String.format("cliente.demo.%03d@correo.com", i));
            deudor = deudorRepository.save(deudor);

            Deuda deuda = new Deuda();
            deuda.setDeudor(deudor);
            deuda.setTipoProducto(tdc);
            deuda.setNumeroCuenta(numeroCuenta);
            BigDecimal original = new BigDecimal(15000 + (i * 2500));
            deuda.setMontoOriginal(original);
            deuda.setSaldoPendiente(original.multiply(new BigDecimal("0.75")));
            deuda.setFechaVencimiento(LocalDate.now().minusMonths(1 + (i % 6)).withDayOfMonth(1));
            deuda.setEstado("PENDIENTE");
            deuda = deudaRepository.save(deuda);

            AsignacionCartera asignacion = new AsignacionCartera();
            asignacion.setDeuda(deuda);
            asignacion.setEmpleado(gestor);
            asignacion.setFechaAsignacion(LocalDate.now());
            asignacion.setEstatusActiva(true);
            asignacionCarteraRepository.save(asignacion);
        }
    }

    private void semillasAdmin() {
        if (empleadoRepository.existsByUsuario("admin") || empleadoRepository.existsByNumeroEmpleado("ADM01")) {
            return;
        }
        Empresa empresa = empresaRepository.findById(1L).orElse(null);
        if (empresa == null) {
            return;
        }
        List<Departamento> deptos = departamentoRepository.findByEmpresa_IdEmpresa(empresa.getIdEmpresa());
        Departamento depto = deptos.stream()
                .filter(d -> d.getNombre().equalsIgnoreCase("Cobranza"))
                .findFirst()
                .orElse(deptos.stream().findFirst().orElse(null));
        if (depto == null) {
            return;
        }
        Empleado admin = new Empleado();
        admin.setNumeroEmpleado("ADM01");
        admin.setNombreCompleto("Administrador General");
        admin.setUsuario("admin");
        admin.setCorreoElectronico("admin@sistema.mx");
        admin.setRol("ADMINISTRADOR");
        admin.setActivo(true);
        admin.setContrasenaHash(PasswordUtil.hash("Operativo123"));
        admin.setFechaCreacion(LocalDateTime.now());
        admin.setDepartamento(depto);
        admin.setEmpresa(empresa);
        empleadoRepository.save(admin);
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

    private TipoProducto elegirTipoProductoTDC(Campana campana) {
        List<TipoProducto> productos = tipoProductoRepository.findByCampana_Empresa_IdEmpresa(campana.getEmpresa().getIdEmpresa());
        if (productos.isEmpty()) {
            return null;
        }
        for (TipoProducto p : productos) {
            if (esProductoTDC(p.getNombreProducto())) {
                return p;
            }
        }
        return productos.get(0);
    }

    private boolean esProductoTDC(String nombre) {
        if (nombre == null) {
            return false;
        }
        String n = nombre.toLowerCase();
        return n.contains("tarjeta") || n.contains("tdc") || n.contains("crédito") || n.contains("credito");
    }

}