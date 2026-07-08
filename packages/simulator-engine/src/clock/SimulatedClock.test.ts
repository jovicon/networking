import { describe, expect, it } from 'vitest';
import { SimulatedClock } from './SimulatedClock';

describe('SimulatedClock', () => {
  it('now() empieza en 0', () => {
    const clock = new SimulatedClock();

    expect(clock.now()).toBe(0);
  });

  it('advance() avanza el tiempo devuelto por now()', () => {
    const clock = new SimulatedClock();

    clock.advance(100);
    expect(clock.now()).toBe(100);

    clock.advance(50);
    expect(clock.now()).toBe(150);
  });

  it('advance() ejecuta un callback programado cuando el tiempo llega a su deadline', () => {
    const clock = new SimulatedClock();
    let executed = false;
    clock.scheduleAt(100, () => {
      executed = true;
    });

    clock.advance(100);

    expect(executed).toBe(true);
  });

  it('advance() no ejecuta callbacks cuyo deadline aún no llegó', () => {
    const clock = new SimulatedClock();
    let executed = false;
    clock.scheduleAt(100, () => {
      executed = true;
    });

    clock.advance(50);

    expect(executed).toBe(false);
  });

  it('advance() ejecuta callbacks con deadline ya pasado, no solo el exacto', () => {
    const clock = new SimulatedClock();
    let executed = false;
    clock.scheduleAt(100, () => {
      executed = true;
    });

    clock.advance(150);

    expect(executed).toBe(true);
  });

  it('advance() ejecuta múltiples callbacks debidos en orden de deadline', () => {
    const clock = new SimulatedClock();
    const order: string[] = [];
    clock.scheduleAt(200, () => order.push('segundo'));
    clock.scheduleAt(100, () => order.push('primero'));

    clock.advance(200);

    expect(order).toEqual(['primero', 'segundo']);
  });

  it('un callback ya ejecutado no se vuelve a ejecutar en un advance() posterior', () => {
    const clock = new SimulatedClock();
    let callCount = 0;
    clock.scheduleAt(100, () => {
      callCount += 1;
    });

    clock.advance(100);
    clock.advance(100);

    expect(callCount).toBe(1);
  });
});
