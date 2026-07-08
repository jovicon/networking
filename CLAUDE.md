# CLAUDE.md — Network Lab Monorepo

Este archivo da contexto a Claude Code sobre el propósito, arquitectura y estado del proyecto.

## Propósito del proyecto

Simulador de red construido desde cero en TypeScript, con el objetivo de **aprender conceptos de networking (CCNA 200-301) programándolos** en vez de solo memorizarlos. El autor es un Global Solutions Architect (GSA) en Equinix que necesita entender a fondo arquitecturas de red de clientes (BGP, MPLS, SD-WAN, L2/L3) para posicionar productos Equinix (Fabric, Network Edge, Fabric Cloud Router).

El estudio de CCNA (vía Jeremy's IT Lab en YouTube) avanza en paralelo con la construcción de este simulador: cada concepto de networking que se aprende en teoría se implementa como código funcional en el `core`.

Carpeta `labs/` (fuera del workspace de pnpm, sin `package.json`) contiene notas y ejercicios sueltos de CCNA y otros cursos — no es parte del pipeline de build.

## Arquitectura

Monorepo con **pnpm workspaces + Turborepo**, siguiendo un bias de arquitectura hexagonal/DDD (mismo patrón que el autor usa profesionalmente en NestJS):

```
networking/
├── apps/
│   ├── web/                      # Next.js — visualización (React Flow, Zustand)
│   └── api/                      # NestJS — Fase 5, aún no implementada
│                                    (expondrá el simulator-engine vía REST,
│                                    pensada para reforzar el dominio 6.0 del CCNA:
│                                    Automation & Programmability)
├── packages/
│   ├── core/                     # Dominio puro: Device, Packet, Link, Switch, Router...
│   │                                Cero dependencias de UI. Testeable con Vitest.
│   ├── simulator-engine/         # Application layer: orquesta el core en el tiempo,
│   │                                emite eventos (EventBus) que consume la UI
│   └── shared-types/             # Tipos compartidos entre core y apps
├── LABS/                         # Notas y ejercicios de CCNA (fuera del workspace)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Regla de dependencias:** `apps/*` consume `packages/*`, nunca al revés. `packages/core` nunca debe saber que existe Next.js, NestJS ni ninguna UI.

**NestJS (`apps/api`)** se agrega deliberadamente tarde (Fase 5), cuando el estudio llegue al dominio de Automation & Programmability del CCNA — no antes, para no meter infraestructura innecesaria a un simulador que hoy es 100% client-side y determinístico.

## Stack técnico

| Área                    | Elección                            | Motivo                                                                   |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| Package manager         | pnpm (v11.x)                        | Workspaces + performance                                                 |
| Build orchestrator      | Turborepo                           | Cache de builds, filtros por paquete                                     |
| Testing                 | Vitest                              | Rápido, nativo ESM                                                       |
| Visualización           | Next.js 16 (Turbopack) + React Flow | Topología interactiva de nodos/edges                                     |
| Estado UI               | Zustand                             | Liviano para el estado de simulación en cliente                          |
| Futuro backend (Fase 5) | NestJS                              | Adapter REST sobre `simulator-engine`, con persistencia en MongoDB Atlas |

### Notas importantes de configuración (pnpm v11)

pnpm v11 cambió el mecanismo de aprobación de scripts de build. **Ya no se usa** `pnpm.onlyBuiltDependencies` en `package.json` (deprecado, se ignora silenciosamente). El reemplazo correcto vive en `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

allowBuilds:
  sharp: true
  unrs-resolver: true
```

Si aparece `ERR_PNPM_IGNORED_BUILDS`, la solución es `pnpm approve-builds` (interactivo) o editar `allowBuilds` manualmente en `pnpm-workspace.yaml`, nunca en `package.json`.

## Estado actual del código (actualizado 2026-07-08)

El scaffold del monorepo está listo (pnpm workspaces + Turborepo + Next.js). `packages/core` tiene implementadas y testeadas las 3 clases base de Fase 1 paso 1: `Packet`, `Device`, `Link`, con tests en Vitest. `Device`/`Link` ya son multi-puerto (Fase 1, paso 1.0, completado). `Switch` v1 (flooding puro, Fase 1 paso 2) también está completo. `simulator-engine` ya tiene `SimulatedClock` (Fase 1, paso 3.5, completado) — reloj lógico con `now()`/`advance()`/`scheduleAt()`, listo para inyectarse donde se necesite tiempo determinístico.

**Próximo paso concreto: Fase 1, paso 3 — Switch v2 (MAC learning + aging), usando `SimulatedClock` para el TTL de 300s.**

## Tooling de calidad (lint, format, git hooks, versionado)

- **ESLint (flat config, ESLint 9)**: `eslint.config.mjs` en la raíz cubre `packages/*` (typescript-eslint recommended + `no-restricted-imports` que bloquea que `packages/*` importe de `apps/*` o de frameworks de UI como `next`/`react`). `apps/web/eslint.config.mjs` mantiene su propio config con las reglas de `eslint-config-next`. Correr todo con `pnpm lint` (usa `turbo run lint`).
- **Prettier**: `.prettierrc.json` en la raíz, sin plugin de ESLint (corren por separado). `pnpm format` aplica, `pnpm format:check` solo valida (usado en CI/pre-commit).
- **Lefthook** (`lefthook.yml`): pre-commit corre `prettier --write` + `eslint --fix` solo sobre archivos staged; pre-push corre `pnpm typecheck` y `pnpm test`. Se instala solo vía `pnpm install` (hook de postinstall ya autorizado en `pnpm-workspace.yaml` → `allowBuilds.lefthook: true`).
- **Changesets** (`@changeset/cli`, config en `.changeset/config.json`): reemplaza el bump manual de versión. Flujo: `pnpm changeset` (declara qué paquete cambió y el tipo de bump) → en CI/merge a `main`, `pnpm version-packages` aplica el bump real a los `package.json` afectados + genera CHANGELOG. `apps/web` está en la lista `ignore` del config porque es una app privada, no un paquete versionable. No hay publish a ningún registry (proyecto de aprendizaje, no librería pública).
- `apps/web/package.json` ya no usa el patrón deprecado `pnpm.onlyBuiltDependencies` — se limpió, ahora todo vive en `allowBuilds` de `pnpm-workspace.yaml`.

## Roadmap de desarrollo (sincronizado con CCNA 200-301)

El plan completo son 16 semanas, dividido en fases. Progreso actual: **Fase 1, paso 3.5 completo** (SimulatedClock). Siguiente paso: **Fase 1, paso 3 (Switch v2 — MAC learning + aging)**, ya con el reloj simulado disponible.

Convención de esta sección: cada paso lista (a) qué archivo(s) se crean/modifican, (b) qué comportamiento de red concreto demuestra, (c) qué test lo prueba. Objetivo: cualquier paso se puede tomar de forma aislada sin tener que re-derivar decisiones de diseño.

Además de las fases CCNA, cada capa tiene una **fase bonus** inmediatamente después (Fase 1 Bonus, Fase 2 Bonus, etc.) con conceptos de arquitectura más avanzados, orientados a conversaciones reales de cliente en el rol de GSA en Equinix (SD-WAN, MPLS-adyacente, overlay/underlay, interconexión multi-cloud) — mismo rigor código+test que CCNA, CCNA no se mezcla ni se renumera. Fase 5 no tiene bonus (es infraestructura, no una capa de red).

### Fase 1 — Switching (Capa 2)

Dominio CCNA 2.0 (Network Access).

**Paso 1 — Clases base (✅ completo).**

- Archivos: `packet/Packet.ts`, `devices/Device.ts`, `topology/Link.ts`.
- Comportamiento: frame L2 mínimo (MAC origen/destino + payload), entrega punto a punto síncrona, filtrado por MAC destino o broadcast.
- Tests: `Packet.test.ts`, `Device.test.ts`, `Link.test.ts`.

**Paso 1.0 — Rediseño multi-puerto de Device/Link (✅ completo, prerequisito de Switch v1).**

- Archivos: `devices/Device.ts` (agrega `Port`, `Map<string, Port>` interno, `connect()` devuelve `portId` y ya no lanza error en el segundo link, nuevo `sendFrom(packet, portId)`, `receive(packet, inPortId)` gana segundo parámetro), `topology/Link.ts` (`getOtherEnd()` devuelve `{ device, portId }`, constructor acepta `portIdA?`/`portIdB?`).
- Comportamiento: un device físico real (switch, router) tiene múltiples interfaces, cada una con su propio estado de conexión — prerequisito conceptual de todo lo que sigue.
- Tests: `Device.test.ts` (`'permite conectar un segundo link en un puerto distinto'`, `'sendFrom() entrega el packet por el puerto especificado sin afectar otros puertos'`, `'receive() recibe el portId de entrada (usado por subclases como Switch)'`), `Link.test.ts` (`getOtherEnd`/`transmit` con la nueva firma). Nota de diseño: Device sigue sin saber de MAC tables — eso es responsabilidad exclusiva de Switch (paso 2).

**Paso 2 — Switch v1: flooding puro (✅ completo).**

- Archivos: `devices/Switch.ts` (extiende `Device`), `devices/Switch.test.ts`.
- Comportamiento: sin tabla MAC — todo frame que llega por un puerto se reenvía (`sendFrom`) por todos los demás puertos conectados excepto el de entrada, sea unicast o broadcast.
- Ejemplo: topología de 1 switch + 3 PCs (`pc1`, `pc2`, `pc3`). `pc1` envía unicast a `pc2` → tanto `pc2` como `pc3` lo reciben en `getReceivedPackets()` (pc3 lo descarta por destMac no coincidente, pero le llegó).
- Test: `'Switch floodea un frame unicast a todos los puertos excepto el de entrada'`.

**Paso 3 — Switch v2: MAC learning + aging.**

- Archivos: modifica `devices/Switch.ts`, agrega `Map<string, { portId: string; expiresAt: number }>` (mac → puerto + expiración). Depende del paso 3.5 (tiempo simulado) para el aging real.
- Comportamiento: cada frame que llega enseña `sourceMac → inPortId`. Si `destMac` ya está en la tabla, unicast solo por ese puerto; si no, floodea. Entrada expira a los 300s de inactividad (TTL Cisco real).
- Ejemplo: primer frame `pc1→pc2` floodea (MAC de pc2 desconocida); frame `pc2→pc1` enseña la MAC de pc2; **el tercer frame `pc1→pc2` ya usa unicast** (no floodea a pc3).
- Tests: `'aprende la MAC origen y el puerto de entrada en cada frame'`, `'el tercer frame entre los mismos hosts ya usa unicast en vez de flood'`, `'una entrada expira a los 300s de inactividad y vuelve a floodear'`.

**Paso 3.5 — Tiempo simulado (`SimulatedClock` en `simulator-engine`) — prerequisito de aging, STP timers, y RIP holddown de Fase 2 (✅ completo).**

- Archivos: `packages/simulator-engine/src/clock/SimulatedClock.ts`, `SimulatedClock.test.ts`.
- Diseño: reloj lógico propio (no `Date.now()` real — determinismo total), `advance(ms)` avanza el tiempo y ejecuta callbacks con `deadline <= now`, `now()`, `scheduleAt(deadline, callback)`. `core` recibe un reloj inyectado (interfaz `Clock` con solo `now()`) para no acoplar `core` a `simulator-engine` — `core` permanece dominio puro.
- Comportamiento: todo temporizador de red real (MAC aging, STP hello/forward-delay, RIP timers, TCP retransmit) es "si pasa X tiempo sin evento Y, hacer Z" — este es el motor genérico detrás de esa lógica.
- Tests: `'advance() ejecuta un callback programado cuando el tiempo llega a su deadline'`, `'advance() no ejecuta callbacks cuyo deadline aún no llegó'`.

**Paso 3.6 — EventBus mínimo (`simulator-engine`) — prerequisito de la UI.**

- Archivos: `packages/simulator-engine/src/events/EventBus.ts` (+ test), tipos de evento (`PacketSentEvent`, `PacketReceivedEvent`, `MacLearnedEvent`, `MacExpiredEvent`).
- Comportamiento: capa fina que traduce las llamadas de `Device`/`Switch`/`SimulatedClock` en eventos observables (`on(eventType, handler)` / `emit(eventType, payload)`) — no agrega comportamiento de red nuevo, solo hace observable lo que ya existe en `core`. `simulator-engine` orquesta: crea las instancias de `Device`/`Switch` con el `SimulatedClock` inyectado, y emite un evento cada vez que algo relevante pasa.
- Tests: `'emite packetSent cuando un Device envía un packet'`, `'emite packetReceived cuando un Device recibe un packet'`, `'emite macLearned cuando un Switch aprende una MAC nueva'`.

**Paso 3.7 — Inicio del simulador visual (`apps/web`).**

- Archivos: instala React Flow + Zustand (ya en el stack técnico, sin usar todavía); `apps/web/features/topology-editor/` (canvas con nodos=Device/Switch, edges=Link, arquitectura Screaming/Feature-Sliced ya definida), `apps/web/features/packet-simulation/` (se suscribe al EventBus del paso 3.6, anima el paquete viajando por el Link correspondiente).
- Comportamiento: primera versión visual del proyecto — topología estática renderizada + animación en vivo del escenario ya construido en el paso 3 (frame 1 floodea visualmente a todos los puertos, frame 3 va directo por unicast). Se elige este punto y no antes porque es el primer momento donde hay algo genuinamente dinámico que mostrar (flood→unicast); antes de esto la UI solo tendría cajas estáticas sin comportamiento que anime.
- Verificación: manual, no Vitest — correr `pnpm --filter web dev`, armar la topología del paso 3 (1 switch + 3 PCs) en el canvas, disparar el escenario y confirmar visualmente el cambio de flood a unicast tras el tercer frame.

**Paso 4 — VLANs (802.1Q, access/trunk).**

- Archivos: modifica `devices/Switch.ts` (`Map<portId, { mode: 'access'|'trunk'; vlanId?: number }>` — config propia de Switch, no de `Port` de Device), modifica `packet/Packet.ts` (campo opcional `vlanId?: number`).
- Comportamiento: MAC learning pasa a ser por VLAN (`Map<vlanId, Map<mac, portId>>`). Puerto trunk reenvía múltiples VLANs con tag 802.1Q; puerto access pertenece a una sola VLAN y nunca ve el tag.
- Ejemplo: `pc1` (VLAN 10, access) envía broadcast — solo puertos access de VLAN 10 + puerto trunk lo reciben; `pc2` en VLAN 20 del mismo switch no lo recibe.
- Tests: `'un frame broadcast en VLAN 10 no llega a un host en VLAN 20 del mismo switch'`, `'un puerto trunk reenvía frames de VLAN 10 y VLAN 20 con el tag correcto'`.

**Paso 5 — Topología multi-switch (puente antes de STP).**

- Archivos: ninguno de producción — tests de integración conectando 2+ `Switch` entre sí (`Switch.integration.test.ts`).
- Comportamiento: `switch1`↔`switch2` conectados, `pc1` (en switch1) hablando con `pc2` (en switch2) — cada switch aprende la MAC de pc1 en su puerto de subida/bajada. Se introduce deliberadamente un **loop redundante** (2 links en paralelo entre switch1 y switch2) para que STP tenga un problema real que resolver.
- Ejemplo: sin STP, un broadcast entre switch1↔switch2 con 2 links en paralelo entra en loop infinito — test debe usar límite de iteraciones/tiempo simulado para no colgar, y documentarse como "falla a propósito" motivando el paso 6.
- Tests: `'MAC aprendida en switch1 es distinta según si pc2 está detrás de switch1 o switch2'`, `'una topología con 2 links redundantes entre switch1 y switch2 genera loop de broadcast sin STP'`.

**Paso 6 — STP simplificado.**

- Archivos: `protocols/Stp.ts` (carpeta ya existe vacía), integra con `devices/Switch.ts` (`blockedPorts: Set<string>` propio de Switch, no se toca `Port` de Device).
- Comportamiento: elección de root bridge (menor Bridge ID = priority + MAC), costo de path a la raíz, bloqueo del puerto redundante en el switch no-raíz — elimina el loop del paso 5. Requiere reloj simulado (paso 3.5) para timers BPDU.
- Ejemplo: topología con loop del paso 5, tras correr STP, exactamente uno de los 2 links queda con puerto en `blocking` en el switch no-raíz — el test de loop del paso 5 ahora debe terminar, no colgar.
- Tests: `'el switch con menor Bridge ID es elegido root bridge'`, `'el link redundante queda con un puerto en blocking en el switch no-raíz'`, `'con STP activo, el mismo escenario de loop del paso 5 ya no genera flood infinito'`.

### Fase 1 Bonus — L2 Arquitecto (Equinix/GSA)

Conceptos de arquitectura L2 más allá de CCNA, relevantes a conversaciones de cliente sobre interconexión (Equinix Fabric, Network Edge). Misma convención que el resto del roadmap: archivo + comportamiento + test.

**Paso B1.1 — LACP / EtherChannel (agregación de enlaces).**

- Archivos: extiende `devices/Switch.ts` con el concepto de `PortChannel` (grupo de portIds tratados como 1 puerto lógico) — config propia de Switch, igual que VLAN.
- Comportamiento: 2+ links físicos paralelos entre switch1-switch2 se agrupan en un PortChannel — desde afuera se ven como 1 solo puerto lógico. Si un link miembro cae, el tráfico sigue fluyendo por los miembros restantes.
- Ejemplo: `switch1` y `switch2` conectados por `linkA` y `linkB` agrupados en un PortChannel; un frame se sigue entregando correctamente aunque `linkA` se desconecte.
- Tests: `'un PortChannel agrupa 2 links físicos en 1 puerto lógico'`, `'si un link miembro del PortChannel cae, el tráfico sigue fluyendo por los miembros restantes'`.

**Paso B1.2 — VXLAN lite (segmentación por VNI, túnel modelado como Link directo).**

- Archivos: `protocols/Vxlan.ts`, compone un header VXLAN (VNI numérico) alrededor del frame — mismo patrón que el tag de VLAN (Fase 1 paso 4), pero el VNI identifica un dominio de broadcast estirado sobre un túnel en vez de un puerto local.
- Comportamiento: dos switches en sitios distintos, unidos por un túnel VXLAN (acá modelado como un `Link` directo entre 2 "VTEPs" — el transporte real sobre IP multi-hop se resuelve en el paso B2.3). Un frame que entra por un puerto access en VNI 5000 sale encapsulado con ese VNI; el otro extremo desencapsula y solo lo entrega a puertos del mismo VNI.
- Ejemplo: `pc1` (sitio A, VNI 5000) y `pc2` (sitio B, VNI 5000) se comportan como si estuvieran en la misma LAN aunque están en switches físicamente distintos; un `pc3` en VNI 6000 del sitio B no recibe el broadcast de `pc1`.
- Tests: `'un frame encapsulado en VNI 5000 solo se entrega a puertos del mismo VNI en el otro extremo del túnel'`, `'dos hosts en sitios distintos con el mismo VNI se comportan como si estuvieran en la misma LAN'`.
- Nota de secuencia: versión "lite" (túnel = Link directo). La versión con underlay IP real enrutado es el paso B2.3.

**Paso B1.3 — RSTP (802.1w) — convergencia rápida.**

- Archivos: `protocols/Rstp.ts` o extiende `protocols/Stp.ts` con roles de puerto (root/designated/alternate/backup).
- Comportamiento: mismo problema de loop de Fase 1 paso 5, pero RSTP converge en significativamente menos ticks de tiempo simulado que 802.1D clásico.
- Test: `'RSTP converge al mismo estado final que STP clásico (mismo puerto bloqueado) pero en menos tiempo simulado'`.

### Fase 2 — Routing (Capa 3)

Dominio CCNA 3.0 (IP Connectivity).

**Paso 1 — Direccionamiento IP + Router básico.**

- Archivos: extensión de `Packet` con capa IP (evaluar composición vs herencia al implementar — L3 encapsula L2, no lo reemplaza), `devices/Router.ts` (extiende `Device`, multi-puerto ya heredado del paso 1.0), tabla de rutas estática.
- Comportamiento: Router recibe frame L2, desencapsula IP, decide siguiente salto por longest-prefix-match, reencapsula y reenvía.
- Test: `'un Router con ruta estática reenvía un paquete IP al puerto correcto según longest-prefix-match'`.

**Paso 1.5 — ARP (resolución IP → MAC).**

- Archivos: `protocols/Arp.ts`, integra con `Device`/`Router` (cache con expiración, reusa `Clock` del paso 3.5).
- Comportamiento: ARP request broadcast antes del primer frame de datos a un destino desconocido; cache resultante con TTL (mismo patrón que MAC aging).
- Ejemplo: primer paquete `pc1→pc2` genera ARP request antes del frame de datos; segundo paquete usa el cache, sin ARP request.
- Tests: `'el primer paquete a un destino desconocido genera un ARP request antes del frame de datos'`, `'el segundo paquete al mismo destino no genera ARP request (usa el cache)'`.

**Paso 2 — Vector-distancia (tipo RIP), incluyendo el problema que motiva link-state.**

- Archivos: `protocols/DistanceVectorProtocol.ts`.
- Comportamiento: cada Router anuncia periódicamente (reloj simulado, update timer 30s) su tabla a vecinos directos; recalculan hop count.
- **Sub-paso obligatorio — count-to-infinity:** topología de 3 routers en cadena (R1↔R2↔R3), R3 anuncia una red directa. Cuando ese link cae, sin split-horizon, R1 y R2 se anuncian rutas obsoletas mutuamente incrementando hop count indefinidamente (hasta 16 = "infinito" en RIP real). Punto pedagógico central: la lección de "por qué link-state es mejor" no tiene peso sin ver el problema primero.
- Luego implementar split-horizon (no anunciar de vuelta al vecino del que se aprendió la ruta) y mostrar que el count-to-infinity ya no ocurre en el mismo escenario.
- Tests: `'sin split-horizon, la caída de una red genera count-to-infinity entre R1 y R2'`, `'con split-horizon activo, R1 nunca reanuncia a R2 una ruta aprendida de R2'`, `'con split-horizon, la convergencia tras la caída de la red es correcta'`.

**Paso 3 — Link-state (tipo OSPF, área única) — contraste explícito con RIP.**

- Archivos: `protocols/LinkStateProtocol.ts` (incluye Dijkstra sobre el grafo de topología conocida).
- Comportamiento: cada Router construye una LSDB completa y corre Dijkstra localmente, en vez de confiar en lo que dicen los vecinos "de oídas". Se re-corre el MISMO escenario de caída de red del paso 2 (3 routers en cadena) — convergencia inmediata y correcta, sin pasar por hop-count creciente.
- Tests: `'Dijkstra calcula el camino más corto correcto sobre una topología de N routers'`, `'tras la caída de una red, link-state converge sin pasar por count-to-infinity (contraste directo con el test de RIP sin split-horizon)'`.

### Fase 2 Bonus — L3 Arquitecto (Equinix/GSA)

**Paso B2.1 — HSRP / VRRP (redundancia de default gateway).**

- Archivos: `protocols/Fhrp.ts` (First-Hop Redundancy Protocol genérico — HSRP y VRRP son variantes del mismo patrón), integra con `devices/Router.ts`.
- Comportamiento: 2 routers comparten una IP/MAC virtual; uno activo (responde), otro standby (monitorea vía hello, usa `Clock` del paso 3.5). Si el activo deja de enviar hellos, el standby asume la IP/MAC virtual sin que los hosts cambien su gateway configurado.
- Ejemplo: `router1` (activo) y `router2` (standby) comparten `10.0.0.1`/MAC virtual; `router1` deja de responder; tras el timeout, `router2` responde por esa misma IP/MAC.
- Tests: `'el router standby asume la IP/MAC virtual cuando el activo deja de enviar hellos'`, `'un host sigue alcanzando el gateway virtual sin reconfigurar nada tras el failover'`.

**Paso B2.2 — Túnel GRE (encapsulación punto a punto).**

- Archivos: `protocols/Gre.ts`, encapsula un paquete IP completo dentro de otro paquete IP entre 2 tunnel endpoints.
- Comportamiento: dos routers no directamente conectados, unidos por una red intermedia de N saltos, se comunican como si tuvieran 1 solo link lógico directo — prerequisito conceptual de VPN/SD-WAN (paso B3.2).
- Ejemplo: `router1` y `router3` (separados por `router2` intermedio) intercambian tráfico encapsulado en GRE; desde la tabla de rutas de `router1`, `router3` aparece como 1 solo salto.
- Test: `'un túnel GRE hace que 2 routers no adyacentes se vean como 1 solo salto lógico'`.

**Paso B2.3 — VXLAN real (underlay IP enrutado, upgrade del paso B1.2).**

- Archivos: modifica `protocols/Vxlan.ts` del paso B1.2 — el túnel entre VTEPs ahora viaja sobre un underlay de `Router`s reales (multi-hop), no un `Link` directo.
- Comportamiento: mismo comportamiento observable de B1.2 (aislamiento por VNI), pero el túnel ahora sobrevive un underlay enrutado de múltiples saltos — el modelo real de cómo Equinix Network Edge/Fabric extiende L2 entre datacenters.
- Test: `'un túnel VXLAN funciona correctamente cuando el underlay entre VTEPs tiene 2+ saltos de Router en el medio'`.

### Fase 3 — BGP simplificado

**Paso 0 — Puente multi-AS (prerequisito explícito).**

- Archivos: ninguno de protocolo todavía — construye topología de 2+ "Autonomous Systems", cada uno con su propio dominio de routing de Fase 2 corriendo puertas adentro, conectados por routers de borde (puerto hacia AS propio, puerto hacia AS vecino).
- Comportamiento: BGP existe porque el routing intra-dominio no escala ni tiene sentido de confianza entre organizaciones distintas — sin este puente, Fase 3 empieza sin motivación visible.
- Tests: `'un router de borde participa en el IGP de su propio AS pero no en el del AS vecino'`, `'dos ASes conectados por un router de borde cada uno pueden intercambiarse alcance de red sin compartir su tabla de routing interna completa'`.

**Paso 1 — AS-path y selección de ruta.**

- Archivos: `protocols/Bgp.ts`.
- Comportamiento: anuncio BGP lleva AS-path; selección por AS-path más corto (simplificación deliberada — BGP real tiene ~13 criterios, se empieza simple).
- Ejemplo: 3 ASes en triángulo (AS100↔AS200↔AS300, y AS100↔AS300 directo) — AS100 prefiere la ruta directa a AS300 (AS-path length 1) sobre la vía AS200 (length 2). Relevancia directa a peering/Fabric Cloud Router de Equinix.
- Tests: `'BGP prefiere la ruta con AS-path más corto entre 2 alternativas'`, `'un AS-path que incluye el AS propio es rechazado (loop prevention)'`.

### Fase 3 Bonus — BGP / WAN Arquitecto (Equinix/GSA)

Fase con más peso profesional directo: responde topologías con nombre (hub-spoke) y modela el producto real de Equinix (Fabric Cloud Router).

**Paso B3.1 — Hub-spoke vs full-mesh.**

- Archivos: ningún archivo de protocolo nuevo — tests de topología usando `Router`/`Bgp` ya existentes, construyendo ambas formas con el mismo N de sitios.
- Comportamiento: en hub-spoke (N-1 links), el tráfico spoke-a-spoke DEBE transitar por el hub — no existe ruta directa. En full-mesh (N×(N-1)/2 links), cada sitio tiene ruta directa a todos los demás. Esta es la razón real por la que las empresas eligen hub-spoke (costo) sobre full-mesh (resiliencia/latencia).
- Ejemplo: topología de 4 sitios en hub-spoke — tráfico de spoke2 a spoke3 pasa necesariamente por el hub (2 saltos); la misma topología en full-mesh tiene ruta directa (1 salto).
- Tests: `'en hub-spoke, el tráfico entre 2 spokes transita necesariamente por el hub (no existe ruta directa)'`, `'en full-mesh, cualquier par de sitios tiene ruta directa'`, `'hub-spoke con N sitios usa N-1 links; full-mesh usa N*(N-1)/2'`.

**Paso B3.2 — SD-WAN: selección de ruta por política.**

- Archivos: `protocols/SdWanPolicy.ts`, integra con `devices/Router.ts` — un sitio con 2+ uplinks WAN (2 `Link`s paralelos a next-hops distintos, cada uno con métrica simulada de latencia/costo).
- Comportamiento: en vez de un único camino estático, una política elige el uplink según el tipo de tráfico marcado en el `Packet` (ej. voz → menor latencia, bulk → menor costo). Diferenciador central real de SD-WAN sobre WAN tradicional (MPLS puro).
- Ejemplo: `sitioA` tiene `uplinkMPLS` (baja latencia, alto costo) y `uplinkInternet` (alta latencia, bajo costo); tráfico marcado voz sale por `uplinkMPLS`, tráfico bulk por `uplinkInternet`.
- Test: `'la política SD-WAN elige el uplink de menor latencia para tráfico de voz y el de menor costo para tráfico bulk'`.

**Paso B3.3 — Atributos BGP: local-preference.**

- Archivos: modifica `protocols/Bgp.ts` (Fase 3 paso 1) — agrega `localPreference` como criterio evaluado ANTES que AS-path length (orden real de selección BGP).
- Comportamiento: contrasta con Fase 3 paso 1 (solo AS-path más corto) — un local-preference más alto gana la selección aunque su AS-path sea más largo.
- Test: `'una ruta con local-preference más alto gana la selección aunque tenga un AS-path más largo'`.

**Paso B3.4 — Capstone: interconexión multi-cloud vía fabric neutral (modelo Fabric Cloud Router).**

- Archivos: ningún archivo nuevo — topología de integración combinando `Bgp.ts` + `SdWanPolicy.ts` + `Vxlan.ts` ya construidos.
- Comportamiento: `AS100` simula una VPC de AWS, `AS200` un VNet de Azure, `AS300` un datacenter on-prem, todos conectados a `AS999` (simula a Equinix como fabric neutral) en topología hub-spoke (paso B3.1). `AS100` y `AS200` intercambian alcance de red a través de `AS999` sin link directo entre sí ni confiar en el IGP interno del otro — el modelo real de peering sin tránsito que vende Fabric Cloud Router.
- Tests: `'AS100 y AS200 intercambian alcance de red a través de AS999 sin tener link directo entre sí'`, `'AS999 no expone las rutas internas del IGP de AS100 hacia AS200, solo el alcance BGP anunciado'`.

### Fase 4 — Firewall / NAT

Dominio CCNA 4.0/5.0 (IP Services, Security Fundamentals).

**Paso 1 — ACLs.**

- Archivos: `Acl.ts` (ubicación exacta pendiente — `devices/` vs carpeta `security/` propia, decisión al implementar).
- Comportamiento: lista ordenada de reglas permit/deny por IP/puerto; primera regla que matchea gana; deny implícito al final (comportamiento real Cisco).
- Tests: `'un paquete que no matchea ninguna regla explícita es denegado por el deny implícito'`, `'el orden de las reglas importa: una regla deny antes que una permit más específica bloquea el tráfico'`.

**Paso 2 — NAT.**

- Archivos: `Nat.ts`.
- Comportamiento: IP privada → pública, estático primero, luego PAT/overload con puertos.
- Test: `'dos hosts internos con NAT overload comparten la misma IP pública pero puertos distintos'`.

### Fase 4 Bonus — Seguridad Arquitecto (Equinix/GSA)

**Paso B4.1 — Firewall stateful (conexión trackeada).**

- Archivos: `security/StatefulFirewall.ts` (ubicación exacta junto a `Acl.ts`/`Nat.ts`, a decidir al implementar), agrega `Map<flowKey, { expiresAt }>` de conexiones trackeadas.
- Comportamiento: tráfico saliente crea una entrada de flow trackeado; solo el tráfico de retorno que matchea esa entrada se permite automáticamente — contrasta con el ACL stateless de Fase 4 paso 1, donde cada dirección necesita su propia regla explícita.
- Ejemplo: `pc1` (interno) inicia conexión a `server1` (externo) — la respuesta de `server1` se permite automáticamente sin regla ACL explícita; un intento de conexión no solicitada desde `server1` hacia `pc1` se deniega aunque no exista ninguna regla ACL que la bloquee.
- Tests: `'el tráfico de retorno de una conexión saliente se permite automáticamente sin regla ACL explícita'`, `'tráfico entrante no solicitado se deniega aunque no haya una regla ACL que lo bloquee explícitamente'`.

**Paso B4.2 — Segmentación por zonas de seguridad.**

- Archivos: `security/SecurityZone.ts`, matriz de políticas por par de zonas en vez de ACLs por interfaz.
- Comportamiento: dispositivos se agrupan en zonas (`trusted`, `dmz`, `untrusted`); la política se define por par-de-zonas — modelo real de arquitectura de datacenter/empresa.
- Ejemplo: política `dmz→untrusted: permit http/https`, `untrusted→trusted: deny all` — un host en `dmz` puede servir HTTP a `untrusted`, pero `untrusted` no puede iniciar nada hacia `trusted`.
- Test: `'la política de zona dmz→untrusted permite HTTP/HTTPS pero la política untrusted→trusted deniega todo'`.

### Fase 5 — API & Persistencia — pendiente

Dominio CCNA 6.0 (Automation & Programmability). Se agrega `apps/api` (NestJS) como adapter REST sobre `simulator-engine`, con persistencia de topologías en MongoDB Atlas. Doble propósito: reforzar el tema del examen y dar persistencia real al proyecto. La API expondrá operaciones sobre `simulator-engine`, incluyendo el reloj simulado del paso 3.5 (ej. endpoint para avanzar la simulación) — forma exacta pendiente de decisiones de NestJS aún no tomadas.

## Convenciones de código

- Cada concepto de networking se implementa **incrementalmente**: primero la versión más simple (ej. flooding puro), luego se agrega complejidad (MAC learning, luego VLANs, luego STP) — no saltar directo a la versión completa.
- Cada fase debe tener tests en Vitest que demuestren el comportamiento (ej. "el tercer frame entre los mismos hosts ya usa unicast en vez de flood").
- Buena práctica de validación: replicar la misma topología en Cisco Packet Tracer y comparar el comportamiento (`show mac address-table`, `show vlan brief`, etc.) contra la simulación propia.
- El `core` es puro TypeScript sin dependencias externas más allá de utilidades mínimas — nunca debe importar nada de `apps/`.

## Arquitectura de software — principio general

Este proyecto es también un ejercicio de buenas prácticas de arquitectura, no solo de networking. Toda decisión de estructura de código debe apuntar a esto, independientemente de la capa:

### Frontend (`apps/web`) — Screaming/Feature-Sliced Architecture

Organizar por **feature/dominio**, no por tipo técnico de archivo. Evitar carpetas planas tipo `components/`, `hooks/`, `utils/` como primer nivel — en su lugar, cada slice agrupa todo lo que necesita para funcionar de forma autocontenida:

```
apps/web/
├── app/                       # rutas de Next.js (App Router) — solo composición
├── features/
│   ├── topology-editor/       # slice: edición de topología en el canvas
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/              # Zustand store del feature
│   │   └── types.ts
│   ├── packet-simulation/     # slice: animación de paquetes viajando por la red
│   │   ├── components/
│   │   ├── hooks/
│   │   └── store/
│   └── device-inspector/      # slice: panel de detalle de un dispositivo seleccionado
├── shared/                    # UI kit, utilidades genéricas reusadas entre features
│   ├── ui/
│   └── lib/
└── entities/                  # modelos de UI compartidos entre features (ej. "Device" visual)
```

Reglas:

- Un `feature` puede importar de `shared/` y `entities/`, pero **no** de otro `feature` directamente (si dos features necesitan compartir lógica, esa lógica sube a `shared/` o `entities/`).
- Cada slice es reemplazable/eliminable sin romper el resto de la app.
- La capa `app/` (rutas) solo compone features, no contiene lógica de negocio ni de UI compleja.

### Backend (`apps/api`, Fase 5) — Clean Architecture

Cuando se implemente el NestJS de la Fase 5, seguir separación estricta en capas, con las dependencias apuntando siempre hacia adentro:

```
apps/api/src/
├── domain/                    # entidades y reglas de negocio puras, sin frameworks
├── application/                # casos de uso (use cases), orquestan el domain
│   └── use-cases/
├── infrastructure/             # adapters concretos: MongoDB, controllers HTTP, etc.
│   ├── http/                   # controllers NestJS, DTOs
│   └── persistence/             # repositorios concretos (Mongo)
└── main.ts
```

Reglas:

- `domain/` no importa nada de NestJS, Mongo, ni ningún framework — es TypeScript puro (mismo espíritu que `packages/core`).
- `application/` depende de interfaces (puertos), nunca de implementaciones concretas de infraestructura.
- `infrastructure/` es la única capa que conoce detalles técnicos (decoradores de NestJS, driver de Mongo, etc.) e implementa las interfaces que `application/` define.
- Mismo patrón que el autor ya usa profesionalmente en NestJS (VRA20 en AFP Capital/SURA) — consistencia intencional entre el proyecto personal y el estilo de trabajo profesional.

### Regla transversal

Independientemente de la capa (frontend, backend, o `packages/core`), toda decisión de estructura debe preguntarse: _¿esto aísla el negocio/dominio de los detalles técnicos, y es fácil de testear sin levantar infraestructura?_ Si la respuesta es no, revisar el diseño antes de seguir agregando código.

## Contexto adicional del autor

- Background: Senior Software Engineer / Tech Lead (NestJS, GCP Cloud Run, MongoDB Atlas, arquitectura hexagonal/DDD).
- Estudiando CCNA 200-301 con Jeremy's IT Lab (YouTube) + Cisco Packet Tracer / GNS3 para labs.
- Objetivo profesional: pasar de conocimiento teórico de networking a intuición real sobre arquitecturas de cliente, para diferenciarse como GSA en Equinix.
