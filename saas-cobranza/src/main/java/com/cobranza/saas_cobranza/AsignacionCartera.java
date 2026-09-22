package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "asignaciones_cartera")
public class AsignacionCartera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asignacion")
    private Long idAsignacion;

    @ManyToOne
    @JoinColumn(name = "id_deuda", nullable = false)
    private Deuda deuda;

    @ManyToOne
    @JoinColumn(name = "id_empleado", nullable = false)
    private Empleado empleado;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDate fechaAsignacion;

    @Column(name = "estatus_activa", nullable = false)
    private Boolean estatusActiva = true;
}