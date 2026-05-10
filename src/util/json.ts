import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function readJson<T = unknown>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw, bigintReviver) as T;
}

export async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const serialized = JSON.stringify(data, bigintReplacer, 2);
  await writeFile(path, `${serialized}\n`, 'utf8');
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? `${value.toString()}n` : value;
}

function bigintReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}
