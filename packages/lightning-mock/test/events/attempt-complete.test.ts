import test from 'ava';
import { join, setup, createAttempt } from '../util';
import { ATTEMPT_COMPLETE } from '../../src/events';

let server;
let client;

const port = 5501;

test.before(async () => ({ server, client } = await setup(port)));

test.serial('acknowledge valid message', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: 'success',
      error_type: null,
      error_message: null,
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('ok', () => {
      t.pass('event acknowledged');
      done();
    });
  });
});

test.serial('set server state to complete', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: 'success',
      error_type: null,
      error_message: null,
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('ok', () => {
      t.is(server.state.pending[attempt.id].status, 'complete');
      done();
    });
  });
});

test.serial('error if no reason', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: null,
      error_type: null,
      error_message: null,
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('error', () => {
      t.pass('event rejected');
      done();
    });
  });
});

test.serial('error reason:success and an error', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: 'success',
      error_type: 'OOM',
      error_message: 'out of memory',
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('error', () => {
      t.pass('event rejected');
      done();
    });
  });
});

test.serial('error if surplus keys', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: 'success',
      error_type: null,
      error_message: null,
      err: true,
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('error', () => {
      t.pass('event rejected');
      done();
    });
  });
});

test.serial('error if unknown reason', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: 'swish',
      error_type: null,
      error_message: null,
      err: true,
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('error', () => {
      t.pass('event rejected');
      done();
    });
  });
});

test.serial('error if unknown reason 2', async (t) => {
  return new Promise(async (done) => {
    const attempt = createAttempt();

    server.startAttempt(attempt.id);

    const event = {
      reason: 'crassh',
      error_type: null,
      error_message: null,
      err: true,
    };

    const channel = await join(client, attempt.id);

    channel.push(ATTEMPT_COMPLETE, event).receive('error', () => {
      t.pass('event rejected');
      done();
    });
  });
});