import { describe, expect, it } from 'vitest';
import { Device } from './Device';
import { Link } from '../topology/Link';
import { Packet } from '../packet/Packet';

describe('Device', () => {
  it('crea un device con id, mac y name derivado del id por defecto', () => {
    const device = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });

    expect(device.id).toBe('pc1');
    expect(device.mac).toBe('aa:aa:aa:aa:aa:aa');
    expect(device.name).toBe('pc1');
  });

  it('usa el name explícito cuando se provee', () => {
    const device = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa', name: 'PC-1' });

    expect(device.name).toBe('PC-1');
  });

  it('lanza error si falta id', () => {
    expect(() => new Device({ id: '', mac: 'aa:aa:aa:aa:aa:aa' })).toThrowError(
      'Device requiere id',
    );
  });

  it('lanza error si falta mac', () => {
    expect(() => new Device({ id: 'pc1', mac: '' })).toThrowError('Device requiere mac');
  });

  it('isConnected() es false antes de conectar un link', () => {
    const device = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });

    expect(device.isConnected()).toBe(false);
  });

  it('isConnected() es true después de conectar un link', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    new Link(pc1, pc2);

    expect(pc1.isConnected()).toBe(true);
    expect(pc2.isConnected()).toBe(true);
  });

  it('lanza error al conectar un segundo link al mismo device', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, pc2);

    expect(() => new Link(pc1, pc3)).toThrowError('Device pc1 ya tiene un link conectado');
  });

  it('send() lanza error si el device no tiene link conectado', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const packet = new Packet({ sourceMac: pc1.mac, destMac: 'bb:bb:bb:bb:bb:bb' });

    expect(() => pc1.send(packet)).toThrowError('Device pc1 no tiene link conectado');
  });

  it('send() entrega el packet al otro extremo del link (unicast)', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    new Link(pc1, pc2);

    const packet = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac, payload: 'ping' });
    pc1.send(packet);

    expect(pc2.getReceivedPackets()).toEqual([packet]);
    expect(pc1.getReceivedPackets()).toEqual([]);
  });

  it('receive() acepta un packet broadcast aunque la destMac no coincida', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    new Link(pc1, pc2);

    const packet = new Packet({ sourceMac: pc1.mac, destMac: Packet.BROADCAST_MAC });
    pc1.send(packet);

    expect(pc2.getReceivedPackets()).toEqual([packet]);
  });

  it('receive() descarta un packet unicast dirigido a otra mac', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    new Link(pc1, pc2);

    const packet = new Packet({ sourceMac: pc1.mac, destMac: 'cc:cc:cc:cc:cc:cc' });
    pc1.send(packet);

    expect(pc2.getReceivedPackets()).toEqual([]);
  });

  it('getReceivedPackets() devuelve todos los packets recibidos en orden', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    new Link(pc1, pc2);

    const p1 = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac, payload: 'uno' });
    const p2 = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac, payload: 'dos' });
    pc1.send(p1);
    pc1.send(p2);

    expect(pc2.getReceivedPackets()).toEqual([p1, p2]);
  });
});
