package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Deuda;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeudaRepository extends JpaRepository<Deuda, Long> {

    List<Deuda> findByDeudor_Campana_Empresa_IdEmpresa(Long idEmpresa);

    boolean existsByNumeroCuenta(String numeroCuenta);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Deuda d where d.idDeuda = :idDeuda")
    Optional<Deuda> findByIdBloqueado(@Param("idDeuda") Long idDeuda);
}