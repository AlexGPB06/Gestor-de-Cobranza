package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Deudor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeudorRepository extends JpaRepository<Deudor, Long> {

    List<Deudor> findByCampana_Empresa_IdEmpresa(Long idEmpresa);
}