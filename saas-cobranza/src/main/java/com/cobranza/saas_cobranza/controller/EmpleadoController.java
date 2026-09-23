package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.Empresa;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.repository.EmpresaRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import com.cobranza.saas_cobranza.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "http://localhost:5173")
public class EmpleadoController {

    private static final Pattern CODIGO_EMPLEADO = Pattern.compile("^[A-Za-z0-9]{5}$");
    private static final String ROL_ADMIN = "ADMINISTRADOR";
    private static final String ROL_USUARIO = "USUARIO";

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private EmpresaRepository empresaRepository;

    @GetMapping
    public ResponseEntity<List<Empleado>> listar(@RequestParam(required = false) Long empresaId) {
        if (empresaId != null) {
            return ResponseEntity.ok(empleadoRepository.findByEmpresa_IdEmpresa(empresaId));
        }
        return ResponseEntity.ok(empleadoRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody Map<String, String> datos) {
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

        String codigo = numeroEmpleado.toUpperCase();

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
        empleado.setRol(normalizarRol(rol));
        empleado.setActivo(false);

        Long idEmpresa = extraerIdEmpresa(datos);
        if (idEmpresa != null) {
            Optional<Empresa> empresaOpt = empresaRepository.findById(idEmpresa);
            if (empresaOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("La empresa indicada no existe");
            }
            empleado.setEmpresa(empresaOpt.get());
        }

        Empleado guardado = empleadoRepository.save(empleado);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
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
        String raw = datos.get("idEmpresa");
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String normalizarRol(String rol) {
        if (rol == null || rol.isBlank()) {
            return ROL_USUARIO;
        }
        String normalizado = rol.trim().toUpperCase();
        if (!ROL_ADMIN.equals(normalizado) && !ROL_USUARIO.equals(normalizado)) {
            return ROL_USUARIO;
        }
        return normalizado;
    }

    private String value(Map<String, String> datos, String clave) {
        return datos == null ? null : datos.get(clave);
    }
}