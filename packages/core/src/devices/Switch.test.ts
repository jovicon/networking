import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';
import { Device } from './Device';
import { Link } from '../topology/Link';
import { Packet } from '../packet/Packet';

describe('Switch', () => {
  it('Switch floodea un frame unicast a todos los puertos excepto el de entrada', () => {
    const switch1 = new Switch({ id: 'switch1', mac: 'ff:00:00:00:00:01' });
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, switch1);
    new Link(pc2, switch1);
    new Link(pc3, switch1);

    const packet = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac, payload: 'ping' });
    const pc1ReceiveSpy = vi.spyOn(pc1, 'receive');
    const pc3ReceiveSpy = vi.spyOn(pc3, 'receive');

    pc1.send(packet);

    // pc2 es el destinatario real: el frame le llega y queda en su historial.
    expect(pc2.getReceivedPackets()).toEqual([packet]);

    // pc3 no es el destinatario, pero el switch igual le floodea el frame
    // (sin tabla MAC no distingue) — Device.receive() lo descarta por
    // destMac no coincidente, así que llega pero no queda en su historial.
    expect(pc3ReceiveSpy).toHaveBeenCalledWith(packet, expect.any(String));
    expect(pc3.getReceivedPackets()).toEqual([]);

    // el switch no reenvía de vuelta por el puerto de entrada.
    expect(pc1ReceiveSpy).not.toHaveBeenCalled();
  });
});
