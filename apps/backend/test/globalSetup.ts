import * as path from 'path';
import * as dotenv from 'dotenv';

export default async function globalSetup() {
  // Load .env.test para testes de integração
  dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
}
