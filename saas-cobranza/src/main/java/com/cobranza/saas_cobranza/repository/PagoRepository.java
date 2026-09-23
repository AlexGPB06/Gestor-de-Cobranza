package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    List<Pago> findByDeuda_Deudor_Campana_Empresa_IdEmpresa(Long idEmpresa);
}