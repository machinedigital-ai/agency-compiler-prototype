# Agency Compiler MVP

A dependency-free, deployable prototype for the first Agency Compiler loop.

## Product loop

1. Guided business-first studio onboarding
2. Seeded three-KB recommendation (Structural, Project Success, Platform Empirical)
3. Editable capability-based studio structure
4. Immutable Studio Model manifest preview
5. Project classification, runtime project pod, workflow, artifacts, and approval gates
6. Simulated success-profile telemetry

## Run and verify

```sh
npm run verify
vercel deploy . -y
```

## Real vs mocked

The interactive onboarding, edits, compilation, project assembly, and browser persistence are real. The knowledge bases, project classification, runtime resolution, empirical metrics, and execution outcomes are local deterministic seed data. There is no authentication, database, live AI model, marketplace, or consented production telemetry yet.
