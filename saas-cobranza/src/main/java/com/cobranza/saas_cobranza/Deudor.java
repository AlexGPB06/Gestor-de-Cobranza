package com.cobranza.saas_cobranza;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "deudores")
public class Deudor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_deudor")
    private Long idDeudor;

    @ManyToOne
    @JoinColumn(name = "id_campana", nullable = false)
    private Campana campana;

    @OneToMany(mappedBy = "deudor", fetch = FetchType.EAGER, orphanRemoval = true)
    @OrderBy("idTelefono ASC")
    private List<Telefono> telefonos = new ArrayList<>();

    @Column(name = "nombre_completo", nullable = false)
    private String nombreCompleto;

    @Column(name = "documento_identidad", unique = true)
    private String documentoIdentidad;

    @Column(name = "telefono_principal", nullable = false)
    private String telefonoPrincipal;

    @Column(name = "correo_electronico")
    private String correoElectronico;

    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @PrePersist
    protected void onCreate() {
        this.fechaRegistro = LocalDateTime.now(ZoneOffset.UTC);
    }
}