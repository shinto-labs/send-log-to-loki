const core = require("@actions/core");
const github = require("@actions/github");
const { DefaultArtifactClient } = require("@actions/artifact");
const fs = require("fs");

const timeFilePath = "time.txt";

const artifact = new DefaultArtifactClient();

async function writeStartTime() {
  const startTime = Date.now().toString();
  fs.writeFileSync(timeFilePath, startTime);
  await artifact.uploadArtifact("start-time", [timeFilePath], ".", {
    retentionDays: 2,
  });
}

async function sendLog(
  loki_address,
  loki_username,
  loki_password,
  status,
  additional_labels
) {
  let log_message = `workflow="${github.context.workflow}"`;
  log_message += ` repository_owner="${github.context.repo.owner}"`;
  log_message += ` repository_name="${github.context.repo.repo}"`;
  log_message += ` status="${status}"`;
  log_message += ` run_number=${github.context.runNumber}`;
  log_message += ` actor="${github.context.actor}"`;
  log_message += ` url="${github.context.payload.repository.html_url}/actions/runs/${github.context.runId}"`;
  log_message += ` ref="${github.context.ref}"`;

  let downloadedFilePath = "";
  try {
    const startTimeArtifact = await artifact.getArtifact("start-time");
    const downloadResponse = await artifact.downloadArtifact(
      startTimeArtifact.artifact.id
    );
    await artifact.deleteArtifact("start-time");
    downloadedFilePath = downloadResponse.downloadPath + "/" + timeFilePath;
  } catch (error) {
    core.warning(`Failed to download start time artifact: ${error}`);
  }

  if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
    const data = fs.readFileSync(downloadedFilePath, "utf8");
    const startTime = parseInt(data, 10);
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    core.info(`Calculated duration from start time: ${duration}`);
    log_message += ` duration=${duration}`;
  } else {
    core.warning(
      `
      No start time found
      add a step with the following code at the beginning of your workflow to calculate the duration:
      - name: Start time
        uses: shinto-labs/send-log-to-loki@v1.0.3
        with:
          measurement: start
      `
    );
  }

  log_message += additional_labels;

  const log_entry = {
    streams: [
      {
        stream: {
          job: "github-actions",
          level: status == "success" ? "info" : "error",
        },
        values: [[`${Date.now()}000000`, log_message]],
      },
    ],
  };

  core.info(`Sending log:\n${JSON.stringify(log_entry)}`);

  try {
    const response = await fetch(`${loki_address}/loki/api/v1/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${loki_username}:${loki_password}`
        ).toString("base64")}`,
      },
      body: JSON.stringify(log_entry),
    });
    if (!response.ok) {
      core.setFailed(`Failed to send log: ${response.statusText}`);
    }
  } catch (error) {
    core.setFailed(`Failed to send log: ${error}`);
  }
}

async function run() {
  const measurement = core.getInput("measurement");
  if (measurement == "start") {
    await writeStartTime();
  } else {
    const loki_address = core.getInput("loki_address");
    const loki_username = core.getInput("loki_username");
    const loki_password = core.getInput("loki_password");
    const status = core.getInput("status");

    for (const [key, value] of Object.entries({
      loki_address,
      loki_username,
      loki_password,
      status,
    })) {
      if (!value) {
        core.setFailed(`Missing required input: ${key}`);
      }
    }

    let additional_labels = core.getInput("additional_labels");
    additional_labels = additional_labels ? " " + additional_labels : "";

    await sendLog(
      loki_address,
      loki_username,
      loki_password,
      status,
      additional_labels
    );
  }
}

run();
