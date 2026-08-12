[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

Find license compliance and security issues in your applications with [FOSSA](https://fossa.com) in Github Actions, using latest FOSSA CLI.

## About FOSSA Action

FOSSA Action provides an easy to use entry point to using FOSSA in your github workflow. This github action will run FOSSA CLI in your github workflows with, at minimum, an API key. Below you can find [input documentation](#inputs) and [examples](#examples).

FOSSA Action will run on any linux runner or on a MacOS runner. **Note**: In order to use container scanning, a running docker daemon is required - unfortunately Github's MacOS runner does not provide docker.

Windows is not currently supported in this action.

## Inputs

### `api-key`
**Required** Your FOSSA API key
Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
```

### `run-tests`
**Optional** If set to `true` FOSSA will run the `fossa test` command.

If not set or set to `false` FOSSA will run normal scan behavior. In order to run tests, a scan must first be completed.
Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          run-tests: true
```

## `generate-report`
**Optional** If set, FOSSA will run the `fossa report` command. Currently only the "attribution" (or "licensing") report is supported.

The value should be set to a [report format](https://github.com/fossas/fossa-cli/blob/master/docs/references/subcommands/report.md#specifying-a-report-format).

The report's content is set as an output. Write the output to a file as needed.

Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - id: fossa
        uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.fossaApiKey}}
          run-tests: true
          generate-report: html
      - run: echo '${{ steps.fossa.outputs.report }}' > report.html
```

## `test-diff-revision`
**Optional** If set to a string, FOSSA will run the `fossa test` command with the `--diff` [option](https://github.com/fossas/fossa-cli/blob/master/docs/references/subcommands/test.md#test-for-new-issues-compared-to-another-revision).

Setting this field has no effect if `run-tests` is `false`.
You must also set `run-tests` to `true` in order for this field to take effect.

This example will run fossa test only if the workflow run event is a pull request and verify that there are no new issues relative to the base ref.

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          run-tests: ${{ github.event_name == 'pull_request' }}
          test-diff-revision: ${{ github.event.pull_request.base.sha }}

```

### `container`
**Optional** A container name or OCI image path.  Set to use FOSSA's container scanning functionality. This will run `fossa container analyze` (default behavior) and `fossa container test` (if used in combination with `run-tests`).

If not set FOSSA will run normal scan behavior.
Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          container: ubuntu:20.04
```

### `branch`

**Optional** Branch passed to FOSSA CLI.

Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          branch: some-feature-branch
```

### `project`

**Optional** Project flag passed to FOSSA CLI.

Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          project: some-project-name
```

### `endpoint`

**Optional** Endpoint passed to FOSSA CLI. Defaults to `app.fossa.com`. [Read more](https://github.com/fossas/spectrometer/blob/master/docs/userguide.md#common-fossa-project-flags).

Example
```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          endpoint: fossa.my-company.com
```

### `debug`

**Optional** If set to `true`, run all FOSSA commands in debug mode. Running `fossa analyze` in debug mode will generate a debug bundle that can be uploaded as a build artifact after this action completes.

One way to upload build artifacts is to use the [`upload-artifact`](https://github.com/actions/upload-artifact) GitHub action. Example:

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          debug: true
      - uses: actions/upload-artifact@v7
        with:
          name: fossa.debug.json.gz
          path: ./fossa.debug.json.gz
```


### `pinned-cli-version`

**Optional** By default, the action will use the latest version of FOSSA CLI.
In some specific circumstances it makes sense to pin the version of the CLI used by the action.
To do that you can use `pinned-cli-version`:

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          pinned-cli-version: v3.0.0
      - uses: actions/upload-artifact@v7
        with:
          name: fossa.debug.json.gz
          path: ./fossa.debug.json.gz
```

### `working-directory`

**Optional** By default, the action will scan anything in the default github actions working directory. Use this option to scan a project in a different directory.

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          path: my-working-directory
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          working-directory: my-working-directory
```


## Examples
We've provided a few examples of how to use FOSSA's Github Action in your own project. These examples use an API key stored as a Github secret environment variable `FOSSA_API_KEY`.

### Running a scan
This runs a basic FOSSA scan using FOSSA CLI on a your checked out project.

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
```

### Running tests
This runs `fossa tests` after doing an initial scan.

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - name: "Checkout Code"
        uses: actions/checkout@v7

      - name: "Run FOSSA Scan"
        uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          config: ./config/.fossa.yml # Use a config file not in the base working directory

      - name: "Run FOSSA Test"
        uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          run-tests: true
          config: ./config/.fossa.yml
```

### Running Container Scanning
Running container scanning is extremely similar to running FOSSA with a traditional project. This example runs a scan then runs tests. `ubuntu:20.14` can be replaced with your newly build docker or OCI image.

```yml
jobs:
  fossa-scan:
    runs-on: ubuntu-latest
    steps:
      - name: "Checkout Code"
        uses: actions/checkout@v7

      - name: "Run FOSSA Scan"
        uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          container: ubuntu:20.04

      - name: "Run FOSSA Test"
        uses: step-security/fossa-action@v2
        with:
          api-key: ${{secrets.FOSSA_API_KEY}}
          container: ubuntu:20.04
          run-tests: true
```
