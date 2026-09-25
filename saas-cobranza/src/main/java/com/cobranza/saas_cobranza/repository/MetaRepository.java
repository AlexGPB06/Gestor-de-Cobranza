package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Meta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MetaRepository extends JpaRepository<Meta, Long> {

    List<Meta> findByCampana_IdCampana(Long idCampana);

    List<Meta> findBySupervisor_IdEmpleado(Long idEmpleado);

    List<Meta> findByActivoTrue();

    List<Meta> findByCampana_IdCampanaAndActivoTrue(Long idCampana);
}
