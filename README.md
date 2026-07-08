# networking

my networking learning repo

## Mapping OSI ↔ código (`packages/core`)

Esta tabla se va actualizando a medida que se implementa cada fase del roadmap (ver `CLAUDE.md`). El objetivo es que cada clase del dominio tenga un ancla explícita a un concepto de networking real, no solo a una responsabilidad de software.

| Carpeta                        | Capa OSI              | Clase                                                                     | Concepto de networking que modela                                                                                                  | Estado                                      |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `packet/`                      | L2 (Data Link)        | [`Packet`](packages/core/src/packet/Packet.ts)                            | Frame Ethernet mínimo: MAC origen/destino + payload. `destMac` puede ser broadcast (`ff:ff:ff:ff:ff:ff`)                           | ✅ Fase 1                                   |
| `topology/`                    | L1 (Physical)         | [`Link`](packages/core/src/topology/Link.ts)                              | Enlace físico punto a punto, full-duplex, entre device+puerto ↔ device+puerto. v1 sin latencia ni pérdida (entrega determinística) | ✅ Fase 1                                   |
| `devices/`                     | L1/L2 (nodo genérico) | [`Device`](packages/core/src/devices/Device.ts)                           | Host genérico multi-puerto (`Map<string, Port>`) — base para Switch/Router                                                         | ✅ Fase 1 (rediseño multi-puerto: paso 1.0) |
| `devices/`                     | L2 (Data Link)        | [`Switch`](packages/core/src/devices/Switch.ts)                           | Flooding puro (✅) → MAC learning (`Map<MAC, puerto>` + aging 300s) → VLANs (802.1Q)                                               | 🚧 Fase 1, en progreso                      |
| `clock/` (simulator-engine)    | — (infraestructura)   | [`SimulatedClock`](packages/simulator-engine/src/clock/SimulatedClock.ts) | Reloj lógico determinístico: `now()`/`advance()`/`scheduleAt()` — motor genérico de todo timer de red                              | ✅ Fase 1, paso 3.5                         |
| `protocols/`                   | L2 (Data Link)        | `Stp` (spanning tree)                                                     | Elección de root bridge, bloqueo de puerto redundante para romper loops                                                            | ⏳ Fase 1                                   |
| `protocols/` / `devices/`      | L2 (Data Link)        | `Lacp`, `Vxlan`, `Rstp`                                                   | Agregación de enlaces (EtherChannel), overlay L2 por VNI, STP con convergencia rápida                                              | ⏳ Fase 1 Bonus                             |
| `devices/`                     | L3 (Network)          | `Router`                                                                  | Tabla de rutas, forwarding IP                                                                                                      | ⏳ Fase 2                                   |
| `protocols/`                   | L2/L3 (borde)         | `Arp`                                                                     | Resolución IP → MAC vía broadcast request/unicast reply, cache con expiración                                                      | ⏳ Fase 2                                   |
| `protocols/`                   | L3 (Network)          | `DistanceVectorProtocol` (tipo RIP)                                       | Routing dinámico por vector-distancia                                                                                              | ⏳ Fase 2                                   |
| `protocols/`                   | L3 (Network)          | `LinkStateProtocol` (tipo OSPF)                                           | Routing dinámico link-state, Dijkstra, área única                                                                                  | ⏳ Fase 2                                   |
| `protocols/`                   | L3 (Network)          | `Fhrp`, `Gre`                                                             | Redundancia de default gateway (HSRP/VRRP), túnel punto a punto                                                                    | ⏳ Fase 2 Bonus                             |
| `protocols/`                   | L3/L4 (inter-AS)      | `Bgp`                                                                     | Sistemas autónomos, AS-path, selección de ruta por shortest AS-path                                                                | ⏳ Fase 3                                   |
| `protocols/`                   | L3/L4 (WAN)           | `SdWanPolicy`, `Bgp` (local-pref)                                         | Hub-spoke vs full-mesh, selección de ruta por política, interconexión multi-cloud vía fabric neutral                               | ⏳ Fase 3 Bonus                             |
| `devices/` o nueva `security/` | L3/L4                 | `Acl`, `Nat`                                                              | Filtrado por IP/puerto, traducción IP privada → pública                                                                            | ⏳ Fase 4                                   |
| `security/`                    | L3/L4                 | `StatefulFirewall`, `SecurityZone`                                        | Conexión trackeada, segmentación por zonas de seguridad                                                                            | ⏳ Fase 4 Bonus                             |

Notas sobre el mapeo:

- No es 1:1 estricto: OSI es un modelo mental para razonar sobre el código, no una regla de arquitectura. Las carpetas se organizan por responsabilidad (qué tipo de objeto o algoritmo es), no por replicar las 7 capas como estructura de directorios.
- `devices/` agrupa los **nodos** (las "cosas" con estado: tablas MAC, tablas de rutas, puertos). `protocols/` agrupa los **algoritmos/comportamientos** que esos nodos ejecutan (STP, RIP, OSPF, BGP).
- Cuando la Fase 2 introduzca direccionamiento IP real (subnetting, cálculo de máscaras), evaluar si necesita su propia carpeta (`addressing/`) en vez de vivir implícito en `packet/` — decisión pendiente, no adelantada por ahora (convención del proyecto: incremental, no over-engineering).
- Cada fila "✅" debería tener test en Vitest que demuestre el comportamiento de red descrito (ej. "el tercer frame entre los mismos hosts ya usa unicast en vez de flood").

## Referencia general OSI — devices y protocolos por capa

Tabla de referencia (no específica de este repo) con los devices y protocolos típicos de cada capa OSI. Útil para ubicar en qué capa cae cada concepto de CCNA a medida que se estudia.

| Capa | Nombre       | Devices                                                             | Protocolos / estándares                                                                                             |
| ---- | ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| L1   | Physical     | Hub, repeater, cable (coax/fibra/UTP), transceiver, media converter | Ethernet (specs físicas), DSL, Bluetooth (físico), USB, RS-232                                                      |
| L2   | Data Link    | Switch, bridge, NIC, AP (parte L2)                                  | Ethernet (framing), 802.1Q (VLAN tagging), STP/RSTP/MSTP, PPP, HDLC, Frame Relay, ARP (borde L2/L3), LACP, CDP/LLDP |
| L3   | Network      | Router, L3 switch (multilayer switch), firewall (parte L3)          | IP (IPv4/IPv6), ICMP, IPsec (parte), RIP/RIPv2, OSPF, IS-IS, EIGRP, BGP                                             |
| L4   | Transport    | Firewall (stateful), load balancer (modo L4)                        | TCP, UDP, SCTP                                                                                                      |
| L5   | Session      | —                                                                   | NetBIOS, RPC, PPTP, sesión de TLS, SIP (parte sesión)                                                               |
| L6   | Presentation | —                                                                   | TLS/SSL (cifrado), JPEG/MPEG, ASCII/Unicode                                                                         |
| L7   | Application  | Proxy, WAF, load balancer (modo L7)                                 | HTTP/HTTPS, DNS, DHCP, FTP, SMTP, SSH, Telnet, SNMP                                                                 |

El roadmap de este proyecto (`CLAUDE.md`) cubre L2–L4: Switch/STP/VLAN (Fase 1), Router/RIP/OSPF (Fase 2), BGP (Fase 3), ACL/NAT (Fase 4). L1 y L5–L7 quedan fuera de scope — el simulador se enfoca en el core de networking (dominios 2.0–5.0 del CCNA 200-301), no en el stack completo.
