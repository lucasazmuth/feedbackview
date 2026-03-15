// Patch @once-ui-system/core LayoutProvider to provide SSR-safe default context
// This prevents "useLayout must be used within a LayoutProvider" errors during server rendering
const fs = require('fs')
const path = require('path')

const filePath = path.join(
  __dirname,
  '../node_modules/@once-ui-system/core/dist/contexts/LayoutProvider.js'
)

if (!fs.existsSync(filePath)) {
  console.log('[patch] LayoutProvider.js not found, skipping')
  process.exit(0)
}

let content = fs.readFileSync(filePath, 'utf8')

if (content.includes('SSR_DEFAULT')) {
  console.log('[patch] Already patched, skipping')
  process.exit(0)
}

content = content.replace(
  'const LayoutContext = createContext(null);',
  `const SSR_DEFAULT = {
    currentBreakpoint: "l",
    width: 1440,
    breakpoints: DEFAULT_BREAKPOINTS,
    isDefaultBreakpoints: () => true,
    isBreakpoint: (key) => key === "l",
    maxWidth: (key) => 1440 <= DEFAULT_BREAKPOINTS[key],
    minWidth: (key) => 1440 > DEFAULT_BREAKPOINTS[key],
};
const LayoutContext = createContext(SSR_DEFAULT);`
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('[patch] LayoutProvider.js patched for SSR compatibility')
