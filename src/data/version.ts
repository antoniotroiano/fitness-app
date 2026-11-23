/** App-Version (SemVer), einzige Quelle ist `package.json` (Vite `define`). Erhöhen mit `npm version`. */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

/** Beta-Build von `main` (eigener Pfad auf GitHub Pages). */
export const IS_BETA: boolean = typeof __APP_BETA__ === 'boolean' && __APP_BETA__

/**
 * Name der IndexedDB. Browser-Speicher gilt pro Origin (antoniotroiano.github.io), nicht pro Pfad: ohne eigenen Namen
 * würden Beta und Produktion dieselbe Datenbank teilen und ein neueres Beta-Schema könnte die Produktiv-App aussperren.
 */
export const DB_NAME = IS_BETA ? 'liftlab-beta' : 'liftlab'
