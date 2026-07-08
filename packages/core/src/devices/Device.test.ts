import { describe, expect, it, vi } from 'vitest';
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

  it('permite conectar un segundo link en un puerto distinto', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, pc2);
    new Link(pc1, pc3);

    expect(pc1.getConnectedPorts()).toHaveLength(2);
  });

  it('lanza error si se fuerza el mismo portId dos veces', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, pc2, 'port0');

    expect(() => new Link(pc1, pc3, 'port0')).toThrowError(
      'Device pc1 ya tiene un link conectado en el puerto port0',
    );
  });

  it('autoasigna portId incremental si no se especifica', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, pc2);
    new Link(pc1, pc3);

    expect(pc1.getConnectedPorts().map((p) => p.id)).toEqual(['port0', 'port1']);
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

  it('send() lanza error si el device tiene múltiples puertos conectados', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, pc2);
    new Link(pc1, pc3);
    const packet = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac });

    expect(() => pc1.send(packet)).toThrowError(
      'Device pc1 tiene múltiples puertos conectados; usar sendFrom(packet, portId)',
    );
  });

  it('sendFrom() entrega el packet por el puerto especificado sin afectar otros puertos', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    const pc3 = new Device({ id: 'pc3', mac: 'cc:cc:cc:cc:cc:cc' });
    new Link(pc1, pc2, 'port0');
    new Link(pc1, pc3, 'port1');
    const packet = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac });

    pc1.sendFrom(packet, 'port0');

    expect(pc2.getReceivedPackets()).toEqual([packet]);
    expect(pc3.getReceivedPackets()).toEqual([]);
  });

  it('receive() recibe el portId de entrada (usado por subclases como Switch)', () => {
    const pc1 = new Device({ id: 'pc1', mac: 'aa:aa:aa:aa:aa:aa' });
    const pc2 = new Device({ id: 'pc2', mac: 'bb:bb:bb:bb:bb:bb' });
    new Link(pc1, pc2, 'port0', 'portX');
    const packet = new Packet({ sourceMac: pc1.mac, destMac: pc2.mac });
    const receiveSpy = vi.spyOn(pc2, 'receive');

    pc1.send(packet);

    expect(receiveSpy).toHaveBeenCalledWith(packet, 'portX');
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
