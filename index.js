const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'send_to_loki.sh');
execSync(`bash ${scriptPath}`, { stdio: 'inherit' });