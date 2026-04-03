/**
 * System Resource Query Utility
 *
 * Provides functions to query system resources (RAM, CPU) using Node.js os module.
 * Used by resource limit hooks to determine available capacity for agent spawning.
 *
 * Part of Phase 1: RAM Query Utility
 * See: docs/handoffs/resource-limits-plan.md
 */

import * as os from "os";

/**
 * System resource information.
 */
export interface SystemResources {
  /** Free RAM in bytes */
  freeRAM: number;
  /** Total RAM in bytes */
  totalRAM: number;
  /** Number of CPU cores */
  cpuCores: number;
  /** Load averages for 1, 5, and 15 minutes */
  loadAvg: number[];
}

/**
 * Get current system resource information.
 *
 * Uses Node.js os module to query:
 * - os.freemem() for available memory
 * - os.totalmem() for total memory
 * - os.cpus().length for CPU core count
 * - os.loadavg() for system load averages
 *
 * @returns SystemResources object with current resource values
 *
 * @example
 * ```typescript
 * import { getSystemResources } from './shared/resource-utils.js';
 *
 * const resources = getSystemResources();
 * console.log(`Free RAM: ${resources.freeRAM / 1024 / 1024} MB`);
 * console.log(`CPU Cores: ${resources.cpuCores}`);
 * ```
 */
export function getSystemResources(): SystemResources {
  return {
    freeRAM: os.freemem(),
    totalRAM: os.totalmem(),
    cpuCores: os.cpus().length,
    loadAvg: os.loadavg(),
  };
}
