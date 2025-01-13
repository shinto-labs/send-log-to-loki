# Send logs to Loki

This GitHub Action sends logs to a Loki server. It can record the start time of a job and send log messages with various details about the workflow run.

## Inputs

- `measurement`: Controls the measurement type; "start" to record the start time of the job, "finish" or undefined to send the log message to Loki.
- `status`: Controls the status of the log message; "success" or "failure".
- `loki_address`: Loki server address required to send log.
- `loki_username`: Loki username required to send log.
- `loki_password`: Loki password required to send log.
- `additional_labels`: Additional labels to be added to the log in logfmt format.

## Example Workflow

```yaml
name: CI

on: [push, pull_request]

jobs:
  send-logs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Start time
        uses: shinto-labs/send-log-to-loki@vvv1.0.2
        with:
          measurement: start

      - name: Run some steps
        run: echo "Running some steps..."

      - name: Send Log to Loki
        uses: shinto-labs/send-log-to-loki@vvv1.0.2
        with:
          loki_address: "http://your-loki-instance:3100"
          loki_username: ${{ secrets.LOKI_USERNAME }}
          loki_password: ${{ secrets.LOKI_PASSWORD }}
          status: ${{ job.status }}
          additional_labels: "example_label=example_value"
```

## Default Labels included in the log

The following default labels are provided in the log message:

- `workflow`: The name of the workflow.
- `repository_owner`: The owner of the repository.
- `repository_name`: The name of the repository.
- `status`: The status of the log message (success or failure).
- `run_number`: The run number of the workflow.
- `actor`: The user who triggered the workflow.
- `url`: The URL to the workflow run.
- `ref`: The git reference (branch or tag).
- `duration`: The duration of the job in seconds (if the start time was recorded).
