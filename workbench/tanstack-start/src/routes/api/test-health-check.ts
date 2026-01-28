// This route tests the queue-based health check functionality

import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';
import { getWorld, healthCheck } from 'workflow/runtime';

export const Route = createFileRoute('/api/test-health-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { endpoint = 'workflow', timeout = 30000 } = body;

          console.log(
            `Testing queue-based health check for endpoint: ${endpoint}, timeout: ${timeout}ms`
          );

          const world = getWorld();
          const result = await healthCheck(world, endpoint, { timeout });

          console.log(`Health check result:`, result);

          return json(result);
        } catch (error) {
          console.error('Health check test failed:', error);
          return json(
            {
              healthy: false,
              error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
