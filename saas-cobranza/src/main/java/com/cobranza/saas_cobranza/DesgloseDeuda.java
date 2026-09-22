package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "desglose_deuda")
public class DesgloseDeuda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_desglose")
    private Long idDesglose;

    @ManyToOne
    @JoinColumn(name = "id_deuda", nullable = false)
    private Deuda deuda;

    @ManyToOne
    @JoinColumn(name = "id_rubro", nullable = false)
    private RubroCobro rubro;

    @Column(name = "monto_exigible", nullable = false, precision = 15, scale = 2)
    private BigDecimal montoExigible;

    @Column(name = "estatus", nullable = false)
    private String estatus = "PENDIENTE";
}