import * as path from 'path';
import * as dotenv from 'dotenv';
import { assertEphemeralDatabase } from './ephemeral-db-guard';

export default async function globalSetup() {
  // Load .env.test para testes de integração
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });

  // Fail fast before any suite runs if the DB is not a disposable one.
  assertEphemeralDatabase();
}
