# Agency Compiler MVP

A dependency-free, deployable prototype for the first Agency Compiler loop.

## Product loop

1. Guided business-first studio onboarding
2. Seeded three-KB recommendation (Structural, Project Success, Platform Empirical)
3. Editable capability-based studio structure
4. Immutable Studio Model manifest preview
5. Project classification, runtime project pod, workflow, artifacts, and approval gates
6. Simulated success-profile telemetry
7. Owner dashboard for assigning, pausing, reviewing, and approving agent work

## Run and verify

```sh
npm run verify
cp .env.example .env.local
npm run dev
vercel deploy . -y
```

## Real vs mocked

The onboarding, edits, Studio Model compilation, Band agent roster, Crusoe model calls, approval controls, and browser persistence are real. The knowledge bases, project classification, execution telemetry, project status, and long-term run history are seeded or local-only. The access-code gate is suitable for a private demo, not production authentication.

## Runtime boundaries

- **Band:** registered agent identities and roster lookup
- **Crusoe Foundry:** on-demand reasoning for Studio Model compilation and agent assignments
- **Browser:** local pause state, approvals, activity, and spend estimates
- **Not enabled:** autonomous background work, external publishing, purchases, or durable multi-user storage
