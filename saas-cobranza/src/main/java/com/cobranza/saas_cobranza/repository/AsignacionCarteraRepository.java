package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.AsignacionCartera;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface AsignacionCarteraRepository extends JpaRepository<AsignacionCartera, Long> {

    List<AsignacionCartera> findByEmpleado_IdEmpleadoAndEstatusActivaTrue(Long idEmpleado);

    List<AsignacionCartera> findByDeuda_IdDeudaAndEstatusActivaTrue(Long idDeuda);

    List<AsignacionCartera> findByDeuda_Deudor_Campana_Empresa_IdEmpresa(Long idEmpresa);

    List<AsignacionCartera> findByEmpleado_IdEmpleadoInAndEstatusActivaTrue(Collection<Long> idsEmpleado);
}