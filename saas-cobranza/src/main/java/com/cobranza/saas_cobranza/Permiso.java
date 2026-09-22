package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "permisos")
public class Permiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_permiso")
    private Long idPermiso;

    @Column(name = "codigo_permiso", nullable = false, unique = true)
    private String codigoPermiso;
}