package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "rol_permisos")
public class RolPermiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rol_permiso")
    private Long idRolPermiso;

    @ManyToOne
    @JoinColumn(name = "id_rol", nullable = false)
    private RolCampana rolCampana;

    @ManyToOne
    @JoinColumn(name = "id_permiso", nullable = false)
    private Permiso permiso;
}