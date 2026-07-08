import type { Device } from '../devices/Device';
import type { Packet } from '../packet/Packet';

/**
 * Enlace punto a punto full-duplex entre dos devices. Cada extremo se
 * identifica por device + portId (el puerto de ESE device que este Link
 * ocupa). v1: sin latencia ni pérdida de paquetes — entrega inmediata y
 * determinística.
 */
export class Link {
  private readonly deviceA: Device;
  private readonly deviceB: Device;
  private readonly portA: string;
  private readonly portB: string;

  constructor(deviceA: Device, deviceB: Device, portIdA?: string, portIdB?: string) {
    if (deviceA === deviceB) {
      throw new Error('Link no puede conectar un device consigo mismo');
    }

    this.deviceA = deviceA;
    this.deviceB = deviceB;
    this.portA = deviceA.connect(this, portIdA);
    this.portB = deviceB.connect(this, portIdB);
  }

  /** Entrega el packet al extremo opuesto de quien lo envía. */
  transmit(packet: Packet, from: Device): void {
    const { device: target, portId: targetPortId } = this.getOtherEnd(from);
    target.receive(packet, targetPortId);
  }

  getOtherEnd(device: Device): { device: Device; portId: string } {
    if (device === this.deviceA) {
      return { device: this.deviceB, portId: this.portB };
    }
    if (device === this.deviceB) {
      return { device: this.deviceA, portId: this.portA };
    }
    throw new Error('Device no pertenece a este Link');
  }
}
