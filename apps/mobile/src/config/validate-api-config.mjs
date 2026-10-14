import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveApiUrl, resolveAppEnvironment } = require('./api-environment.cjs');

const environment = resolveAppEnvironment(process.env);
resolveApiUrl(process.env);

process.stdout.write(`Configuração de API válida para o perfil ${environment}.\n`);
