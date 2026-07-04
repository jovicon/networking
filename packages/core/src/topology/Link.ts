import type { Device } from '../devices/Device';
import type { Packet } from '../packet/Packet';

/**
 * Enlace punto a punto full-duplex entre dos devices.
 * v1: sin latencia ni pérdida de paquetes — entrega inmediata y determinística.
 */
export class Link {
  private readonly deviceA: Device;
  private readonly deviceB: Device;

  constructor(deviceA: Device, deviceB: Device) {
    if (deviceA === deviceB) {
      throw new Error('Link no puede conectar un device consigo mismo');
    }

    this.deviceA = deviceA;
    this.deviceB = deviceB;
    deviceA.connect(this);
    deviceB.connect(this);
  }

  /** Entrega el packet al extremo opuesto de quien lo envía. */
  transmit(packet: Packet, from: Device): void {
    const target = this.getOtherEnd(from);
    target.receive(packet);
  }

  getOtherEnd(device: Device): Device {
    if (device === this.deviceA) {
      return this.deviceB;
    }
    if (device === this.deviceB) {
      return this.deviceA;
    }
    throw new Error('Device no pertenece a este Link');
  }
}
