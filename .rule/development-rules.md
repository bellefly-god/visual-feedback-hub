# FeedbackMark Development Rules

## 1. Scope and Priority
- Use `docs/system-function-spec.md` as the single source of truth for MVP requirements.
- If existing UI and doc conflict, follow the doc.
- Implement MVP mandatory scope only; do not add excluded features.
- Prefer incremental delivery in small, reviewable steps.

## 2. UI and UX Constraints
- Reuse existing Lovable-generated pages, layout, and component patterns.
- Do not redesign landing page or global visual style.
- Keep spacing, typography, color tokens, and interaction tone consistent with current UI.
- Prefer extending existing components before creating new visual primitives.

## 3. Architecture and Code Structure
- Keep route definitions centralized (`src/lib/routePaths.ts`).
- Separate concerns:
  - `pages/`: page composition
  - `components/feedback/`: reusable feature components
  - `services/`: data access and business operations
  - `types/`: domain types and enums
  - `lib/`: pure utility functions and rule checks
- Avoid coupling page components directly to raw API calls.

## 4. Data and State Rules
- Use unified status enum only: `pending | fixed | approved`.
- Enforce status transitions with a dedicated rule function.
- Dashboard project status must be derived from comment statuses, not hardcoded labels.
- Any share link must be project-bound and token-based.

## 5. Implementation Rules
- Incremental change only: no broad refactor unless required by current phase.
- Preserve backward-compatible routes when changing URL patterns.
- Prefer pure functions for business rules to simplify tests.
- Keep TypeScript types explicit at module boundaries.

## 6. Quality Gates
- Before merge, ensure:
  - `npm run build` passes
  - `npm run test` passes
  - `npm run lint` passes (or documented temporary exceptions)
- New business logic must include at least minimal unit coverage.
- Do not ship known blocking lint errors.

## 7. Security and Safety (MVP)
- No sensitive key hardcoding.
- Validate file type and size before upload.
- Validate share token when loading review pages.
- Keep public-link access minimal and explicit.

## 8. Non-Goals (Do Not Implement)
- Figma integration
- AI summarization
- Email notifications
- Complex team permission systems
- Browser plugin side panel
- Billing system
- Advanced PM features beyond MVP document

## 9. Collaboration Workflow
- Start each implementation phase with gap confirmation.
- Document changed files and verification steps for every phase.
- Keep commit scope single-purpose and traceable to MVP flow steps.
