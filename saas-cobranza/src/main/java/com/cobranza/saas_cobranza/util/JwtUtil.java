package com.cobranza.saas_cobranza.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;

public class JwtUtil {
    // Llave secreta generada automáticamente para firmar el token
    private static final Key SECRET_KEY = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private static final long TIEMPO_EXPIRACION = 3600000; // 1 hora en milisegundos

    public static String generarToken(String idEmpleado, String rol) {
        return Jwts.builder()
                .setSubject(idEmpleado)
                .claim("rol", rol) // Aquí asignamos el rol (admin/usuario)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + TIEMPO_EXPIRACION))
                .signWith(SECRET_KEY)
                .compact();
    }
}