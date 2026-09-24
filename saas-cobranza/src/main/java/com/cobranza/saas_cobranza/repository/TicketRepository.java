package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByDeuda_Deudor_Campana_Empresa_IdEmpresa(Long idEmpresa);

    List<Ticket> findByEmpleadoOrigen_IdEmpleado(Long idEmpleado);

    List<Ticket> findByDeuda_IdDeuda(Long idDeuda);

    boolean existsByNumero(String numero);

    List<Ticket> findByEmpleadoOrigen_IdEmpleadoIn(Collection<Long> idsEmpleado);

    List<Ticket> findByEmpleadoOrigen_IdEmpleadoInAndFechaCreacionGreaterThanEqual(Collection<Long> idsEmpleado, LocalDateTime desde);
}