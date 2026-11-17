import {getDatabase} from '@netlify/database';
import worker from '../../dist/server/index.js';
import {createPgD1} from '../../server/pg-d1.mjs';

let DB;
export default async (req, context) => {
  DB ??= createPgD1(getDatabase().pool);
  return worker.fetch(req, {DB, ADMIN_KEY: Netlify.env.get('ADMIN_KEY')});
};
export const config = {path: '/*'};
