package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.MotivoNoPago;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MotivoNoPagoRepository extends JpaRepository<MotivoNoPago, Long> {

    List<MotivoNoPago> findByCampana_Empresa_IdEmpresa(Long idEmpresa);
}