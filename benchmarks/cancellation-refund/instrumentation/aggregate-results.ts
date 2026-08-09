import path from 'path';
import fs from 'fs';
import { computeMetrics, RunMetrics } from './benchmark-metrics';

interface K6Point {
  type: string;
  data: {
    name: string;
    value: number;
    time: string;
    tags: Record<string, string>;
  };
}

function parseK6JsonFile(filePath: string): Record<string, number[]> {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
  const metrics: Record<string, number[]> = {};
  for (const line of lines) {
    try {
      const obj: K6Point = JSON.parse(line);
      if (obj.type === 'Point') {
        const name = obj.data.name;
        if (!metrics[name]) metrics[name] = [];
        metrics[name].push(obj.data.value);
      }
    } catch {}
  }
  return metrics;
}

function aggregateDirectory(dirPath: string): Record<string, number[]> {
  if (!fs.existsSync(dirPath)) return {};
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
  const combinedMetrics: Record<string, number[]> = {};
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const metrics = parseK6JsonFile(filePath);
    
    for (const [name, values] of Object.entries(metrics)) {
      if (!combinedMetrics[name]) combinedMetrics[name] = [];
      combinedMetrics[name].push(...values);
    }
  }
  
  return combinedMetrics;
}

function processAndWriteReport(metrics: Record<string, number[]>, reportPath: string, csvPath: string) {
  const report: Record<string, RunMetrics> = {};
  let csv = 'metric,mean,median,stddev,p50,p90,p95,p99,ci95Lower,ci95Upper,n\n';
  
  for (const [name, values] of Object.entries(metrics)) {
    if (values.length === 0) continue;
    try {
      const m = computeMetrics(values);
      report[name] = m;
      csv += `${name},${m.mean},${m.median},${m.stddev},${m.p50},${m.p90},${m.p95},${m.p99},${m.ci95Lower},${m.ci95Upper},${m.n}\n`;
    } catch (e) {
      console.warn(`Could not compute metrics for ${name}:`, e);
    }
  }
  
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, csv);
}

function main() {
  const rawDir = path.join(__dirname, '../results/raw');
  const reportsDir = path.join(__dirname, '../results/reports');
  const processedDir = path.join(__dirname, '../results/processed');

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(processedDir, { recursive: true });

  const cancelMetrics = aggregateDirectory(path.join(rawDir, 'cancellation'));
  if (Object.keys(cancelMetrics).length > 0) {
    processAndWriteReport(
      cancelMetrics, 
      path.join(reportsDir, 'cancellation-report.json'),
      path.join(processedDir, 'cancellation-summary.csv')
    );
  }

  const refundMetrics = aggregateDirectory(path.join(rawDir, 'refund'));
  if (Object.keys(refundMetrics).length > 0) {
    processAndWriteReport(
      refundMetrics, 
      path.join(reportsDir, 'refund-report.json'),
      path.join(processedDir, 'refund-summary.csv')
    );
  }

  const combined = { ...cancelMetrics };
  for (const [k, v] of Object.entries(refundMetrics)) {
    if (!combined[k]) combined[k] = [];
    combined[k].push(...v);
  }

  if (Object.keys(combined).length > 0) {
    fs.writeFileSync(
      path.join(reportsDir, 'combined-report.json'),
      JSON.stringify(combined, null, 2)
    );
  }

  console.log('Aggregation completed successfully.');
}

main();
