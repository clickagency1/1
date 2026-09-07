# Project Guide

## Architecture

This is an Arabic RTL marketing site for the Click digital agency. It uses TanStack Start with a single primary landing route. The interface is intentionally motion-rich while keeping animation transform- and opacity-based for good rendering performance.

## Key Directories

- `src/routes/index.tsx`: Landing-page structure, service data, carousel state, mobile navigation, swipe handling, and reveal observer.
- `src/routes/__root.tsx`: Root document, Arabic direction, and SEO metadata.
- `src/styles.css`: Design tokens, responsive layout, animation choreography, and reduced-motion overrides.
- `public/assets/`: Brand logo and locally hosted service photography.

## Coding Conventions

- Keep user-facing copy in Arabic and preserve `dir="rtl"` behavior.
- Use PascalCase for React components and camelCase for state and helpers.
- Keep service content in the `services` array so slide media, copy, and accessibility labels remain synchronized.
- Prefer CSS custom properties for shared colors and typography.
- Animate only `transform` and `opacity` unless a small progress indicator specifically requires otherwise.
- Include visible focus states, descriptive image alt text, and reduced-motion support for new interactions.

## Design Decisions

- The visual system retains the original dark green brand palette with a bright lime accent.
- Service slides use editorial photographs instead of symbolic icons so each offering feels concrete and credible.
- The carousel pauses during hover, focus, and touch interaction; it supports buttons, dots, keyboard arrows, and swipe gestures.
- The homepage is organized as hero, services, value proposition, process, and contact sections to keep the commercial narrative focused.

## Commands

- `pnpm dev`: Start the local development server.
- `pnpm build`: Create the production build.
