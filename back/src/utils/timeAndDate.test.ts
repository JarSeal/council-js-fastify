import { getTimestamp } from './timeAndDate';

describe('timeAndDate utils', () => {
  it('getTimestamp', () => {
    const timestamp = getTimestamp();
    expect(timestamp).toBeGreaterThan(Math.floor(Date.now() / 1000) - 2);
    expect(timestamp).toBeLessThan(Math.floor(Date.now() / 1000) + 2);
    expect(typeof timestamp === 'number').toBeTruthy();
  });
});
