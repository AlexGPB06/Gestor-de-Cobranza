package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Deuda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeudaRepository extends JpaRepository<Deuda, Long> {

    List<Deuda> findByDeudor_Campana_Empresa_IdEmpresa(Long idEmpresa);

    boolean existsByNumeroCuenta(String numeroCuenta);
}