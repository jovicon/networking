import type { Packet } from '../packet/Packet';
import type { Link } from '../topology/Link';

export interface DeviceOptions {
  id: string;
  name?: string;
  mac: string;
}

/**
 * Nodo base de la topología. v1: un solo puerto (un solo Link activo).
 * Switch/Router (fases siguientes) extienden esto a multi-puerto.
 */
export class Device {
  readonly id: string;
  readonly name: string;
  readonly mac: string;

  private link: Link | null = null;
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

  connect(link: Link): void {
    if (this.link) {
      throw new Error(`Device ${this.id} ya tiene un link conectado`);
    }
    this.link = link;
  }

  isConnected(): boolean {
    return this.link !== null;
  }

  send(packet: Packet): void {
    if (!this.link) {
      throw new Error(`Device ${this.id} no tiene link conectado`);
    }
    this.link.transmit(packet, this);
  }

  /** Invocado por Link cuando llega un packet dirigido a este device o broadcast. */
  receive(packet: Packet): void {
    if (packet.destMac !== this.mac && !packet.isBroadcast()) {
      return;
    }
    this.receivedPackets.push(packet);
  }

  getReceivedPackets(): readonly Packet[] {
    return this.receivedPackets;
  }
}
