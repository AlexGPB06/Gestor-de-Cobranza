package com.cobranza.saas_cobranza.repository; 

import com.cobranza.saas_cobranza.Pago; 
import org.springframework.data.jpa.repository.JpaRepository;

public interface PagoRepository extends JpaRepository<Pago, Long> {
}