#!/usr/bin/env node
/**
 * monitor-server.js — моніторинг ресурсів під час стрес-тесту
 *
 * Збирає CPU та Memory Node.js процесу кожну секунду
 * і виводить у CSV для побудови графіків.
 *
 * Запуск: node stress-tests/monitor-server.js > results/server-metrics.csv
 */

'use strict';

const os = require('os');
const fs = require('fs');

const OUT_FILE = process.env.METRICS_FILE || 'stress-tests/results/server-metrics.csv';
const INTERVAL = 1000; // мс
const DURATION = parseInt(process.env.DURATION || '660') * 1000; // 11 хвилин (час стрес-тесту)

// Знаходимо PID процесу blog app (node src/app.js)
const { execSync } = require('child_process');

function getNodePid() {
  try {
    const result = execSync("pgrep -f 'node src/app.js'", { encoding: 'utf8' }).trim();
    return parseInt(result.split('\n')[0]);
  } catch (e) {
    return null;
  }
}

function getCpuUsage(pid) {
  try {
    // Linux: /proc/<pid>/stat
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(' ');
    const utime = parseInt(stat[13]);
    const stime = parseInt(stat[14]);
    return { utime, stime, total: utime + stime };
  } catch (e) {
    return null;
  }
}

function getMemUsage(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const vmRSS = status.match(/VmRSS:\s+(\d+)/);
    return vmRSS ? parseInt(vmRSS[1]) : 0; // KB
  } catch (e) {
    return 0;
  }
}

function getSystemCpu() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys  += cpu.times.sys;
    idle += cpu.times.idle;
    irq  += cpu.times.irq;
  }
  return { user, nice, sys, idle, irq, total: user+nice+sys+idle+irq };
}

// Запис заголовку CSV
const header = 'timestamp,elapsed_s,process_cpu_pct,system_cpu_pct,process_mem_mb,system_mem_free_mb,system_mem_used_pct\n';
fs.mkdirSync('stress-tests/results', { recursive: true });
fs.writeFileSync(OUT_FILE, header);

const stream = fs.createWriteStream(OUT_FILE, { flags: 'a' });
const startTime = Date.now();
let prevCpu = null;
let prevSysCpu = getSystemCpu();

const pid = getNodePid();
if (!pid) {
  console.error('ERROR: Could not find Node.js app process. Is src/app.js running?');
  process.exit(1);
}

console.log(`Monitoring PID ${pid} (Node.js app)`);
console.log(`Output: ${OUT_FILE}`);
console.log(`Duration: ${DURATION/1000}s`);
console.log('Press Ctrl+C to stop early\n');

const interval = setInterval(() => {
  const now     = Date.now();
  const elapsed = Math.round((now - startTime) / 1000);
  const ts      = new Date(now).toISOString();

  // Process CPU %
  let processCpu = 0;
  const currCpu = getCpuUsage(pid);
  if (currCpu && prevCpu) {
    const deltaCpu = currCpu.total - prevCpu.total;
    const deltaTime = INTERVAL / (1000 / os.cpus().length); // ticks
    processCpu = Math.min(100, (deltaCpu / Math.max(1, deltaTime)) * 100).toFixed(1);
  }
  prevCpu = currCpu;

  // System CPU %
  const currSysCpu = getSystemCpu();
  const sysDelta = currSysCpu.total - prevSysCpu.total;
  const sysIdle  = currSysCpu.idle  - prevSysCpu.idle;
  const sysCpuPct = sysDelta > 0 ? (((sysDelta - sysIdle) / sysDelta) * 100).toFixed(1) : 0;
  prevSysCpu = currSysCpu;

  // Memory
  const processMemKB = getMemUsage(pid);
  const processMemMB = (processMemKB / 1024).toFixed(1);
  const sysFreeMemMB = (os.freemem() / 1024 / 1024).toFixed(1);
  const sysTotalMem  = os.totalmem() / 1024 / 1024;
  const sysUsedPct   = (((sysTotalMem - os.freemem() / 1024 / 1024) / sysTotalMem) * 100).toFixed(1);

  const line = `${ts},${elapsed},${processCpu},${sysCpuPct},${processMemMB},${sysFreeMemMB},${sysUsedPct}\n`;
  stream.write(line);

  // Console output
  process.stdout.write(`\r  t=${elapsed}s | CPU: proc=${processCpu}% sys=${sysCpuPct}% | Mem: proc=${processMemMB}MB sys=${sysUsedPct}%`);

  if (now - startTime >= DURATION) {
    clearInterval(interval);
    stream.end();
    console.log('\n\nMonitoring complete. Results saved to:', OUT_FILE);
  }
}, INTERVAL);

process.on('SIGINT', () => {
  clearInterval(interval);
  stream.end();
  console.log('\n\nMonitoring stopped. Results saved to:', OUT_FILE);
  process.exit(0);
});
