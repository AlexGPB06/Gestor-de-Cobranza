package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "campanas")
public class Campana {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_campana")
    private Long idCampana;

    @Column(name = "nombre_empresa", nullable = false)
    private String nombreEmpresa;

    @Column(name = "configuracion_json", columnDefinition = "json")
    private String configuracionJson;

    @Column(name = "dias_maximos_promesa", nullable = false)
    private Integer diasMaximosPromesa;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}