# FinanceOne PC release archive

Current paired release:

- Mobile: v1.7.2 (`main`)
- PC portable: v1.10.2

The PC source archive in this directory fixes Google OAuth token refresh so the
desktop client always supplies its client secret when exchanging or refreshing
tokens. The portable build also fails early when the build-time OAuth JSON is
missing.

Security:

- OAuth JSON, client secrets, signing keys, and tokens are intentionally not
  committed to GitHub.
- Required build credentials are retained separately in the owner's private
  Google Drive folder: `가계부/빌드 인증정보`.
- The portable executable contains only the runtime credential needed by the
  installed desktop OAuth client; the project ZIP excludes it.

Build:

```bash
FINANCEONE_GOOGLE_OAUTH_JSON=/absolute/path/to/windows-oauth.json npm run build:portable
```

Release artifacts and checksums are retained under the version folder
`가계부/Mobile-v1.7.2_PC-v1.10.2` in Google Drive.
