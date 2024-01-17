import test from 'ava';
import path from 'node:path';

import initWorkers from '../../src/api/call-worker';
import { EngineAPI } from '../../src/types';
import validateWorker from '../../src/api/validate-worker';

let api = {} as EngineAPI;

const workerPath = path.resolve('dist/test/worker-functions.js');

test.beforeEach(() => {
  api = {} as EngineAPI;
});

test('validate should not throw if the worker path is valid', async (t) => {
  initWorkers(api, workerPath);
  await t.notThrowsAsync(() => validateWorker(api));
});

test('validate should throw if the worker path is invalid', async (t) => {
  initWorkers(api, 'a/b/c.js', { silent: true });
  await t.throwsAsync(() => validateWorker(api), {
    message: 'Invalid worker path',
  });
});

test('validate should throw if the worker does not respond to a handshake', async (t) => {
  initWorkers(api, path.resolve('src/test/bad-worker.js'));
  await t.throwsAsync(() => validateWorker(api), {
    message: 'Invalid worker path',
  });
});
