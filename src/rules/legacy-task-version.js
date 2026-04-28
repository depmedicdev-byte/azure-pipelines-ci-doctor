'use strict';
const { jobs, makeFinding } = require('../parse');

// task -> latest known major (as of 2026-04). Outdated majors keep working but lose fixes.
const LATEST = {
  UseNode: 2, NodeTool: 2, Npm: 1,
  UsePythonVersion: 0, PythonScript: 0,
  UseDotNet: 2, DotNetCoreCLI: 2,
  UseRubyVersion: 0,
  Maven: 4, Gradle: 3,
  Cache: 2, PublishBuildArtifacts: 1, DownloadBuildArtifacts: 1,
  PublishPipelineArtifact: 1, DownloadPipelineArtifact: 2,
  Docker: 2, AzureCLI: 2, AzureWebApp: 1, AzureRmWebAppDeployment: 4,
  Bash: 3, PowerShell: 2, CmdLine: 2,
};

module.exports = {
  id: 'legacy-task-version',
  severity: 'warn',
  description: 'Step uses an outdated major version of a built-in Azure Pipelines task. Upgrade to the latest major to receive Node 20 runtime, security patches, and bug fixes.',
  category: 'reliability',
  check(parsed) {
    const out = [];
    const all = jobs(parsed);
    for (const j of all) {
      for (let i = 0; i < j.steps.length; i++) {
        const s = j.steps[i];
        if (!s || typeof s.task !== 'string') continue;
        const m = s.task.match(/^([A-Za-z][A-Za-z0-9]*)@(\d+)$/);
        if (!m) continue;
        const name = m[1];
        const used = parseInt(m[2], 10);
        const latest = LATEST[name];
        if (latest === undefined) continue;
        if (used >= latest) continue;
        const path = j.jobPath.length ? [...j.jobPath, 'steps', i, 'task'] : ['steps', i, 'task'];
        out.push(makeFinding(
          module.exports,
          parsed,
          `task '${s.task}' is outdated. Latest major is ${name}@${latest}. Bump for Node 20 runtime + current bug fixes.`,
          path,
        ));
      }
    }
    return out;
  },
};
