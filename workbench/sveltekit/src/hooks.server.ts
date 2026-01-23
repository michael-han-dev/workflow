import type { ServerInit } from '@sveltejs/kit';

export const init: ServerInit = async () => {
  // Start the Postgres World
  // Needed since we test this in CI
  if (process.env.WORKFLOW_TARGET_WORLD === '@workflow/world-postgres') {
    const { initWorld } = await import('workflow/runtime');
    console.log('Starting Postgres World...');
    const world = await initWorld();
    await world.start?.();
  }
};
