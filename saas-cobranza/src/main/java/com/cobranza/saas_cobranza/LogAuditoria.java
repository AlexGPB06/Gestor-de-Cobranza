package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Data
@Entity
@Table(name = "logs_auditoria")
public class LogAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Long idLog;

    @ManyToOne
    @JoinColumn(name = "id_empleado", nullable = false)
    private Empleado empleado;

    @Column(name = "modulo_afectado", nullable = false)
    private String moduloAfectado;

    @Column(name = "accion", nullable = false)
    private String accion;

    @Column(name = "descripcion_cambio", columnDefinition = "TEXT")
    private String descripcionCambio;

    @Column(name = "fecha_hora", nullable = false, updatable = false)
    private LocalDateTime fechaHora;

    @PrePersist
    protected void onCreate() {
        this.fechaHora = LocalDateTime.now(ZoneOffset.UTC);
    }
}