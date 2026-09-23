package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Empleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {

    Optional<Empleado> findByUsuario(String usuario);

    Optional<Empleado> findByNumeroEmpleado(String numeroEmpleado);

    boolean existsByUsuario(String usuario);

    boolean existsByNumeroEmpleado(String numeroEmpleado);

    boolean existsByCorreoElectronico(String correoElectronico);

    List<Empleado> findByEmpresa_IdEmpresa(Long idEmpresa);
}