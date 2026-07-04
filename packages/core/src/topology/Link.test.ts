import { describe, expect, it } from 'vitest';
import { Link } from './Link';
import { Device } from '../devices/Device';
import { Packet } from '../packet/Packet';

describe('Link', () => {
  it('conecta dos devices distintos', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });

    const link = new Link(pc1, pc2);

    expect(link.getOtherEnd(pc1)).toBe(pc2);
    expect(link.getOtherEnd(pc2)).toBe(pc1);
  });

  it('lanza error si se intenta conectar un device consigo mismo', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });

    expect(() => new Link(pc1, pc1)).toThrowError('Link no puede conectar un device consigo mismo');
  });

  it('getOtherEnd() lanza error si el device no pertenece al link', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    const link = new Link(pc1, pc2);

    expect(() => link.getOtherEnd(pc3)).toThrowError('Device no pertenece a este Link');
  });

  it('transmit() entrega el packet al extremo opuesto de quien lo envía', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const link = new Link(pc1, pc2);

    const packet = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac });
    link.transmit(packet, pc1);

    expect(pc2.getReceivedPackets()).toEqual([packet]);
  });
});
