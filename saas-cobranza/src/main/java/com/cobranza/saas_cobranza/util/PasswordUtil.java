package com.cobranza.saas_cobranza.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public final class PasswordUtil {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    private PasswordUtil() {}

    public static String hash(String contrasenaPlana) {
        return ENCODER.encode(contrasenaPlana);
    }

    public static boolean verificar(String contrasenaPlana, String hashAlmacenado) {
        if (hashAlmacenado == null || hashAlmacenado.isEmpty()) {
            return false;
        }
        return ENCODER.matches(contrasenaPlana, hashAlmacenado);
    }
}