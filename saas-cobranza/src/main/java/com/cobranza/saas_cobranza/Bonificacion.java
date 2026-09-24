package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "bonificaciones")
public class Bonificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bonificacion")
    private Long idBonificacion;

    @ManyToOne
    @JoinColumn(name = "id_deuda", nullable = false)
    private Deuda deuda;

    @ManyToOne
    @JoinColumn(name = "id_empleado", nullable = false)
    private Empleado empleado;

    @Column(name = "tipo", nullable = false, length = 60)
    private String tipo;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "monto_bonificado", precision = 15, scale = 2)
    private BigDecimal montoBonificado;

    @Column(name = "fecha")
    private LocalDate fecha;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}