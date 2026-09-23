package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Campana;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CampanaRepository extends JpaRepository<Campana, Long> {

    List<Campana> findByEmpresa_IdEmpresa(Long idEmpresa);
}