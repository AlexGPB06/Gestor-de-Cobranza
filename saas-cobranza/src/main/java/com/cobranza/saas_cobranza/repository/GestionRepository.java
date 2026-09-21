package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Gestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GestionRepository extends JpaRepository<Gestion, Long> {
}