# Lit Chain shared code

This directory is intentionally outside both `src/` and `mobile/`.

It is the platform-neutral layer for Lit Chain. Web/PWA and React Native
should import from here whenever the code has no DOM or native dependency.

Current shared modules:
- `navigation.js` — canonical primary navigation
- `chainCore.js` — Chain sorting, level/branch selection, counts and covers
- `discoveryCatalog.js` — shared featured public-domain catalog

The mobile Metro config watches this directory. Vite already runs from the
repository root, so the web app can also import these modules directly.

Future migrations should move more platform-neutral logic here before
duplicating it in `src/` and `mobile/`.
