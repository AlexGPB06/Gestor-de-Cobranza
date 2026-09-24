package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Concepto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConceptoRepository extends JpaRepository<Concepto, Long> {

    List<Concepto> findByCampana_Empresa_IdEmpresa(Long idEmpresa);
    List<Concepto> findByCampana_Empresa_IdEmpresaAndActivoTrue(Long idEmpresa);
}