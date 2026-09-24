package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Telefono;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TelefonoRepository extends JpaRepository<Telefono, Long> {

    List<Telefono> findByDeudor_IdDeudor(Long idDeudor);

    List<Telefono> findByDeudor_IdDeudorAndNumeroTelefono(Long idDeudor, String numeroTelefono);
}