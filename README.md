# Methalytics

Independent biogas & biomethane feasibility screening for farms, food & beverage processors, developers and municipalities in 33 countries and 25 languages. Free screening and two paid automatic reports; no expert review service.

- `npm run dev` — local development (demo payments are on outside production)
- `npm test` — model, payments, sample inputs and localisation tests
- `npm run lint` / `npm run typecheck` / `npm run build` — validation and production build

Docs: [architecture](docs/architecture.md) · [i18n & geo](docs/i18n.md) · [pricing](docs/pricing.md) · [payments](docs/payments.md) · [brand](docs/brand.md) · [country and sample ordering](docs/display-order.md) · [market research](docs/market-research.md) · [economics](docs/economics.md) · [feedstock model](docs/feedstock-model.md) · [data sources](docs/data-sources.md). Environment variables: [.env.example](.env.example).

The parameter register is rendered directly from the model at `/[lang]/methodology` (`allProvenance` in `src/core/assess.ts`); do not keep a generated Markdown copy. Runtime data in `data/`, dependencies and build/cache output are local and ignored by Git. Repository and temporary-file rules: [AGENTS.md](AGENTS.md).
