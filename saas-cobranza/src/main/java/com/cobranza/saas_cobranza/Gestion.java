package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Data
@Entity
@Table(name = "gestiones")
public class Gestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_gestion")
    private Long idGestion;

    @ManyToOne
    @JoinColumn(name = "id_deuda", nullable = false)
    private Deuda deuda;

    @ManyToOne
    @JoinColumn(name = "id_empleado", nullable = false)
    private Empleado empleado;

    @ManyToOne
    @JoinColumn(name = "id_meta")
    private Meta meta;

    @ManyToOne
    @JoinColumn(name = "id_concepto")
    private Concepto concepto;

    @ManyToOne
    @JoinColumn(name = "id_motivo")
    private MotivoNoPago motivoNoPago;

    @Column(name = "codigo_resultado", nullable = false)
    private String codigoResultado;

    @Column(name = "numero_marcado")
    private String numeroMarcado;

    @Column(name = "tipo_telefono_marcado")
    private String tipoTelefonoMarcado;

    @Column(name = "comentarios", columnDefinition = "TEXT")
    private String comentarios;

    @Column(name = "fecha_promesa")
    private LocalDate fechaPromesa;

    @Column(name = "monto_promesa", precision = 15, scale = 2)
    private BigDecimal montoPromesa;

    @ManyToOne
    @JoinColumn(name = "id_tipo_promesa")
    private TipoPromesa tipoPromesa;

    @Column(name = "monto_pagado", precision = 15, scale = 2)
    private BigDecimal montoPagado = BigDecimal.ZERO;

    @Column(name = "estado_bonificacion", length = 30)
    private String estadoBonificacion;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() {
        this.fechaRegistro = LocalDateTime.now(ZoneOffset.UTC);
    }
}