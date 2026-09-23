import { describe, it, expect } from 'vitest';
import { isValidTransition } from '../../src/modules/leads/schemas.js';

describe('Status Transition Validation Logic', () => {
  it('allows valid progressive transitions', () => {
    expect(isValidTransition('NEW', 'CONTACTED')).toBe(true);
    expect(isValidTransition('CONTACTED', 'QUALIFIED')).toBe(true);
    expect(isValidTransition('QUALIFIED', 'CONVERTED')).toBe(true);
  });

  it('allows transitioning to LOST from any non-terminal state', () => {
    expect(isValidTransition('NEW', 'LOST')).toBe(true);
    expect(isValidTransition('CONTACTED', 'LOST')).toBe(true);
    expect(isValidTransition('QUALIFIED', 'LOST')).toBe(true);
  });

  it('considers same-state transition valid (no-op)', () => {
    expect(isValidTransition('NEW', 'NEW')).toBe(true);
    expect(isValidTransition('CONTACTED', 'CONTACTED')).toBe(true);
    expect(isValidTransition('CONVERTED', 'CONVERTED')).toBe(true);
  });

  it('rejects invalid backwards transitions', () => {
    expect(isValidTransition('CONTACTED', 'NEW')).toBe(false);
    expect(isValidTransition('QUALIFIED', 'CONTACTED')).toBe(false);
    expect(isValidTransition('CONVERTED', 'QUALIFIED')).toBe(false);
  });

  it('rejects skipping progressive stages', () => {
    expect(isValidTransition('NEW', 'QUALIFIED')).toBe(false);
    expect(isValidTransition('NEW', 'CONVERTED')).toBe(false);
  });

  it('rejects transitions from terminal states', () => {
    expect(isValidTransition('CONVERTED', 'NEW')).toBe(false);
    expect(isValidTransition('CONVERTED', 'LOST')).toBe(false);
    expect(isValidTransition('LOST', 'NEW')).toBe(false);
    expect(isValidTransition('LOST', 'CONTACTED')).toBe(false);
  });
});
