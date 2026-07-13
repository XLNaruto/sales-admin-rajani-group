// Generates src/routeTree.gen.ts from src/routes before typecheck/build.
// The route tree is gitignored, so CI (and fresh clones) must generate it
// before `tsc -b` runs — otherwise `@/routeTree.gen` can't be resolved.
// Config is read from tsr.config.json (kept in sync with vite.config.ts).
import { Generator, getConfig } from '@tanstack/router-generator'

const root = process.cwd()
const config = getConfig({}, root)

await new Generator({ config, root }).run()
console.log(`Generated ${config.generatedRouteTree}`)
