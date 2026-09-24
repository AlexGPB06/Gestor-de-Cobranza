package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Bonificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BonificacionRepository extends JpaRepository<Bonificacion, Long> {

    List<Bonificacion> findByDeuda_Deudor_Campana_Empresa_IdEmpresa(Long idEmpresa);

    List<Bonificacion> findByDeuda_IdDeuda(Long idDeuda);
}