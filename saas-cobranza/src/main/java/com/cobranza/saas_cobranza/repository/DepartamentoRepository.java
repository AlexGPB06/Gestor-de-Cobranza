package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Departamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DepartamentoRepository extends JpaRepository<Departamento, Long> {

    List<Departamento> findByEmpresa_IdEmpresa(Long idEmpresa);
}