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

## Estado actual del código (actualizado 2026-07-04)

El scaffold del monorepo está listo (pnpm workspaces + Turborepo + Next.js), pero **el dominio de `packages/core` todavía no tiene código**: `devices/`, `packet/`, `protocols/` y `topology/` existen como carpetas vacías, y `src/index.ts` es un stub. Aún no hay ningún test (`*.test.ts`) — `vitest run` falla con "No test files found" en `core` y `simulator-engine` hasta que exista la primera clase de dominio con su test.

## Tooling de calidad (lint, format, git hooks, versionado)

- **ESLint (flat config, ESLint 9)**: `eslint.config.mjs` en la raíz cubre `packages/*` (typescript-eslint recommended + `no-restricted-imports` que bloquea que `packages/*` importe de `apps/*` o de frameworks de UI como `next`/`react`). `apps/web/eslint.config.mjs` mantiene su propio config con las reglas de `eslint-config-next`. Correr todo con `pnpm lint` (usa `turbo run lint`).
- **Prettier**: `.prettierrc.json` en la raíz, sin plugin de ESLint (corren por separado). `pnpm format` aplica, `pnpm format:check` solo valida (usado en CI/pre-commit).
- **Lefthook** (`lefthook.yml`): pre-commit corre `prettier --write` + `eslint --fix` solo sobre archivos staged; pre-push corre `pnpm typecheck` y `pnpm test`. Se instala solo vía `pnpm install` (hook de postinstall ya autorizado en `pnpm-workspace.yaml` → `allowBuilds.lefthook: true`).
- **Changesets** (`@changeset/cli`, config en `.changeset/config.json`): reemplaza el bump manual de versión. Flujo: `pnpm changeset` (declara qué paquete cambió y el tipo de bump) → en CI/merge a `main`, `pnpm version-packages` aplica el bump real a los `package.json` afectados + genera CHANGELOG. `apps/web` está en la lista `ignore` del config porque es una app privada, no un paquete versionable. No hay publish a ningún registry (proyecto de aprendizaje, no librería pública).
- `apps/web/package.json` ya no usa el patrón deprecado `pnpm.onlyBuiltDependencies` — se limpió, ahora todo vive en `allowBuilds` de `pnpm-workspace.yaml`.

## Roadmap de desarrollo (sincronizado con CCNA 200-301)

El plan completo son 16 semanas, dividido en fases. Progreso actual: **Fase 1 no iniciada en código** (solo scaffold de carpetas).

### Fase 1 — Switching (Capa 2) — SIGUIENTE PASO

Dominio CCNA 2.0 (Network Access). Implementar en `packages/core/src/devices/Switch.ts`:

1. `Device`, `Packet`/`Frame`, `Link` — clases base (setup)
2. Switch v1: flooding puro (sin tabla MAC) — para sentir la ineficiencia
3. Switch v2: MAC learning real + aging (`Map<MAC, puerto>`, TTL 300s como Cisco real)
4. Soporte de VLANs (access/trunk, 802.1Q tagging, MAC learning _por VLAN_)
5. STP simplificado (elección de root bridge, bloqueo de puerto redundante para romper loops)

### Fase 2 — Routing (Capa 3) — pendiente

Dominio CCNA 3.0 (IP Connectivity). `Router` con tabla de rutas, routing estático, vector-distancia simplificado (tipo RIP), luego link-state con Dijkstra (tipo OSPF de área única).

### Fase 3 — BGP simplificado — pendiente

Sistemas autónomos, AS-path, selección de ruta por shortest AS-path. Relevancia directa con el trabajo en Equinix (peering, Fabric Cloud Router).

### Fase 4 — Firewall / NAT — pendiente

Dominio CCNA 4.0 y 5.0 (IP Services, Security Fundamentals). ACLs (permitir/denegar por IP/puerto), NAT básico (IP privada → pública).

### Fase 5 — API & Persistencia — pendiente

Dominio CCNA 6.0 (Automation & Programmability). Se agrega `apps/api` (NestJS) como adapter REST sobre `simulator-engine`, con persistencia de topologías en MongoDB Atlas. Doble propósito: reforzar el tema del examen y dar persistencia real al proyecto.

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
