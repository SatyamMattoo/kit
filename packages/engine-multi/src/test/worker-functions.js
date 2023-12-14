import path from 'node:path';

import { increment } from './counter.js';

const publish = (evt) =>
  new Promise((resolve) => {
    process.send(evt, undefined, {}, () => {
      resolve();
    });
  });

const threadId = process.pid;

const run = (task, args) => {
  tasks[task](...args)
    .then((result) => {
      publish({
        type: 'engine:resolve_task',
        result,
      });
    })
    .catch((e) => {
      publish({
        type: 'engine:reject_task',
        error: {
          severity: e.severity || 'crash',
          message: e.message,
          type: e.type || e.name,
        },
      });
    });
};

process.on('message', async (evt) => {
  if (evt.type === 'engine:run_task') {
    const args = evt.args || [];
    run(evt.task, args);
  }
});

const tasks = {
  handshake: async () => true,
  test: async (result = 42) => {
    await publish({
      type: 'test-message',
      result,
    });

    return result;
  },
  wait: (duration = 500) =>
    new Promise((resolve) => {
      setTimeout(() => resolve(1), duration);
    }),
  readEnv: async (key) => {
    if (key) {
      return process.env[key];
    }
    return process.env;
  },
  threadId: async () => threadId,
  // very very simple intepretation of a run function
  // Most tests should use the mock-worker instead
  run: async (plan, _adaptorPaths) => {
    const workflowId = plan.id;
    publish({
      type: 'worker:workflow-start',
      workflowId,
      threadId,
    });
    try {
      const [job] = plan.jobs;
      const result = eval(job.expression);
      publish({
        type: 'worker:workflow-complete',
        workflowId,
        state: result,
        threadId,
      });
    } catch (err) {
      // console.error(err);
      // // @ts-ignore TODO sort out error typing
      // publish({
      //   type: 'worker:workflow-error',
      //   workflowId,
      //   message: err.message,
      //   threadId,
      // });
      // actually, just throw the error back out
      throw err;
    }
  },

  timeout: async () => {
    while (true) {}
  },

  throw: async () => {
    throw new Error('test_error');
  },

  // Experiments with freezing the global scope
  // We may do this in the actual worker
  freeze: async () => {
    // This is not a deep freeze, so eg global.Error is not frozen
    // Also some things like Uint8Array are not freezable, so these remain ways to scribble
    Object.freeze(global);
    Object.freeze(globalThis);

    // Note that this is undefined, so this doesn't matter
    Object.freeze(this);
  },

  setGlobalX: async (newValue = 42) => {
    global.x = newValue;
  },

  getGlobalX: async () => global.x,

  writeToGlobalError: async (obj) => {
    Object.assign(Error, obj);
    console.log(Error.y);
  },

  getFromGlobalError: async (key) => {
    return Error[key];
  },

  // Tests of module state across executions
  // Ie, does a module get re-initialised between runs? (No.)
  incrementStatic: async () => increment(),
  incrementDynamic: async () => {
    const { increment } = await import(path.resolve('src/test/counter.js'));
    return increment();
  },

  // Creating a big enough array with  `Array(1e9).fill('mario')`
  // is enghuh to OOM the _process_, taking the whole engine out
  // This function should blow the thread's memory without
  // killing the parent process
  blowMemory: async () => {
    let data = [];
    while (true) {
      data.push(Array(1e6).fill('mario'));
    }

    // This is too extreme and will kill the process
    // Array(1e9).fill('mario')
  },

  // Some useful code
  // const stats = v8.getHeapStatistics();
  // console.log(
  //   `node heap limit = ${
  //     stats.heap_size_limit / 1024 / 1024
  //   } Mb\n heap used = ${hprocess.memoryUsage().heapUsed / 1024 / 1024}mb`
  // );
};
