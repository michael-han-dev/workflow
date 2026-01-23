import { registerOTel } from '@vercel/otel';

registerOTel({ serviceName: 'example-nextjs-workflow' });

if (process.env.NEXT_RUNTIME !== 'edge') {
  // kickstart the world
  import('workflow/runtime').then(async ({ initWorld }) => {
    const world = await initWorld();
    await world.start?.();
  });
}
