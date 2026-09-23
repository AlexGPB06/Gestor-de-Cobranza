package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    Optional<Empresa> findByNombre(String nombre);

    boolean existsByNombre(String nombre);
}