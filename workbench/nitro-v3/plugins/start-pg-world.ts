import { defineNitroPlugin } from 'nitro/~internal/runtime/plugin';

// Start the Postgres World
// Needed since we test this in CI
export default defineNitroPlugin(async () => {
  if (process.env.WORKFLOW_TARGET_WORLD === '@workflow/world-postgres') {
    import('workflow/runtime').then(async ({ initWorld }) => {
      console.log('Starting Postgres World...');
      const world = await initWorld();
      await world.start?.();
    });
  }
});
