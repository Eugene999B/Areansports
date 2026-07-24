import { readConfig } from './config.js';
import { buildServer } from './server.js';

const config = readConfig();
const app = await buildServer({ config });

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
};

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error: unknown) {
  app.log.fatal({ error }, 'API failed to start');
  process.exitCode = 1;
}
