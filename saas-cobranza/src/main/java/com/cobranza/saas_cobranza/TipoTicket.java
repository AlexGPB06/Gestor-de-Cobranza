package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "tipos_ticket", uniqueConstraints = @UniqueConstraint(name = "uk_ticket_depto_numero", columnNames = {"id_departamento", "numero"}))
public class TipoTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_ticket")
    private Long idTipoTicket;

    @ManyToOne
    @JoinColumn(name = "id_departamento", nullable = false)
    private Departamento departamento;

    @Column(name = "numero", nullable = false, length = 30)
    private String numero;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "plantilla", columnDefinition = "TEXT")
    private String plantilla;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}