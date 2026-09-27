package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Campana;
import com.cobranza.saas_cobranza.Departamento;
import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.Empresa;
import com.cobranza.saas_cobranza.RolCampana;
import com.cobranza.saas_cobranza.repository.CampanaRepository;
import com.cobranza.saas_cobranza.repository.DepartamentoRepository;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import com.cobranza.saas_cobranza.repository.RolCampanaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import com.cobranza.saas_cobranza.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = {"http://localhost:5173", "https://alexgpb06.github.io", "https://54-156-249-149.nip.io"})
public class EmpleadoController {

    private static final Pattern CODIGO_EMPLEADO = Pattern.compile("^[A-Za-z0-9]{5}$");
    private static final String ROL_ADMIN = "ADMINISTRADOR";
    private static final String ROL_USUARIO = "USUARIO";
    private static final String ROL_GESTOR = "GESTOR";
    private static final String ROL_SUPERVISOR = "SUPERVISOR";
    private static final List<String> ROLES_VALIDOS =
            Arrays.asList(ROL_ADMIN, ROL_SUPERVISOR, ROL_GESTOR, ROL_USUARIO);

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private EmpresaRepository empresaRepository;

    @Autowired
    private DepartamentoRepository departamentoRepository;

    @Autowired
    private CampanaRepository campanaRepository;

    @Autowired
    private RolCampanaRepository rolCampanaRepository;

    @GetMapping
    public ResponseEntity<?> listar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                    @RequestParam(required = false) Long empresaId) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_ADMIN, ROL_SUPERVISOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el supervisor o el administrador pueden ver el directorio de empleados");
        }

        if (empresaId != null) {
            return ResponseEntity.ok(empleadoRepository.findByEmpresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(empleadoRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @RequestBody Map<String, String> datos) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el administrador puede dar de alta empleados");
        }

        String nombre = value(datos, "nombreCompleto");
        String correo = value(datos, "correoElectronico");
        String numeroEmpleado = value(datos, "numeroEmpleado");
        String rol = value(datos, "rol");

        if (nombre == null || nombre.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El nombre completo es obligatorio");
        }
        if (correo == null || correo.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El correo electrónico es obligatorio");
        }
        if (numeroEmpleado == null || !CODIGO_EMPLEADO.matcher(numeroEmpleado).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El número de empleado debe ser de exactamente 5 caracteres alfanuméricos");
        }
        if (rol == null || rol.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El rol es obligatorio y debe ser uno de: " + String.join(", ", ROLES_VALIDOS));
        }

        String codigo = numeroEmpleado.toUpperCase();
        String rolNormalizado = rol.trim().toUpperCase();
        if (!ROLES_VALIDOS.contains(rolNormalizado)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El rol no es válido. Usa uno de: " + String.join(", ", ROLES_VALIDOS));
        }

        if (empleadoRepository.existsByNumeroEmpleado(codigo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("El número de empleado ya está registrado");
        }
        if (empleadoRepository.existsByCorreoElectronico(correo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("El correo electrónico ya está registrado");
        }

        Empleado empleado = new Empleado();
        empleado.setNombreCompleto(nombre.trim());
        empleado.setCorreoElectronico(correo.trim());
        empleado.setNumeroEmpleado(codigo);
        empleado.setRol(rolNormalizado);
        empleado.setActivo(false);

        Long idEmpresa = extraerIdEmpresa(datos);
        if (idEmpresa != null) {
            Optional<Empresa> empresaOpt = empresaRepository.findById(idEmpresa);
            if (empresaOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La empresa indicada no existe");
            }
            empleado.setEmpresa(empresaOpt.get());
        }

        String numeroSupervisor = value(datos, "idSupervisor");
        if (numeroSupervisor != null && !numeroSupervisor.isBlank()) {
            Optional<Empleado> supervisorOpt = empleadoRepository
                    .findByNumeroEmpleado(numeroSupervisor.trim().toUpperCase());
            if (supervisorOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("El número de supervisor indicado no existe");
            }
            empleado.setSupervisor(supervisorOpt.get());
        }

        if (empleado.getEmpresa() != null) {
            Long idDepartamento = extraerIdLong(datos, "idDepartamento");
            if (idDepartamento != null) {
                Optional<Departamento> deptoOpt = departamentoRepository.findById(idDepartamento);
                if (deptoOpt.isPresent()) {
                    empleado.setDepartamento(deptoOpt.get());
                }
            }
            if (empleado.getDepartamento() == null) {
                departamentoRepository.findByEmpresa_IdEmpresa(empleado.getEmpresa().getIdEmpresa()).stream()
                        .filter(d -> d.getNombre().equalsIgnoreCase("Cobranza"))
                        .findFirst()
                        .ifPresent(empleado::setDepartamento);
            }
        }

        Empleado guardado = empleadoRepository.save(empleado);
        asignarRolEnCampana(guardado, rolNormalizado);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "Empleado registrado. Entrégale su número de empleado para que active su cuenta.");
        respuesta.put("idEmpleado", guardado.getIdEmpleado());
        respuesta.put("numeroEmpleado", guardado.getNumeroEmpleado());
        respuesta.put("nombre", guardado.getNombreCompleto());
        respuesta.put("rol", guardado.getRol());
        respuesta.put("activo", guardado.getActivo());
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @PostMapping("/estado")
    public ResponseEntity<?> cambiarEstado(@RequestHeader(value = "Authorization", required = false) String authorization,
                                           @RequestBody Map<String, String> datos) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el administrador puede dar de alta o de baja empleados");
        }

        String numeroEmpleado = value(datos, "numeroEmpleado");
        if (numeroEmpleado == null || !CODIGO_EMPLEADO.matcher(numeroEmpleado).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El número de empleado debe ser de exactamente 5 caracteres alfanuméricos");
        }

        String activo = value(datos, "activo");
        if (activo == null || (!activo.equalsIgnoreCase("true") && !activo.equalsIgnoreCase("false"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Debes enviar activo en true o false");
        }
        boolean activar = Boolean.parseBoolean(activo);

        String codigo = numeroEmpleado.toUpperCase();
        Optional<Empleado> empleadoOpt = empleadoRepository.findByNumeroEmpleado(codigo);
        if (empleadoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El número de empleado no está registrado");
        }
        Empleado empleado = empleadoOpt.get();

        if (sesion.numeroEmpleado() != null && sesion.numeroEmpleado().equalsIgnoreCase(codigo)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("No puedes cambiar el estado de tu propia cuenta");
        }

        if (activar) {
            if (empleado.getUsuario() == null || empleado.getUsuario().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Este empleado todavía no ha creado su usuario, no se puede activar");
            }
            empleado.setActivo(true);
        } else {
            long administradoresActivos = empleadoRepository.findAll().stream()
                    .filter(e -> ROL_ADMIN.equalsIgnoreCase(e.getRol()))
                    .filter(e -> !codigo.equalsIgnoreCase(e.getNumeroEmpleado()))
                    .filter(e -> Boolean.TRUE.equals(e.getActivo()))
                    .count();
            if (ROL_ADMIN.equalsIgnoreCase(empleado.getRol()) && administradoresActivos == 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("No puedes dar de baja al único administrador activo");
            }
            empleado.setActivo(false);
        }

        Empleado actualizado = empleadoRepository.save(empleado);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", activar ? "Empleado reactivado" : "Empleado dado de baja");
        respuesta.put("numeroEmpleado", actualizado.getNumeroEmpleado());
        respuesta.put("nombre", actualizado.getNombreCompleto());
        respuesta.put("rol", actualizado.getRol());
        respuesta.put("activo", actualizado.getActivo());
        respuesta.put("usuario", actualizado.getUsuario());
        return ResponseEntity.ok(respuesta);
    }

    @PutMapping("/{numeroEmpleado}/rol")
    public ResponseEntity<?> cambiarRol(@RequestHeader(value = "Authorization", required = false) String authorization,
                                        @PathVariable String numeroEmpleado,
                                        @RequestBody Map<String, String> datos) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el administrador puede modificar el rol de los empleados");
        }

        if (numeroEmpleado == null || !CODIGO_EMPLEADO.matcher(numeroEmpleado).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El número de empleado debe ser de exactamente 5 caracteres alfanuméricos");
        }

        String rol = value(datos, "rol");
        if (rol == null || rol.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El rol es obligatorio y debe ser uno de: " + String.join(", ", ROLES_VALIDOS));
        }
        String rolNormalizado = rol.trim().toUpperCase();
        if (!ROLES_VALIDOS.contains(rolNormalizado)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El rol no es válido. Usa uno de: " + String.join(", ", ROLES_VALIDOS));
        }

        String codigo = numeroEmpleado.toUpperCase();
        Optional<Empleado> empleadoOpt = empleadoRepository.findByNumeroEmpleado(codigo);
        if (empleadoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El número de empleado no está registrado");
        }
        Empleado empleado = empleadoOpt.get();

        if (sesion.numeroEmpleado() != null && sesion.numeroEmpleado().equalsIgnoreCase(codigo)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("No puedes modificar tu propio rol");
        }

        boolean eraAdmin = ROL_ADMIN.equalsIgnoreCase(empleado.getRol());
        if (eraAdmin && !ROL_ADMIN.equals(rolNormalizado)) {
            long otrosAdministradores = empleadoRepository.findAll().stream()
                    .filter(e -> ROL_ADMIN.equalsIgnoreCase(e.getRol()))
                    .filter(e -> !codigo.equalsIgnoreCase(e.getNumeroEmpleado()))
                    .filter(e -> Boolean.TRUE.equals(e.getActivo()))
                    .count();
            if (otrosAdministradores == 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("No puedes quitar el rol al único administrador activo");
            }
        }

        empleado.setRol(rolNormalizado);
        Empleado actualizado = empleadoRepository.save(empleado);

        rolCampanaRepository.findAll().stream()
                .filter(rc -> rc.getEmpleado() != null
                        && rc.getEmpleado().getIdEmpleado().equals(actualizado.getIdEmpleado()))
                .forEach(rc -> {
                    rc.setRol(rolNormalizado);
                    rolCampanaRepository.save(rc);
                });
        asignarRolEnCampana(actualizado, rolNormalizado);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "Rol actualizado a " + rolNormalizado);
        respuesta.put("numeroEmpleado", actualizado.getNumeroEmpleado());
        respuesta.put("nombre", actualizado.getNombreCompleto());
        respuesta.put("rol", actualizado.getRol());
        return ResponseEntity.ok(respuesta);
    }

    /**
     * Cambia la campana activa del empleado. Solo el administrador; la campana
     * debe pertenecer a la empresa del empleado. Se desactivan las demas filas
     * de roles_campana y se activa (o crea) la elegida.
     */
    @PutMapping("/{numeroEmpleado}/campana")
    public ResponseEntity<?> cambiarCampana(@RequestHeader(value = "Authorization", required = false) String authorization,
                                            @PathVariable String numeroEmpleado,
                                            @RequestBody Map<String, String> datos) {

        JwtUtil.Sesion sesion = JwtUtil.autenticar(authorization);
        if (sesion == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token ausente o inválido");
        }
        if (!sesion.tieneRol(ROL_ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo el administrador puede cambiar la campaña de los empleados");
        }

        if (numeroEmpleado == null || !CODIGO_EMPLEADO.matcher(numeroEmpleado).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El número de empleado debe ser de exactamente 5 caracteres alfanuméricos");
        }

        String idCampanaRaw = value(datos, "idCampana");
        if (idCampanaRaw == null || idCampanaRaw.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Debes indicar la campaña");
        }
        Long idCampana;
        try {
            idCampana = Long.parseLong(idCampanaRaw.trim());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El id de campaña no es válido");
        }

        String codigo = numeroEmpleado.toUpperCase();
        Optional<Empleado> empleadoOpt = empleadoRepository.findByNumeroEmpleado(codigo);
        if (empleadoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El número de empleado no está registrado");
        }
        Empleado empleado = empleadoOpt.get();
        if (empleado.getEmpresa() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("El empleado no tiene empresa asignada, no puede cambiarle la campaña");
        }

        Optional<Campana> campanaOpt = campanaRepository.findById(idCampana);
        if (campanaOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La campaña indicada no existe");
        }
        Campana campana = campanaOpt.get();
        if (campana.getEmpresa() == null
                || !empleado.getEmpresa().getIdEmpresa().equals(campana.getEmpresa().getIdEmpresa())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("La campaña no pertenece a la empresa del empleado");
        }

        List<RolCampana> filas = rolCampanaRepository.findAll().stream()
                .filter(rc -> rc.getEmpleado() != null
                        && rc.getEmpleado().getIdEmpleado().equals(empleado.getIdEmpleado()))
                .toList();

        Optional<RolCampana> existente = filas.stream()
                .filter(rc -> rc.getCampana() != null && rc.getCampana().getIdCampana().equals(idCampana))
                .findFirst();
        RolCampana objetivo = existente.orElseGet(() -> {
            RolCampana nueva = new RolCampana();
            nueva.setEmpleado(empleado);
            nueva.setCampana(campana);
            nueva.setRol(empleado.getRol());
            return nueva;
        });
        objetivo.setActivo(true);
        rolCampanaRepository.save(objetivo);

        for (RolCampana fila : filas) {
            if (fila != objetivo && Boolean.TRUE.equals(fila.getActivo())) {
                fila.setActivo(false);
                rolCampanaRepository.save(fila);
            }
        }

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "Campaña actualizada a " + campana.getNombreEmpresa());
        respuesta.put("numeroEmpleado", empleado.getNumeroEmpleado());
        respuesta.put("idCampana", campana.getIdCampana());
        respuesta.put("campana", campana.getNombreEmpresa());
        return ResponseEntity.ok(respuesta);
    }

    private void asignarRolEnCampana(Empleado empleado, String rol) {
        if (empleado.getEmpresa() == null) {
            return;
        }
        List<Campana> campanas = campanaRepository.findByEmpresa_IdEmpresa(empleado.getEmpresa().getIdEmpresa());
        for (Campana campana : campanas) {
            boolean yaExiste = rolCampanaRepository.findAll().stream()
                    .anyMatch(rc -> rc.getEmpleado().getIdEmpleado().equals(empleado.getIdEmpleado())
                            && rc.getCampana().getIdCampana().equals(campana.getIdCampana())
                            && rc.getRol().equalsIgnoreCase(rol));
            if (yaExiste) {
                continue;
            }
            RolCampana nuevo = new RolCampana();
            nuevo.setEmpleado(empleado);
            nuevo.setCampana(campana);
            nuevo.setRol(rol);
            nuevo.setActivo(true);
            rolCampanaRepository.save(nuevo);
        }
    }

    @PostMapping("/activar")
    public ResponseEntity<?> activar(@RequestBody Map<String, String> datos) {
        String numeroEmpleado = value(datos, "numeroEmpleado");
        String nuevoUsuario = value(datos, "nuevoUsuario");
        String nuevaContrasena = value(datos, "nuevaContrasena");

        if (numeroEmpleado == null || !CODIGO_EMPLEADO.matcher(numeroEmpleado).matches()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El código de empleado debe ser de exactamente 5 caracteres alfanuméricos");
        }
        if (nuevoUsuario == null || nuevoUsuario.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El usuario es obligatorio");
        }
        if (nuevaContrasena == null || nuevaContrasena.length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La contraseña debe tener al menos 8 caracteres");
        }

        String codigo = numeroEmpleado.toUpperCase();
        Optional<Empleado> empleadoOpt = empleadoRepository.findByNumeroEmpleado(codigo);

        if (empleadoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El código de empleado no está registrado en la base de datos");
        }

        Empleado empleado = empleadoOpt.get();

        if (empleado.getUsuario() != null || Boolean.TRUE.equals(empleado.getActivo())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("La cuenta ya fue activada");
        }

        String usuario = nuevoUsuario.trim();
        if (empleadoRepository.existsByUsuario(usuario)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("El usuario ya está en uso");
        }

        empleado.setUsuario(usuario);
        empleado.setContrasenaHash(PasswordUtil.hash(nuevaContrasena));
        empleado.setActivo(true);

        Empleado actualizado = empleadoRepository.save(empleado);

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("mensaje", "Cuenta activada con éxito");
        respuesta.put("idEmpleado", actualizado.getIdEmpleado());
        respuesta.put("numeroEmpleado", actualizado.getNumeroEmpleado());
        respuesta.put("usuario", actualizado.getUsuario());
        respuesta.put("rol", actualizado.getRol());

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        String usuario = value(credenciales, "usuario");
        String passwordInput = value(credenciales, "password");

        if (usuario == null || usuario.isBlank() || passwordInput == null || passwordInput.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Usuario y contraseña son obligatorios");
        }

        Optional<Empleado> empleadoOpt = empleadoRepository.findByUsuario(usuario.trim());
        if (empleadoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
        }

        Empleado empleado = empleadoOpt.get();

        boolean passwordValida = PasswordUtil.verificar(passwordInput, empleado.getContrasenaHash());
        if (!passwordValida) {
            passwordValida = passwordInput.equals(empleado.getContrasenaHash());
        }

        if (!passwordValida) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas o inactivo");
        }

        if (!Boolean.TRUE.equals(empleado.getActivo())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas o inactivo");
        }

        String rol = (empleado.getRol() == null || empleado.getRol().isBlank()) ? ROL_USUARIO : empleado.getRol();
        String token = JwtUtil.generarToken(
                empleado.getIdEmpleado().toString(),
                rol,
                empleado.getUsuario(),
                empleado.getNumeroEmpleado()
        );

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("token", token);
        respuesta.put("idEmpleado", empleado.getIdEmpleado());
        respuesta.put("numeroEmpleado", empleado.getNumeroEmpleado());
        respuesta.put("usuario", empleado.getUsuario());
        respuesta.put("nombre", empleado.getNombreCompleto());
        respuesta.put("correo", empleado.getCorreoElectronico());
        respuesta.put("rol", rol);
        respuesta.put("activo", empleado.getActivo());
        if (empleado.getEmpresa() != null) {
            respuesta.put("idEmpresa", empleado.getEmpresa().getIdEmpresa());
            respuesta.put("empresa", empleado.getEmpresa().getNombre());
        }

        return ResponseEntity.ok(respuesta);
    }

    private Long extraerIdEmpresa(Map<String, String> datos) {
        return extraerIdLong(datos, "idEmpresa");
    }

    private Long extraerIdLong(Map<String, String> datos, String clave) {
        String raw = datos.get(clave);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String value(Map<String, String> datos, String clave) {
        return datos == null ? null : datos.get(clave);
    }
}