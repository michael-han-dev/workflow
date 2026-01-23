import type { World } from '@workflow/world';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWorld,
  getWorld,
  getWorldHandlers,
  initWorld,
  setWorld,
} from './world.js';

// Store original env
const originalEnv = { ...process.env };

// Create a minimal mock world
const createMockWorld = (): World =>
  ({
    runs: {},
    steps: {},
    events: {},
    hooks: {},
    createQueueHandler: vi.fn(() => vi.fn()),
  }) as unknown as World;

describe('world', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    // Clear cached world
    setWorld(undefined);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear cached world
    setWorld(undefined);
  });

  describe('createWorld', () => {
    it('should create local world when WORKFLOW_TARGET_WORLD is local', () => {
      process.env.WORKFLOW_TARGET_WORLD = 'local';
      const world = createWorld();
      expect(world).toBeDefined();
      expect(world.createQueueHandler).toBeDefined();
    });

    it('should create vercel world when WORKFLOW_TARGET_WORLD is vercel', () => {
      process.env.WORKFLOW_TARGET_WORLD = 'vercel';
      const world = createWorld();
      expect(world).toBeDefined();
      expect(world.createQueueHandler).toBeDefined();
    });

    it('should throw for external world modules', () => {
      process.env.WORKFLOW_TARGET_WORLD = '@workflow/world-postgres';
      expect(() => createWorld()).toThrow(
        'External world "@workflow/world-postgres" cannot be loaded synchronously'
      );
    });
  });

  describe('getWorld', () => {
    it('should return cached world if available', () => {
      const mockWorld = createMockWorld();
      setWorld(mockWorld);
      expect(getWorld()).toBe(mockWorld);
    });

    it('should create local world when no cache and target is local', () => {
      process.env.WORKFLOW_TARGET_WORLD = 'local';
      const world = getWorld();
      expect(world).toBeDefined();
    });

    it('should throw for external world if not initialized', () => {
      process.env.WORKFLOW_TARGET_WORLD = '@workflow/world-postgres';
      expect(() => getWorld()).toThrow(
        'World not initialized. Call "await initWorld()" before accessing'
      );
    });
  });

  describe('getWorldHandlers', () => {
    it('should return cached handlers if available', () => {
      const mockWorld = createMockWorld();
      setWorld(mockWorld);
      const handlers = getWorldHandlers();
      expect(handlers.createQueueHandler).toBeDefined();
    });

    it('should throw for external world if not initialized', () => {
      process.env.WORKFLOW_TARGET_WORLD = '@workflow/world-postgres';
      expect(() => getWorldHandlers()).toThrow(
        'World not initialized. Call "await initWorld()" before accessing'
      );
    });
  });

  describe('initWorld', () => {
    it('should initialize and cache local world', async () => {
      process.env.WORKFLOW_TARGET_WORLD = 'local';
      const world = await initWorld();
      expect(world).toBeDefined();
      expect(world.createQueueHandler).toBeDefined();

      // Should return same cached instance
      const world2 = await initWorld();
      expect(world2).toBe(world);
    });

    it('should initialize and cache vercel world', async () => {
      process.env.WORKFLOW_TARGET_WORLD = 'vercel';
      const world = await initWorld();
      expect(world).toBeDefined();
      expect(world.createQueueHandler).toBeDefined();
    });

    it('should return cached world if already initialized', async () => {
      const mockWorld = createMockWorld();
      setWorld(mockWorld);

      const world = await initWorld();
      expect(world).toBe(mockWorld);
    });
  });

  describe('setWorld', () => {
    it('should set the world cache', () => {
      const mockWorld = createMockWorld();
      setWorld(mockWorld);
      expect(getWorld()).toBe(mockWorld);
    });

    it('should clear the world cache when set to undefined', () => {
      const mockWorld = createMockWorld();
      setWorld(mockWorld);
      expect(getWorld()).toBe(mockWorld);

      setWorld(undefined);
      // After clearing, should create new world
      process.env.WORKFLOW_TARGET_WORLD = 'local';
      const newWorld = getWorld();
      expect(newWorld).not.toBe(mockWorld);
    });
  });
});
