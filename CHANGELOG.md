# Changelog

## 0.1.0 - 2026-04-28

Initial release. 8 rules across cost / security / reliability:

- **expensive-vm-image** (cost) - macOS / windows pool images without commands that need them
- **container-no-pin** (security) - container.image not pinned to `@sha256:<digest>`
- **missing-timeout-in-minutes** (cost) - job missing `timeoutInMinutes`
- **missing-cache** (cost) - npm / pip / maven / gradle / cargo / go / bundler without `Cache@2`
- **wide-trigger** (cost) - `trigger:` or `pr:` unscoped (no branches / paths filter)
- **inline-secret-leak** (security) - `$(SECRET_NAME)` macro that expands inline in logs
- **legacy-task-version** (reliability) - built-in task pinned to outdated major version
- **unbounded-parallelism** (cost) - `strategy.parallel >= 5` or matrix >= 5 without `maxParallel`

Reporters: text (default), JSON (`--json`), Markdown (`--markdown`).
Tests: 5 green via `node --test`.
