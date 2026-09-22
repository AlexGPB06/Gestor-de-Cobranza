package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "motivos_no_pago")
public class MotivoNoPago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_motivo")
    private Long idMotivo;

    @ManyToOne
    @JoinColumn(name = "id_campana", nullable = false)
    private Campana campana;

    @Column(name = "descripcion", nullable = false)
    private String descripcion;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}