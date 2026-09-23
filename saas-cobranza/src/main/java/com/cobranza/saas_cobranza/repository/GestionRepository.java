package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Gestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GestionRepository extends JpaRepository<Gestion, Long> {

    List<Gestion> findByDeuda_Deudor_Campana_Empresa_IdEmpresa(Long idEmpresa);
}