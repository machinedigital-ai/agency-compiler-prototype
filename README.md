# Agency Compiler MVP

A dependency-free, deployable prototype for the first Agency Compiler loop.

## Product loop

1. Guided business-first studio onboarding
2. Seeded three-KB recommendation (Structural, Project Success, Platform Empirical)
3. Editable capability-based studio structure
4. Immutable Studio Model manifest preview
5. Project classification, runtime project pod, workflow, artifacts, and approval gates
6. Simulated success-profile telemetry
7. Owner dashboard plus artifact viewer for assigning, reviewing, and approving agent work

## Run and verify

```sh
npm run verify
cp .env.example .env.local
npm run dev
vercel deploy . -y
```

For a persistent hosted agent runtime:

```sh
docker build -t agency-compiler .
docker run --env-file .env.local -p 4174:4174 agency-compiler
```

## Real vs mocked

The onboarding, edits, Studio Model compilation, Band agent roster, Crusoe model calls, artifact viewer, approval controls, and local runtime artifact persistence are real. The review reel is a visual aid, not rendered campaign media. The knowledge bases, project classification, execution telemetry, project status, and long-term run history are seeded or local-only. The demo is intentionally public: its server endpoints use shared Crusoe credits without sign-in. Add production authentication, a database, and server-side rate limiting before sharing it widely.

## Runtime boundaries

- **Band:** registered agent identities and roster lookup
- **Crusoe Foundry:** on-demand reasoning for Studio Model compilation and agent assignments
- **Browser:** local pause state, approvals, activity, and spend estimates
- **Not enabled:** autonomous background work, external publishing, purchases, or durable multi-user storage
