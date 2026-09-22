package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "empleado_roles")
public class EmpleadoRol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empleado_rol")
    private Long idEmpleadoRol;

    @ManyToOne
    @JoinColumn(name = "id_empleado", nullable = false)
    private Empleado empleado;

    @ManyToOne
    @JoinColumn(name = "id_rol", nullable = false)
    private RolCampana rolCampana;
}