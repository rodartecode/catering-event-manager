/**
 * Cross-service integration test infrastructure.
 * Builds and runs the Go scheduling service as a child process
 * for end-to-end testing with the real conflict detection engine.
 */

import { type ChildProcess, execSync, spawn } from 'child_process';
import net from 'net';
import path from 'path';

const GO_SERVICE_DIR = path.resolve(__dirname, '../../../../apps/scheduling-service');
const BINARY_PREFIX = '/tmp/test-scheduler';

let goProcess: ChildProcess | null = null;
let binaryPath: string | null = null;
let servicePort: number | null = null;

/**
 * Find a free port by binding to port 0 and reading the assigned port.
 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error('Failed to get port from server address'));
      }
    });
    server.on('error', reject);
  });
}

/**
 * Build the Go scheduling service binary.
 */
export function buildGoService(): string {
  const timestamp = Date.now();
  const outputPath = `${BINARY_PREFIX}-${timestamp}`;

  console.log(`[Integration] Building Go service at ${GO_SERVICE_DIR}...`);

  try {
    execSync(`go build -o ${outputPath} cmd/scheduler/main.go`, {
      cwd: GO_SERVICE_DIR,
      stdio: 'pipe',
      timeout: 60000, // 60 seconds for build
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to build Go service: ${msg}`);
  }

  console.log(`[Integration] Go service built at ${outputPath}`);
  binaryPath = outputPath;
  return outputPath;
}

/**
 * Start the Go scheduling service on a dynamic port.
 *
 * @param dbUrl - PostgreSQL connection string
 * @returns The port the service is listening on
 */
export async function startGoService(dbUrl: string): Promise<number> {
  if (!binaryPath) {
    throw new Error('Must call buildGoService() first');
  }

  const port = await findFreePort();
  servicePort = port;

  console.log(`[Integration] Starting Go service on port ${port}...`);

  goProcess = spawn(binaryPath, [], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: dbUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Log stdout/stderr for debugging
  goProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Go] ${msg}`);
  });

  goProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[Go:err] ${msg}`);
  });

  goProcess.on('error', (err) => {
    console.error(`[Integration] Go process error: ${err.message}`);
  });

  // Wait for health check
  await waitForHealthCheck(port);

  console.log(`[Integration] Go service ready on port ${port}`);
  return port;
}

/**
 * Poll the health check endpoint until it responds or retries are exhausted.
 */
async function waitForHealthCheck(port: number, retries = 10, intervalMs = 1000): Promise<void> {
  const url = `http://localhost:${port}/api/v1/health`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return;
      }
    } catch {
      // Service not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Go service failed to start after ${retries} retries on port ${port}`);
}

/**
 * Stop the Go scheduling service and clean up the binary.
 */
export async function stopGoService(): Promise<void> {
  if (goProcess && !goProcess.killed) {
    console.log('[Integration] Stopping Go service...');

    // Send SIGTERM
    goProcess.kill('SIGTERM');

    // Wait for exit with timeout
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (goProcess && !goProcess.killed) {
          console.log('[Integration] Force killing Go service (SIGKILL)...');
          goProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      goProcess?.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    goProcess = null;
  }

  // Clean up binary
  if (binaryPath) {
    try {
      execSync(`rm -f ${binaryPath}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
    binaryPath = null;
  }

  servicePort = null;
}

/**
 * Get the scheduling service URL for the running test instance.
 */
export function getServiceUrl(): string {
  if (!servicePort) {
    throw new Error('Go service is not running');
  }
  return `http://localhost:${servicePort}`;
}

/**
 * Get the current service port.
 */
export function getServicePort(): number | null {
  return servicePort;
}
