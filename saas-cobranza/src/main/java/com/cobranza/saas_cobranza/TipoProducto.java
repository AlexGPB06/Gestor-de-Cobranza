package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "tipos_producto")
public class TipoProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_producto")
    private Long idTipoProducto;

    @ManyToOne
    @JoinColumn(name = "id_campana", nullable = false)
    private Campana campana;

    @Column(name = "nombre_producto", nullable = false)
    private String nombreProducto;

    @Column(name = "tasa_interes", precision = 5, scale = 2)
    private BigDecimal tasaInteres;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}