import EventEmitter from 'node:events';
import { Socket as PhxSocket } from 'phoenix';
import { WebSocket } from 'ws';

import generateWorkerToken from '../util/worker-token';

import type { Logger } from '@openfn/logger';
import type { Channel } from '../types';

const connectToWorkerQueue = (
  endpoint: string,
  serverId: string,
  secret: string,
  logger: Logger,
  SocketConstructor = PhxSocket
) => {
  const events = new EventEmitter();

  generateWorkerToken(secret, serverId).then((token) => {
    // @ts-ignore ts doesn't like the constructor here at all
    const socket = new SocketConstructor(endpoint, {
      params: { token },
      transport: WebSocket,
    });

    let didOpen = false;

    socket.onOpen(() => {
      didOpen = true;

      const channel = socket.channel('worker:queue') as Channel;

      channel
        .join()
        .receive('ok', () => {
          logger.debug('Connected to worker queue socket');
          events.emit('connect', { socket, channel });
        })
        .receive('error', (e: any) => {
          logger.error('ERROR', e);
        })
        .receive('timeout', (e: any) => {
          logger.error('TIMEOUT', e);
        });
    });

    // On close, the socket will try and reconnect itself
    // Forever, so far as I can tell
    socket.onClose((_e: any) => {
      logger.debug('queue socket closed');
      events.emit('disconnect');
    });

    // if we fail to connect, the socket will try to reconnect
    /// forever (?) with backoff
    socket.onError((e: any) => {
      // If we failed to connect, reject the promise
      // The server will try and reconnect itself.s
      if (!didOpen) {
        events.emit('error', e.message);
        didOpen = false;
      }
      // Note that if we DID manage to connect once, the socket should re-negotiate
      // wihout us having to do anything
    });

    socket.connect();
  });

  return events;
};

export default connectToWorkerQueue;
