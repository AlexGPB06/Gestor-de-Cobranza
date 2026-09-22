package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "telefonos")
public class Telefono {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_telefono")
    private Long idTelefono;

    @ManyToOne
    @JoinColumn(name = "id_deudor", nullable = false)
    private Deudor deudor;

    @Column(name = "numero_telefono", nullable = false)
    private String numeroTelefono;

    @Column(name = "tipo_telefono", nullable = false) // Ej: Celular, Casa, Trabajo
    private String tipoTelefono;

    @Column(name = "estatus", nullable = false) // Ej: Sin marcar, Efectivo, Equivocado
    private String estatus = "Sin marcar";

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}