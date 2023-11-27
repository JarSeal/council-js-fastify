import { getTimestamp, getTimestampFromDate } from './timeAndDate';

describe('timeAndDate utils', () => {
  it('getTimestamp', () => {
    const timestamp = getTimestamp();
    expect(timestamp).toBeGreaterThan(Math.floor(Date.now() / 1000) - 2);
    expect(timestamp).toBeLessThan(Math.floor(Date.now() / 1000) + 2);
    expect(typeof timestamp === 'number').toBeTruthy();
  });

  it('getTimestampFromDate', () => {
    const timestamp = getTimestampFromDate(new Date('2023-11-27T09:32:29.611Z'));
    expect(timestamp).toBe(1701077549);
  });
});
