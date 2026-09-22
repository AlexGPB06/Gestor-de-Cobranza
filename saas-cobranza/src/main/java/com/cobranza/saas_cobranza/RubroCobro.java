package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "rubros_cobro")
public class RubroCobro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rubro")
    private Long idRubro;

    @ManyToOne
    @JoinColumn(name = "id_campana", nullable = false)
    private Campana campana;

    @Column(name = "nombre_rubro", nullable = false)
    private String nombreRubro;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}