# Project Rules

## Data Integrity & Dynamic Calculation
- **Zero Static/Dummy Values**: Never introduce hardcoded fallback numbers, dummy strings, or sample figures in metrics, registers, reports, or overview cards.
- **Strict Store Grounding**: All section metrics, table rows, and ledger views MUST aggregate 100% real data dynamically from the persistent Zustand store (`useDataStore`).
- **Screenshots for Structure Only**: Attached user screenshots serve purely as template layout/UI guides; content and numbers must strictly reflect active workspace state.
