package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.TipoTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TipoTicketRepository extends JpaRepository<TipoTicket, Long> {

    List<TipoTicket> findByDepartamento_Empresa_IdEmpresa(Long idEmpresa);
}