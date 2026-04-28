# azure-pipelines-ci-doctor

Audit `azure-pipelines.yml` for **waste, cost, and security gaps**. MIT, no telemetry.

Sister project to [`ci-doctor`](https://www.npmjs.com/package/ci-doctor) (GitHub Actions), [`gitlab-ci-doctor`](https://www.npmjs.com/package/gitlab-ci-doctor), and [`bitbucket-ci-doctor`](https://www.npmjs.com/package/bitbucket-ci-doctor). Same engine, Azure-native rules.

## Install

```bash
npx azure-pipelines-ci-doctor          # one-shot
# or
npm i -g azure-pipelines-ci-doctor
```

## Use

```bash
azure-pipelines-ci-doctor              # audit ./azure-pipelines.yml
azure-pipelines-ci-doctor --markdown   # PR-comment friendly
azure-pipelines-ci-doctor --json       # machine-readable
azure-pipelines-ci-doctor --rules      # list checks
azure-pipelines-ci-doctor --demo       # smoke-test
azure-pipelines-ci-doctor --severity=warn
azure-pipelines-ci-doctor --only=expensive-vm-image,container-no-pin
```

## Rules

| id | severity | category | what |
| --- | --- | --- | --- |
| `expensive-vm-image` | warn | cost | macOS-latest (~10x) or windows-latest (~2x) without commands that need them |
| `container-no-pin` | warn | security | `container.image:` not pinned to `@sha256:<digest>` |
| `missing-timeout-in-minutes` | warn | cost | job has no `timeoutInMinutes` (default 60 hosted / 360 self-hosted) |
| `missing-cache` | warn | cost | npm/pip/maven/gradle/cargo/go/bundler installs without `Cache@2` task |
| `wide-trigger` | warn | cost | `trigger:` or `pr:` unscoped (no branch or path filter) |
| `inline-secret-leak` | warn | security | step uses `$(SECRET_NAME)` macro - expands inline in logs |
| `legacy-task-version` | warn | reliability | built-in task pinned to outdated major version |
| `unbounded-parallelism` | warn | cost | `strategy.parallel` >= 5 or matrix >= 5 legs without `maxParallel` |

## Drop into a pipeline

Add a stage that runs against itself on every PR:

```yaml
- stage: AuditPipeline
  jobs:
    - job: cidoctor
      timeoutInMinutes: 5
      pool:
        vmImage: 'ubuntu-latest'
      steps:
        - task: UseNode@2
          inputs:
            version: '20.x'
        - script: npx --yes azure-pipelines-ci-doctor --markdown > $(Build.ArtifactStagingDirectory)/ci-doctor.md
        - publish: $(Build.ArtifactStagingDirectory)/ci-doctor.md
          artifact: ci-doctor-report
```

Or via Azure DevOps REST + a PR comment task to post inline on every iteration.

## In-browser scanner

Paste any `azure-pipelines.yml` at <https://depmedicdev-byte.github.io/scan-azure.html>. No upload, no signup, runs entirely in your tab.

## Family

- CLI: <https://www.npmjs.com/package/azure-pipelines-ci-doctor>
- GitHub Actions port: <https://www.npmjs.com/package/ci-doctor>
- GitLab port: <https://www.npmjs.com/package/gitlab-ci-doctor>
- Bitbucket port: <https://www.npmjs.com/package/bitbucket-ci-doctor>

## License

MIT (c) depmedic
