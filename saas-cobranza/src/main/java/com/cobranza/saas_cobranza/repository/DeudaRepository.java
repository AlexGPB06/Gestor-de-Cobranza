package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Deuda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeudaRepository extends JpaRepository<Deuda, Long> {
}