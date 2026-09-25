package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Gestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface GestionRepository extends JpaRepository<Gestion, Long> {

    List<Gestion> findByDeuda_Deudor_Campana_Empresa_IdEmpresa(Long idEmpresa);

    List<Gestion> findByEmpleado_IdEmpleado(Long idEmpleado);

    List<Gestion> findByDeuda_IdDeudaAndFechaPromesaGreaterThanEqual(Long idDeuda, LocalDate fecha);

    List<Gestion> findByEmpleado_IdEmpleadoIn(Collection<Long> idsEmpleado);

    List<Gestion> findByEmpleado_IdEmpleadoInAndFechaRegistroGreaterThanEqual(Collection<Long> idsEmpleado, LocalDateTime desde);

    List<Gestion> findByMeta_IdMeta(Long idMeta);
}