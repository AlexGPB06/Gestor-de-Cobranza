package com.cobranza.saas_cobranza.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

public class JwtUtil {
    private static final long TIEMPO_EXPIRACION = 3600000; // 1 hora en milisegundos

    private static final Key CLAVE_FIRMA;

    static {
        String secreto = System.getenv("JWT_SECRET");
        if (secreto == null || secreto.length() < 32) {
            secreto = "SAAS_COBRANZA_SECRETO_DEV_SUPER_SEGURO_2026";
        }
        CLAVE_FIRMA = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
    }

    public static String generarToken(String idEmpleado, String rol, String usuario, String numeroEmpleado) {
        return Jwts.builder()
                .setSubject(idEmpleado)
                .claim("rol", rol)
                .claim("usuario", usuario)
                .claim("numeroEmpleado", numeroEmpleado)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + TIEMPO_EXPIRACION))
                .signWith(CLAVE_FIRMA, SignatureAlgorithm.HS256)
                .compact();
    }

    public static Sesion autenticar(String cabeceraAuthorization) {
        if (cabeceraAuthorization == null || cabeceraAuthorization.isBlank()) {
            return null;
        }
        if (!cabeceraAuthorization.startsWith("Bearer ")) {
            return null;
        }
        String token = cabeceraAuthorization.substring(7).trim();
        if (token.isEmpty()) {
            return null;
        }
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(CLAVE_FIRMA)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            String sujeto = claims.getSubject();
            if (sujeto == null || sujeto.isBlank()) {
                return null;
            }
            return new Sesion(
                    Long.valueOf(sujeto),
                    claims.get("rol", String.class),
                    claims.get("usuario", String.class),
                    claims.get("numeroEmpleado", String.class));
        } catch (Exception e) {
            return null;
        }
    }

    public record Sesion(Long idEmpleado, String rol, String usuario, String numeroEmpleado) {

        public boolean tieneRol(String... rolespermitidos) {
            if (rol == null || rol.isBlank()) {
                return false;
            }
            String actual = rol.trim().toUpperCase();
            for (String permitido : rolespermitidos) {
                if (actual.equals(permitido.trim().toUpperCase())) {
                    return true;
                }
            }
            return false;
        }
    }
}