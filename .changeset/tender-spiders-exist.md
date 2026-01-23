---
"workflow": patch
"@workflow/core": patch
"@workflow/cli": patch
---

Fix ERR_REQUIRE_ESM when loading @workflow/world-postgres. Replace synchronous require() with dynamic import() using new Function() to bypass bundler static analysis. External worlds now require `await initWorld()` instead of `getWorld()`. Updated framework integrations (Next.js, Nitro, Nuxt, SvelteKit) to use the new initialization pattern.  

