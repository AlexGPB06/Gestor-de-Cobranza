package com.cobranza.saas_cobranza.repository;

import com.cobranza.saas_cobranza.TipoProducto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TipoProductoRepository extends JpaRepository<TipoProducto, Long> {

    List<TipoProducto> findByCampana_Empresa_IdEmpresa(Long idEmpresa);
}