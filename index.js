import { z } from 'zod';
import { DEFAULT_SETTINGS, SalahService, createSalahRoute, createSalahTool, validateStoredSettings } from './service.js';

export const inject = ['storageDomain', 'tools', 'connection'];
export const persistedSchema = z.custom(value => {
  try { validateStoredSettings(value); return true; } catch { return false; }
}, 'Invalid Salah preferences.');

export async function apply(ctx) {
  const domain = await ctx.storageDomain.open({
    name: 'salah_preferences', version: 1, tables: {},
    global: { schema: persistedSchema, initial: structuredClone(DEFAULT_SETTINGS) },
  });
  let service;
  // Abort and drain calls before releasing the durable settings handle.
  ctx.effect(() => async () => { try { await service?.close(); } finally { await domain.close(); } });
  service = new SalahService({ domain, getCredentials: () => ctx.get?.('credentials') });
  await service.initialize();
  ctx.effect(() => ctx.provide('salah', service));
  ctx.effect(() => ctx.tools.register(createSalahTool(service)));
  ctx.effect(() => ctx.connection.fetch.register(createSalahRoute(ctx.connection, service)));
}
