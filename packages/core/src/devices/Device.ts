import type { Packet } from '../packet/Packet';
import type { Link } from '../topology/Link';

export interface DeviceOptions {
  id: string;
  name?: string;
  mac: string;
}

export interface Port {
  readonly id: string;
  link: Link | null;
}

/**
 * Nodo base de la topología. Multi-puerto desde la base: cada Device tiene
 * un conjunto de puertos identificados por id ("port0", "port1"...), cada
 * uno con a lo sumo un Link conectado. Switch/Router (fases siguientes)
 * usan múltiples puertos para floodear, aprender MACs por puerto, rutear, etc.
 * Device en sí NO sabe de MAC tables ni forwarding — solo expone la
 * estructura de puertos para que las subclases construyan lógica sobre ella.
 */
export class Device {
  readonly id: string;
  readonly name: string;
  readonly mac: string;

  private readonly ports = new Map<string, Port>();
  private nextPortIndex = 0;
  private readonly receivedPackets: Packet[] = [];

  constructor(options: DeviceOptions) {
    if (!options.id) {
      throw new Error('Device requiere id');
    }

    if (!options.mac) {
      throw new Error('Device requiere mac');
    }

    this.id = options.id;
    this.mac = options.mac;
    this.name = options.name ?? options.id;
  }

  /**
   * Conecta un link a un puerto. Si no se especifica portId, autoasigna
   * el siguiente disponible ("port0", "port1", ...). Solo lanza error si
   * el portId específico ya está ocupado por otro link.
   */
  connect(link: Link, portId?: string): string {
    const resolvedPortId = portId ?? this.allocatePortId();
    const existing = this.ports.get(resolvedPortId);
    if (existing?.link) {
      throw new Error(
        `Device ${this.id} ya tiene un link conectado en el puerto ${resolvedPortId}`,
      );
    }
    this.ports.set(resolvedPortId, { id: resolvedPortId, link });
    return resolvedPortId;
  }

  private allocatePortId(): string {
    let candidate: string;
    do {
      candidate = `port${this.nextPortIndex}`;
      this.nextPortIndex += 1;
    } while (this.ports.has(candidate));
    return candidate;
  }

  isConnected(): boolean {
    return this.getConnectedPorts().length > 0;
  }

  getPorts(): readonly Port[] {
    return Array.from(this.ports.values());
  }

  getConnectedPorts(): readonly Port[] {
    return this.getPorts().filter((port) => port.link !== null);
  }

  getPort(portId: string): Port | undefined {
    return this.ports.get(portId);
  }

  /**
   * Envío "simple" para un device genérico (host final): usa el único
   * puerto conectado que tenga. Lanza error si tiene 0 o más de 1 puerto
   * conectado — un host real solo tiene una NIC activa en este modelo.
   * Switch/Router usan sendFrom(packet, portId) en su lugar.
   */
  send(packet: Packet): void {
    const connected = this.getConnectedPorts();
    if (connected.length === 0) {
      throw new Error(`Device ${this.id} no tiene link conectado`);
    }
    if (connected.length > 1) {
      throw new Error(
        `Device ${this.id} tiene múltiples puertos conectados; usar sendFrom(packet, portId)`,
      );
    }
    this.sendFrom(packet, connected[0].id);
  }

  /** Envía un packet por un puerto específico. Usado por Switch/Router. */
  sendFrom(packet: Packet, portId: string): void {
    const port = this.ports.get(portId);
    if (!port?.link) {
      throw new Error(`Device ${this.id} no tiene link conectado en el puerto ${portId}`);
    }
    port.link.transmit(packet, this);
  }

  /**
   * Invocado por Link cuando llega un packet dirigido a este device o
   * broadcast. Recibe el portId de entrada para que subclases (Switch)
   * puedan usarlo para poblar su MAC table ("esta MAC vino por este puerto").
   * Device base ignora inPortId y solo filtra por destMac/broadcast.
   */
  receive(packet: Packet, _inPortId: string): void {
    if (packet.destMac !== this.mac && !packet.isBroadcast()) {
      return;
    }
    this.receivedPackets.push(packet);
  }

  getReceivedPackets(): readonly Packet[] {
    return this.receivedPackets;
  }
}
