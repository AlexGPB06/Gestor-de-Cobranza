package com.cobranza.saas_cobranza.controller;

import com.cobranza.saas_cobranza.*;
import com.cobranza.saas_cobranza.repository.*;
import com.cobranza.saas_cobranza.util.Seguridad;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/supervision")
@CrossOrigin(origins = "http://localhost:5173")
public class SupervisionController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private AsignacionCarteraRepository asignacionCarteraRepository;

    @Autowired
    private GestionRepository gestionRepository;

    @Autowired
    private TicketRepository ticketRepository;

    private List<Empleado> equipoDe(Long supervisorId) {
        return empleadoRepository.findBySupervisor_IdEmpleado(supervisorId);
    }

    private LocalDateTime inicioPeriodo(String periodo) {
        if (periodo == null) return null;
        LocalDate hoy = LocalDate.now();
        if ("HOY".equalsIgnoreCase(periodo)) return hoy.atStartOfDay();
        if ("MES".equalsIgnoreCase(periodo)) return hoy.withDayOfMonth(1).atStartOfDay();
        return null;
    }

    private List<Gestion> gestionesDelEquipo(List<Long> ids, LocalDateTime desde) {
        if (ids.isEmpty()) return List.of();
        return desde == null
                ? gestionRepository.findByEmpleado_IdEmpleadoIn(ids)
                : gestionRepository.findByEmpleado_IdEmpleadoInAndFechaRegistroGreaterThanEqual(ids, desde);
    }

    @GetMapping("/equipo")
    public ResponseEntity<?> equipo(@RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestParam Long supervisorId,
                                   @RequestParam(required = false) String periodo) {
        ResponseEntity<?> bloqueado = Seguridad.supervisorSobreSiMismo(authorization, supervisorId);
        if (bloqueado != null) {
            return bloqueado;
        }
        LocalDateTime desde = inicioPeriodo(periodo);
        LocalDate hoy = LocalDate.now();
        List<Empleado> equipo = equipoDe(supervisorId);
        List<Long> ids = equipo.stream().map(Empleado::getIdEmpleado).toList();

        Map<Long, List<AsignacionCartera>> carterasPorEmp = ids.isEmpty()
                ? Collections.emptyMap()
                : asignacionCarteraRepository.findByEmpleado_IdEmpleadoInAndEstatusActivaTrue(ids).stream()
                        .filter(a -> a.getEmpleado() != null)
                        .collect(Collectors.groupingBy(a -> a.getEmpleado().getIdEmpleado()));

        Map<Long, List<Gestion>> gestionesPorEmp = gestionesDelEquipo(ids, desde).stream()
                .filter(g -> g.getEmpleado() != null)
                .collect(Collectors.groupingBy(g -> g.getEmpleado().getIdEmpleado()));

        Map<Long, Long> ticketsPorEmp = ids.isEmpty()
                ? Collections.emptyMap()
                : (desde == null
                        ? ticketRepository.findByEmpleadoOrigen_IdEmpleadoIn(ids)
                        : ticketRepository.findByEmpleadoOrigen_IdEmpleadoInAndFechaCreacionGreaterThanEqual(ids, desde)).stream()
                        .filter(t -> t.getEmpleadoOrigen() != null)
                        .collect(Collectors.groupingBy(t -> t.getEmpleadoOrigen().getIdEmpleado(), Collectors.counting()));

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (Empleado empleado : equipo) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("empleado", empleado);

            List<AsignacionCartera> cartera = carterasPorEmp.getOrDefault(empleado.getIdEmpleado(), List.of());
            fila.put("cuentasAsignadas", cartera.size());
            BigDecimal saldo = BigDecimal.ZERO;
            BigDecimal mora12 = BigDecimal.ZERO;
            BigDecimal mora36 = BigDecimal.ZERO;
            BigDecimal mora6mas = BigDecimal.ZERO;
            for (AsignacionCartera a : cartera) {
                Deuda d = a.getDeuda();
                if (d == null) continue;
                BigDecimal sp = d.getSaldoPendiente() == null ? BigDecimal.ZERO : d.getSaldoPendiente();
                saldo = saldo.add(sp);
                if (d.getFechaVencimiento() != null) {
                    long dias = ChronoUnit.DAYS.between(d.getFechaVencimiento(), hoy);
                    if (dias >= 120) mora6mas = mora6mas.add(sp);
                    else if (dias >= 60) mora36 = mora36.add(sp);
                    else if (dias >= 30) mora12 = mora12.add(sp);
                }
            }
            fila.put("saldoTotal", saldo);
            fila.put("saldoMora1y2", mora12);
            fila.put("saldoMora3y4", mora36);
            fila.put("saldoMora5y6", mora6mas);

            List<Gestion> gestiones = gestionesPorEmp.getOrDefault(empleado.getIdEmpleado(), List.of());
            fila.put("gestiones", gestiones.size());
            long promesas = gestiones.stream().filter(g -> g.getMontoPromesa() != null).count();
            fila.put("promesas", promesas);
            long pendientes = gestiones.stream()
                    .filter(g -> g.getTipoPromesa() != null && g.getEstadoBonificacion() != null
                            && "PENDIENTE".equalsIgnoreCase(g.getEstadoBonificacion()))
                    .count();
            fila.put("promocionesPendientes", pendientes);
            fila.put("tickets", ticketsPorEmp.getOrDefault(empleado.getIdEmpleado(), 0L));

            List<Gestion> ultimas = gestiones.stream()
                    .sorted(Comparator.comparing(Gestion::getFechaRegistro, Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(5)
                    .collect(Collectors.toList());
            fila.put("ultimasGestiones", ultimas);
            resultado.add(fila);
        }
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/promesas")
    public ResponseEntity<?> promesas(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @RequestParam Long supervisorId,
                                      @RequestParam(required = false) String periodo) {
        ResponseEntity<?> bloqueado = Seguridad.supervisorSobreSiMismo(authorization, supervisorId);
        if (bloqueado != null) {
            return bloqueado;
        }
        LocalDateTime desde = inicioPeriodo(periodo);
        List<Long> ids = equipoDe(supervisorId).stream().map(Empleado::getIdEmpleado).toList();
        return ResponseEntity.ok(gestionesDelEquipo(ids, desde).stream()
                .filter(g -> g.getMontoPromesa() != null)
                .sorted(Comparator.comparing(Gestion::getFechaRegistro, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList()));
    }
}