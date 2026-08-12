import { error, setFailed, setOutput } from '@actions/core';
import { exec, ExecListeners } from '@actions/exec';
import {
  CONTAINER,
  FOSSA_API_KEY,
  RUN_TESTS,
  TEST_DIFF_REV,
  ENDPOINT,
  BRANCH,
  PROJECT,
  TEAM,
  POLICY,
  CONFIG,
  DEBUG,
  REPORT_FORMAT,
  WORKING_DIRECTORY,
} from './config.js';
import { fetchFossaCli } from './download-cli.js';
import fs from 'fs';
import * as core from '@actions/core';
import axios, {isAxiosError} from 'axios'

async function validateSubscription() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'fossas/fossa-action';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body: Record<string, string> = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

// Github doesn't always collect exit codes correctly, so we check output
const failedRegex = /(A fatal error occurred|Test failed\. Number of issues found)/;

export async function analyze(): Promise<void> {
  const getEndpointArgs = (): string[] => !ENDPOINT ? [] : [
    '--endpoint',
    ENDPOINT,
  ];
  const getBranchArgs = (): string[] => !BRANCH ? [] : [
    '--branch',
    BRANCH,
  ];
  const getProjectArgs = (): string[] => !PROJECT ? [] : [
    '--project',
    PROJECT,
  ];
  const getTeamArgs = (): string[] => !TEAM ? [] : [
    '--team',
    TEAM,
  ];
  const getPolicyArgs = (): string[] => !POLICY ? [] : [
    '--policy',
    POLICY,
  ];
  const getConfigPath = (): string[] => !CONFIG ? [] : [
    '--config',
    CONFIG,
  ];

  const getArgs = (cmd: string[]) => [
    CONTAINER ? 'container' : null,
    ...cmd,
    ...getEndpointArgs(),
    ...getBranchArgs(),
    ...getProjectArgs(),
    ...getTeamArgs(),
    ...getPolicyArgs(),
    ...getConfigPath(),
    DEBUG ? '--debug' : null,
  ].filter(arg => arg);

  // Setup listeners
  let output;
  const collectOutput = (data: Buffer) => {
    output += data.toString();
  };

  const listeners: ExecListeners = {
    stdout: collectOutput,
    stderr: collectOutput,
  };

  // Collect default options: Env and listeners
  const PATH = process.env.PATH || '';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const defaultOptions = { env: { ...process.env, PATH, FOSSA_API_KEY }, cwd: WORKING_DIRECTORY, listeners };

  if (!RUN_TESTS) {
    output = '';
    const exitCode = await exec('fossa', [...getArgs(['analyze']), CONTAINER], defaultOptions);

    // Check output or exitCode
    if (exitCode !== 0 || output.match(failedRegex)) {
      throw new Error(`FOSSA failed to scan`);
    }
  } else if (RUN_TESTS) {
    output = '';
    const args = [...getArgs(['test']), CONTAINER];

    if (TEST_DIFF_REV && TEST_DIFF_REV !== '') {
      args.push('--diff', TEST_DIFF_REV);
    }

    const exitCode = await exec('fossa', args, defaultOptions);

    // Check output or exitCode
    if (exitCode !== 0 || output.match(failedRegex)) {
      throw new Error(`Fossa tests failed`);
    }
  }
}

export async function report(): Promise<void> {
  const getEndpointArgs = (): string[] => !ENDPOINT ? [] : [
    '--endpoint',
    ENDPOINT,
  ];
  const getProjectArgs = (): string[] => !PROJECT ? [] : [
    '--project',
    PROJECT,
  ];
  const getFormatArgs = (): string[] => !REPORT_FORMAT ? [] : [
    '--format',
    REPORT_FORMAT,
  ];

  const getArgs = (cmd: string[]) => [
    ...cmd,
    ...getEndpointArgs(),
    ...getProjectArgs(),
    ...getFormatArgs(),
    DEBUG ? '--debug' : null,
  ].filter(arg => arg);

  // Setup listeners
  let stdout = '';
  let stderr = '';
  const collectStdout = (data: Buffer) => {
    stdout += data.toString();
  };
  const collectStderr = (data: Buffer) => {
    stderr += data.toString();
  };

  const listeners: ExecListeners = {
    stdout: collectStdout,
    stderr: collectStderr,
  };

  // Collect default options: Env and listeners
  const PATH = process.env.PATH || '';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const defaultOptions = { env: { ...process.env, PATH, FOSSA_API_KEY }, cwd: WORKING_DIRECTORY, listeners };
  const exitCode = await exec('fossa', getArgs(['report', 'attribution']), defaultOptions);

  // Check output or exitCode
  if (exitCode !== 0 || stderr.match(failedRegex)) {
    throw new Error(`FOSSA failed to scan`);
  }

  setOutput('report', stdout);
}

async function run() {
  await validateSubscription();
  try {
    await fetchFossaCli();
  } catch (e) {
    error(`There was an error fetching FOSSA CLI. ${e}`);
  }

  try {
    await analyze();
    if (REPORT_FORMAT?.length) {
      await report();
    }
  } catch (e) {
    setFailed(e);
  }
}

run();
