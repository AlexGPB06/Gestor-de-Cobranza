package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.Empleado;
import com.cobranza.saas_cobranza.repository.EmpleadoRepository;
import com.cobranza.saas_cobranza.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "http://localhost:5173")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        try {
            Long id = Long.parseLong(credenciales.get("idEmpleado"));
            String passwordInput = credenciales.get("password");

            Optional<Empleado> empleadoOpt = empleadoRepository.findById(id);

            if (empleadoOpt.isPresent()) {
                Empleado empleado = empleadoOpt.get();
                
                if (empleado.getActivo() && empleado.getContrasenaHash().equals(passwordInput)) {
                    // 1. Definir rol (Ejemplo básico: ID 1 es Admin, los demás Usuarios)
                    String rol = (id == 1) ? "ADMINISTRADOR" : "USUARIO";
                    
                    // 2. Generar el JWT
                    String token = JwtUtil.generarToken(id.toString(), rol);
                    
                    // 3. Empaquetar respuesta
                    Map<String, Object> respuesta = new HashMap<>();
                    respuesta.put("token", token);
                    respuesta.put("idEmpleado", empleado.getIdEmpleado());
                    respuesta.put("nombre", empleado.getNombreCompleto());
                    respuesta.put("rol", rol);
                    
                    return ResponseEntity.ok(respuesta); 
                } else {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas o inactivo"); 
                }
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado"); 
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error en formato de datos"); 
        }
    }
}