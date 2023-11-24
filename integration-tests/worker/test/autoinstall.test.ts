// stress test for autoinstall
// this could evolve  into stress testing, benchmarking or artillery generally?
// Also I may skip this in CI after the issue is fixed

import test from 'ava';
import path from 'node:path';

import { initLightning, initWorker } from '../src/init';
import { createAttempt, createJob } from '../src/factories';

const generate = (adaptor, version) => {
  const specifier = `@openfn/language-${adaptor}@${version}`;
  const job = createJob({
    body: `fn(() => ({ data: "${adaptor}" }))`,
    adaptor: specifier,
  });
  return createAttempt([], [job], []);
};

let lightning;
let worker;

const run = async (attempt) => {
  return new Promise<any>(async (done, reject) => {
    lightning.on('attempt:complete', (evt) => {
      if (attempt.id === evt.attemptId) {
        done(lightning.getResult(attempt.id));
      }
    });

    lightning.enqueueAttempt(attempt);
  });
};

test.before(async () => {
  const lightningPort = 4321;

  lightning = initLightning(lightningPort);

  ({ worker } = await initWorker(lightningPort, {
    repoDir: path.resolve('tmp/repo/autoinstall'),
  }));
});

test.after(async () => {
  lightning.destroy();
  await worker.destroy();
});

test('autoinstall three things at once', async (t) => {
  const a = generate('common', '1.11.1');
  const b = generate('http', '5.0.0');
  const c = generate('googlesheets', '2.2.2');

  const [ra, rb, rc] = await Promise.all([run(a), run(b), run(c)]);

  t.is(ra.data, 'common');
  t.is(rb.data, 'http');
  t.is(rc.data, 'googlesheets');
});