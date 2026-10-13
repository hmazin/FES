# FES quotation website

Dedicated Power-Link fugitive emission website for Vercel, linked to the hmazin/FES GitHub repository. The website runs on Next.js. Google Cloud project fes-quote retains drawings, quote records and generated PDF quotations. The owner dashboard is at /dashboard; its login is at /dashboard/login.

## What works

- P&ID and building drawing uploads, up to six files, 10 MB each and 20 MB total.
- Direct signed uploads to a private Google Cloud Storage bucket. Drawing bytes do not pass through Vercel request bodies, avoiding its function payload limit.
- Upload validation, SHA-256 fingerprints and a separate retained-source key. A still-valid upload policy cannot change the source already accepted for a quote.
- Scope confirmation, private server-side pricing, standard automatic quotation and engineer-review routing.
- PDF quotation with the source register, reproduced drawings and exact embedded originals.
- Protected owner dashboard showing dates, scope, CAD price, contact details, request status, original drawings and generated PDF quotations.
- Dashboard metrics distinguish saved requests from actually generated PDF quotations.
- Visitor session expiry does not delete the retained drawings or owner records. No automatic deletion is configured.
- Email alerts and delivery are intentionally omitted at the owner's request. The dashboard is the reporting system.

## Deployment

Import https://github.com/hmazin/FES into the owner's Vercel workspace as a Next.js project. Use npm ci and npm run build, with the repository root as the project root. Connect the repository in Vercel's Git settings and set main as the production branch. Updates pushed to the production branch then trigger deployment; other authorized branches receive preview deployments.

vercel.json enables Git deployments. No GitHub Actions deployment token is necessary for Vercel's native Git integration.

## Private environment configuration

Copy .env.example only for variable names. Add real values through private Vercel environment settings, not GitHub files:

- GCP_PROJECT_ID: fes-quote.
- GCP_STORAGE_BUCKET: a private bucket in that project.
- GCP_FIRESTORE_DATABASE: (default), unless a different Firestore database is selected.
- FES_ADMIN_USER and FES_ADMIN_PASSWORD: owner login; password must contain at least 16 characters.
- FES_PRICING_JSON: approved private JSON effort/rate profile. Fields: hourlyRateCents, firstPageHours, standardPageHours, densePageHours, reportHours, reviewHours, setupHours, revisionPercent. No actual production coefficients are committed.
- QUOTE_CAP_CAD: approved automatic quote limit.
- OPENAI_API_KEY / OPENAI_MODEL: optional document reading; files are sent only after explicit visitor consent.

Prefer Vercel OIDC workload federation for Google authentication. Configure GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT_EMAIL, GCP_WORKLOAD_IDENTITY_POOL_ID and GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID. The identity provider should restrict access to this Vercel team and project. The dedicated service account needs Firestore access, private bucket object creation/read access and permission to sign its own short-lived storage policies. GCP_SERVICE_ACCOUNT_JSON is an optional private fallback, never a tracked file.

The GitHub repository is connected to Vercel project fes, with production address https://fes-delta.vercel.app. Automatic deployment from a new main-branch commit has been verified.

Google Cloud project fes-quote now has a Firestore Native default database in northamerica-northeast2 (Toronto), with database deletion protection enabled. Dedicated service account fes-web and workload identity pool fes-vercel/provider vercel are configured. The provider accepts only production tokens from the owner's specific FES project and team IDs; previews cannot access production customer data.

Drawing-bucket creation remains pending billing setup. Linking the selected My Billing Account failed with Google's Cloud billing quota exceeded error. Owner credentials and production pricing are prepared privately, with deployment awaiting explicit approval to store these sensitive values in Vercel. No unrelated Google Cloud project has been modified.

## Local verification

Use an ignored .env.local with FES_LOCAL_STORAGE=1, the private pricing profile, an automatic quote limit and test owner credentials. Run npm run dev, then:

- npm run typecheck
- npm test
- node --env-file=.env.local tests/fes-workflow.test.mjs
- npm run build

The local store exists only for development/testing and is always disabled when VERCEL is set. Its data and credentials are ignored and explicitly excluded from the traced deployment bundle.

Unit tests use a fictional pricing fixture. Integration checks cover the upload flow, drawing basis, actual quote PDF, exact embedded original bytes, frozen quotes, review-only scopes, cross-session isolation, dashboard login and original-drawing retrieval. Synthetic test records are retained locally and are not uploaded to Google Cloud or GitHub.

## References

- Vercel Git integration: https://vercel.com/docs/git/vercel-for-github
- Vercel function payload limit: https://vercel.com/docs/functions/limitations
- Google signed form uploads: https://cloud.google.com/storage/docs/xml-api/post-object-forms
- Vercel Google workload federation: https://vercel.com/docs/oidc/gcp

Source preparation did not use or modify company skill-library workflows. The earlier ChatGPT Sites prototype is preserved separately.
