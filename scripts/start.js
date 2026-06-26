const net = require('net');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 5000);

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' }
      );
      return;
    }

    const { execSync } = require('child_process');
    execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore if no process is listening or the tool is unavailable.
  }
}

async function main() {
  const occupied = await isPortOpen(PORT);
  if (occupied) {
    console.log(`Port ${PORT} is already in use. Restarting the app on a clean port...`);
    killProcessOnPort(PORT);
  }

  const child = spawn(process.execPath, ['server.js'], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });
}

main().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
