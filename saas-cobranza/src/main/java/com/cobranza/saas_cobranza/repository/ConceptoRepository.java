package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Concepto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConceptoRepository extends JpaRepository<Concepto, Long> {
}