package com.cobranza.saas_cobranza;

import com.cobranza.saas_cobranza.util.JwtUtil;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilTest {

    @Test
    void generarToken_DebeDevolverTokenNoVacio() {
        String token = JwtUtil.generarToken("80", "SUPERVISOR", "supervisor.s1", "S1SUP");

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertEquals(3, token.split("\\.").length);
    }

    @Test
    void autenticar_TokenValido_DebeDevolverLaSesion() {
        String token = JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");

        JwtUtil.Sesion sesion = JwtUtil.autenticar("Bearer " + token);

        assertNotNull(sesion);
        assertEquals(90L, sesion.idEmpleado());
        assertEquals("GESTOR", sesion.rol());
        assertEquals("gestor.s1.01", sesion.usuario());
        assertEquals("S1G01", sesion.numeroEmpleado());
    }

    @Test
    void autenticar_CabeceraNull_Ovnull_DebeDevolverNull() {
        assertNull(JwtUtil.autenticar(null));
        assertNull(JwtUtil.autenticar(""));
        assertNull(JwtUtil.autenticar("   "));
    }

    @Test
    void autenticar_SinPrefijoBearer_DebeDevolverNull() {
        String token = JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");

        assertNull(JwtUtil.autenticar(token));
        assertNull(JwtUtil.autenticar("Basic " + token));
    }

    @Test
    void autenticar_TokenAdulterado_DebeDevolverNull() {
        String token = JwtUtil.generarToken("90", "GESTOR", "gestor.s1.01", "S1G01");
        String adulterado = token.substring(0, token.length() - 3) + "abc";

        assertNull(JwtUtil.autenticar("Bearer " + adulterado));
    }

    @Test
    void autenticar_TokenBasura_DebeDevolverNull() {
        assertNull(JwtUtil.autenticar("Bearer no.es.un.token.valido"));
        assertNull(JwtUtil.autenticar("Bearer "));
    }

    @Test
    void tieneRol_DebeCompararSinImportarMayusculasNiEspacios() {
        JwtUtil.Sesion gestor = new JwtUtil.Sesion(90L, "GESTOR", "gestor.s1.01", "S1G01");
        JwtUtil.Sesion supervisorEspaciado = new JwtUtil.Sesion(80L, " supervisor ", "supervisor.s1", "S1SUP");
        JwtUtil.Sesion sinRol = new JwtUtil.Sesion(70L, null, "x", "X0000");

        assertTrue(gestor.tieneRol("GESTOR"));
        assertTrue(gestor.tieneRol("ADMINISTRADOR", "GESTOR"));
        assertFalse(gestor.tieneRol("SUPERVISOR"));
        assertTrue(supervisorEspaciado.tieneRol("SUPERVISOR"));
        assertFalse(sinRol.tieneRol("GESTOR"));
    }
}
