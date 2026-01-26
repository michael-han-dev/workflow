import type { World } from '@workflow/world';
import { createLocalWorld } from '@workflow/world-local';
import { createVercelWorld } from '@workflow/world-vercel';

const WorldCache = Symbol.for('@workflow/world//cache');
const StubbedWorldCache = Symbol.for('@workflow/world//stubbedCache');

const globalSymbols: typeof globalThis & {
  [WorldCache]?: World;
  [StubbedWorldCache]?: World;
} = globalThis;

function defaultWorld(): 'vercel' | 'local' {
  if (process.env.VERCEL_DEPLOYMENT_ID) {
    return 'vercel';
  }

  return 'local';
}

/**
 * Create a Vercel world instance with environment-based configuration.
 */
function createVercelWorldFromEnv(): World {
  return createVercelWorld({
    token: process.env.WORKFLOW_VERCEL_AUTH_TOKEN,
    projectConfig: {
      environment: process.env.WORKFLOW_VERCEL_ENV,
      projectId: process.env.WORKFLOW_VERCEL_PROJECT,
      teamId: process.env.WORKFLOW_VERCEL_TEAM,
    },
  });
}

/**
 * Create a local world instance with environment-based configuration.
 */
function createLocalWorldFromEnv(): World {
  return createLocalWorld({
    dataDir: process.env.WORKFLOW_LOCAL_DATA_DIR,
  });
}

/**
 * Bypasses bundler static analysis for dynamic imports.
 * Bundlers can't resolve `import(variable)`, so we use Function constructor.
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<any>;

/**
 * Load an external world module via dynamic import (supports ESM).
 */
async function loadExternalWorld(targetWorld: string): Promise<World> {
  const mod = await dynamicImport(targetWorld);

  if (typeof mod === 'function') {
    return mod() as World;
  } else if (typeof mod.default === 'function') {
    return mod.default() as World;
  } else if (typeof mod.createWorld === 'function') {
    return mod.createWorld() as World;
  }

  throw new Error(
    `Invalid target world module: ${targetWorld}, must export a default function or createWorld function that returns a World instance.`
  );
}

/**
 * Initialize world asynchronously. Required for external ESM worlds
 * e.g. '@workflow/world-postgres', built-in worlds load synchronously.
 */
export async function initWorld(): Promise<World> {
  if (globalSymbols[WorldCache]) {
    return globalSymbols[WorldCache];
  }

  const targetWorld = process.env.WORKFLOW_TARGET_WORLD || defaultWorld();

  let world: World;

  if (targetWorld === 'vercel') {
    world = createVercelWorldFromEnv();
  } else if (targetWorld === 'local') {
    world = createLocalWorldFromEnv();
  } else {
    world = await loadExternalWorld(targetWorld);
  }

  globalSymbols[WorldCache] = world;
  globalSymbols[StubbedWorldCache] = world;
  return world;
}

/**
 * Create world synchronously. Only supports built-in worlds ('local', 'vercel').
 * For external worlds, use `initWorld()` instead.
 */
export const createWorld = (): World => {
  const targetWorld = process.env.WORKFLOW_TARGET_WORLD || defaultWorld();

  if (targetWorld === 'vercel') {
    return createVercelWorldFromEnv();
  }

  if (targetWorld === 'local') {
    return createLocalWorldFromEnv();
  }

  throw new Error(
    `External world "${targetWorld}" cannot be loaded synchronously. ` +
      `Use "await initWorld()" instead.`
  );
};

/**
 * Get world handlers for build-time use without caching the full world.
 * For external worlds, call `await initWorld()` first.
 */
export const getWorldHandlers = (): Pick<World, 'createQueueHandler'> => {
  if (globalSymbols[StubbedWorldCache]) {
    return globalSymbols[StubbedWorldCache];
  }

  const targetWorld = process.env.WORKFLOW_TARGET_WORLD || defaultWorld();

  // For external worlds, require explicit initialization
  if (targetWorld !== 'vercel' && targetWorld !== 'local') {
    throw new Error(
      `World not initialized. Call "await initWorld()" before accessing ` +
        `getWorldHandlers() for external module "${targetWorld}".`
    );
  }

  const _world = createWorld();
  globalSymbols[StubbedWorldCache] = _world;
  return {
    createQueueHandler: _world.createQueueHandler,
  };
};

/**
 * Get the cached world instance. For external worlds, call `await initWorld()` first.
 */
export const getWorld = (): World => {
  if (globalSymbols[WorldCache]) {
    return globalSymbols[WorldCache];
  }

  const targetWorld = process.env.WORKFLOW_TARGET_WORLD || defaultWorld();

  // For external worlds, require explicit initialization
  if (targetWorld !== 'vercel' && targetWorld !== 'local') {
    throw new Error(
      `World not initialized. Call "await initWorld()" before accessing ` +
        `getWorld() for external module "${targetWorld}".`
    );
  }

  globalSymbols[WorldCache] = createWorld();
  return globalSymbols[WorldCache];
};

/**
 * Reset the cached world instance. This should be called when environment
 * variables change and you need to reinitialize the world with new config.
 */
export const setWorld = (world: World | undefined): void => {
  globalSymbols[WorldCache] = world;
  globalSymbols[StubbedWorldCache] = world;
};
