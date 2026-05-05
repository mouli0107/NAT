/**
 * NAT 2.0 — blob-storage.ts
 *
 * Abstraction layer for project file storage.
 *
 * Mode selection (auto, based on env vars):
 *   AZURE_STORAGE_CONNECTION_STRING set  →  Azure Blob Storage
 *   Otherwise                            →  Local filesystem  (dev / single-machine)
 *
 * Azure naming:
 *   Container: nat20-tenant-{tenantId}   (one container per tenant — strict isolation)
 *   Blob path:  {projectId}/{filePath}
 *
 * Local naming:
 *   projects/default-tenant/{projectId}/{filePath}   (backward compat for existing projects)
 *   projects/{tenantId}/{projectId}/{filePath}
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectFile {
  path: string;           // relative path within project, e.g. "tests/TC001.spec.ts"
  content: string;        // UTF-8 text
}

export interface SyncManifest {
  tenantId: string;
  projectId: string;
  projectName: string;
  serverUrl: string;      // e.g. "https://nat20.azurewebsites.net"
  files: ProjectFile[];
  syncedAt: string;       // ISO timestamp
}

// ─── Azure helper (dynamic import — optional dep) ─────────────────────────────

async function getBlobServiceClient(connectionString?: string) {
  const connStr = connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) return null;
  try {
    // @azure/storage-blob is an optional peer dep — don't fail if absent
    const { BlobServiceClient } = await import('@azure/storage-blob');
    return BlobServiceClient.fromConnectionString(connStr);
  } catch {
    return null;
  }
}

function containerName(tenantId: string): string {
  return `nat20-tenant-${tenantId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

// ─── Local Path Resolution ────────────────────────────────────────────────────

const PROJECTS_ROOT = path.join(process.cwd(), 'projects');

function localProjectDir(tenantId: string, projectId: string): string {
  // Backward-compat: default-tenant uses the original flat layout
  if (tenantId === 'default-tenant') {
    const flat = path.join(PROJECTS_ROOT, 'default-tenant', projectId);
    if (fs.existsSync(flat)) return flat;
    // Fall back to legacy path (no tenant folder)
    const legacy = path.join(PROJECTS_ROOT, projectId);
    if (fs.existsSync(legacy)) return legacy;
  }
  return path.join(PROJECTS_ROOT, tenantId, projectId);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write a batch of project files to storage.
 * Used by the script-writer after generation.
 */
export async function writeProjectFiles(
  tenantId: string,
  projectId: string,
  files: ProjectFile[],
  connectionString?: string,
): Promise<void> {
  const client = await getBlobServiceClient(connectionString);

  if (client) {
    // Azure mode
    const container = client.getContainerClient(containerName(tenantId));
    await container.createIfNotExists({ access: 'container' });

    await Promise.all(files.map(async (file) => {
      const blobPath = `${projectId}/${file.path}`;
      const blockBlob = container.getBlockBlobClient(blobPath);
      const buffer = Buffer.from(file.content, 'utf-8');
      await blockBlob.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: 'text/plain; charset=utf-8' },
      });
    }));
  } else {
    // Local filesystem mode
    const baseDir = localProjectDir(tenantId, projectId);
    await mkdirAsync(baseDir, { recursive: true });

    await Promise.all(files.map(async (file) => {
      const fullPath = path.join(baseDir, file.path);
      await mkdirAsync(path.dirname(fullPath), { recursive: true });
      await writeFileAsync(fullPath, file.content, 'utf-8');
    }));
  }
}

/**
 * Read all files for a project from storage.
 * Returns array of { path, content }.
 */
export async function readProjectFiles(
  tenantId: string,
  projectId: string,
  connectionString?: string,
): Promise<ProjectFile[]> {
  const client = await getBlobServiceClient(connectionString);

  if (client) {
    // Azure mode
    const container = client.getContainerClient(containerName(tenantId));
    const files: ProjectFile[] = [];
    const prefix = `${projectId}/`;

    for await (const blob of container.listBlobsFlat({ prefix })) {
      const blockBlob = container.getBlockBlobClient(blob.name);
      const download = await blockBlob.download(0);
      const chunks: Buffer[] = [];
      for await (const chunk of download.readableStreamBody as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      files.push({
        path: blob.name.slice(prefix.length),
        content: Buffer.concat(chunks).toString('utf-8'),
      });
    }
    return files;
  } else {
    // Local filesystem mode
    const baseDir = localProjectDir(tenantId, projectId);
    if (!fs.existsSync(baseDir)) return [];
    return readDirRecursive(baseDir, baseDir);
  }
}

async function readDirRecursive(baseDir: string, dir: string): Promise<ProjectFile[]> {
  const results: ProjectFile[] = [];
  let entries: string[];
  try {
    entries = await readdirAsync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = await statAsync(fullPath).catch(() => null);
    if (!stat) continue;
    if (stat.isDirectory()) {
      const children = await readDirRecursive(baseDir, fullPath);
      results.push(...children);
    } else {
      const content = await readFileAsync(fullPath, 'utf-8').catch(() => '');
      results.push({ path: path.relative(baseDir, fullPath).replace(/\\/g, '/'), content });
    }
  }
  return results;
}

/**
 * Build a SyncManifest for pushing to workspace agents.
 */
export async function buildSyncManifest(
  tenantId: string,
  projectId: string,
  projectName: string,
  serverUrl: string,
  connectionString?: string,
): Promise<SyncManifest> {
  const files = await readProjectFiles(tenantId, projectId, connectionString);
  return {
    tenantId,
    projectId,
    projectName,
    serverUrl,
    files,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Return local directory for a project, or null if using Azure.
 * Used by the execution engine to find test files.
 */
export function getLocalProjectDir(tenantId: string, projectId: string): string | null {
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) return null;
  return localProjectDir(tenantId, projectId);
}
