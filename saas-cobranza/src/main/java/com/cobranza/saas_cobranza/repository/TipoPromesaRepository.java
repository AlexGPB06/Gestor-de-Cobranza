package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.TipoPromesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TipoPromesaRepository extends JpaRepository<TipoPromesa, Long> {

    List<TipoPromesa> findByCampana_Empresa_IdEmpresa(Long idEmpresa);
}