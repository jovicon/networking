import { describe, expect, it } from 'vitest';
import { Packet } from './Packet';

describe('Packet', () => {
  it('crea un packet con sourceMac, destMac y payload', () => {
    const packet = new Packet({
      sourceMac: 'aa:aa:aa:aa:aa:aa',
      destMac: 'bb:bb:bb:bb:bb:bb',
      payload: 'hola',
    });

    expect(packet.sourceMac).toBe('aa:aa:aa:aa:aa:aa');
    expect(packet.destMac).toBe('bb:bb:bb:bb:bb:bb');
    expect(packet.payload).toBe('hola');
  });

  it('asigna payload vacío por defecto si no se especifica', () => {
    const packet = new Packet({
      sourceMac: 'aa:aa:aa:aa:aa:aa',
      destMac: 'bb:bb:bb:bb:bb:bb',
    });

    expect(packet.payload).toBe('');
  });

  it('asigna un id incremental único a cada packet', () => {
    const p1 = new Packet({ sourceMac: 'aa:aa:aa:aa:aa:aa', destMac: 'bb:bb:bb:bb:bb:bb' });
    const p2 = new Packet({ sourceMac: 'aa:aa:aa:aa:aa:aa', destMac: 'bb:bb:bb:bb:bb:bb' });

    expect(p2.id).toBeGreaterThan(p1.id);
  });

  it('lanza error si falta sourceMac', () => {
    expect(() => new Packet({ sourceMac: '', destMac: 'bb:bb:bb:bb:bb:bb' })).toThrowError(
      'Packet requiere sourceMac',
    );
  });

  it('lanza error si falta destMac', () => {
    expect(() => new Packet({ sourceMac: 'aa:aa:aa:aa:aa:aa', destMac: '' })).toThrowError(
      'Packet requiere destMac',
    );
  });

  it('isBroadcast() es true cuando destMac es la MAC de broadcast', () => {
    const packet = new Packet({
      sourceMac: 'aa:aa:aa:aa:aa:aa',
      destMac: Packet.BROADCAST_MAC,
    });

    expect(packet.isBroadcast()).toBe(true);
  });

  it('isBroadcast() es false para MAC unicast', () => {
    const packet = new Packet({
      sourceMac: 'aa:aa:aa:aa:aa:aa',
      destMac: 'bb:bb:bb:bb:bb:bb',
    });

    expect(packet.isBroadcast()).toBe(false);
  });
});
