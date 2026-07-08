export interface PacketOptions {
  sourceMac: string;
  destMac: string;
  payload?: string;
}

/**
 * Frame de capa 2 mínimo: MAC origen/destino + payload.
 * `destMac` puede ser la MAC de broadcast (ff:ff:ff:ff:ff:ff).
 */
export class Packet {
  static readonly BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

  readonly id: string;
  readonly sourceMac: string;
  readonly destMac: string;
  readonly payload: string;

  constructor(options: PacketOptions) {
    if (!options.sourceMac) {
      throw new Error('Packet requiere sourceMac');
    }
    if (!options.destMac) {
      throw new Error('Packet requiere destMac');
    }

    this.id = crypto.randomUUID();
    this.sourceMac = options.sourceMac;
    this.destMac = options.destMac;
    this.payload = options.payload ?? '';
  }

  isBroadcast(): boolean {
    return this.destMac === Packet.BROADCAST_MAC;
  }
}
