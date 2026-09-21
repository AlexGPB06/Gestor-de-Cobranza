package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.RolCampana;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RolCampanaRepository extends JpaRepository<RolCampana, Long> {
}