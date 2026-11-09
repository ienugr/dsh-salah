# Security reporting

Please avoid disclosing credentials, precise private locations, session logs, or exploit details in a public issue.

## Report a vulnerability

If this GitHub repository has private vulnerability reporting enabled, use **Security → Advisories → Report a vulnerability**.

If that option is unavailable, open an issue requesting a private reporting channel without including the vulnerability details. A dedicated private contact address has not yet been configured for this repository.

A useful private report includes the affected plugin and Harness versions, the hosting environment, the expected and observed behavior, and a minimal reproduction using non-sensitive data. Redact tokens and personal locations.

## Scope

Relevant issues include bypasses of the authenticated Host API, unintended credential or location disclosure, arbitrary outbound requests, unsafe settings persistence, and dependency vulnerabilities affecting the plugin.

This plugin is tested against the Harness version declared in its package manifest. Compatibility with other versions and the security of a custom hosting deployment have not been established.

There is no published response-time commitment or long-term support policy. No security audit or certification is implied by the presence of tests or this document.

For routine bugs, use a normal issue with sanitized reproduction steps. See [Privacy](PRIVACY.md) for the plugin’s data handling and [Contributing](CONTRIBUTING.md) for local checks.
