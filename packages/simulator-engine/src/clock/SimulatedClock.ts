interface ScheduledCallback {
  deadline: number;
  callback: () => void;
}

/**
 * Reloj lógico propio del simulador — no usa Date.now() real, para
 * mantener determinismo total en tests. Motor genérico detrás de todo
 * timer de red (MAC aging, STP hello/forward-delay, RIP timers, etc.):
 * "si pasa X tiempo sin evento Y, hacer Z".
 */
export class SimulatedClock {
  private currentTime = 0;
  private scheduled: ScheduledCallback[] = [];

  now(): number {
    return this.currentTime;
  }

  scheduleAt(deadline: number, callback: () => void): void {
    this.scheduled.push({ deadline, callback });
  }

  /** Avanza el tiempo y ejecuta, en orden de deadline, los callbacks vencidos. */
  advance(ms: number): void {
    this.currentTime += ms;

    const due = this.scheduled
      .filter((entry) => entry.deadline <= this.currentTime)
      .sort((a, b) => a.deadline - b.deadline);
    this.scheduled = this.scheduled.filter((entry) => entry.deadline > this.currentTime);

    for (const entry of due) {
      entry.callback();
    }
  }
}
