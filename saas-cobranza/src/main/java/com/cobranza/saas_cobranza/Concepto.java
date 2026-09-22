package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "conceptos")
public class Concepto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_concepto")
    private Long idConcepto;

    @ManyToOne
    @JoinColumn(name = "id_campana", nullable = false)
    private Campana campana;

    @Column(name = "nombre_concepto", nullable = false)
    private String nombreConcepto;

    @Column(name = "categoria", nullable = false)
    private String categoria; // Ej: Promesa, Negativa, Buzon

    @Column(name = "requiere_autorizacion", nullable = false)
    private Boolean requiereAutorizacion = false;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}