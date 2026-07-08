import { Device } from './Device';
import type { Packet } from '../packet/Packet';

/**
 * Switch v1: flooding puro, sin tabla MAC. Todo frame que llega por un
 * puerto se reenvía por todos los demás puertos conectados excepto el de
 * entrada, sea unicast o broadcast. No hereda el filtrado por destMac de
 * Device — un switch no consume tráfico para sí mismo, solo lo reenvía.
 */
export class Switch extends Device {
  receive(packet: Packet, inPortId: string): void {
    for (const port of this.getConnectedPorts()) {
      if (port.id !== inPortId) {
        this.sendFrom(packet, port.id);
      }
    }
  }
}
