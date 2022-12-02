import { writeFile } from 'node:fs/promises';
import { SafeOpts } from '../commands';
import type { Logger } from '../util/logger';

import compile from './compile';

const compileHandler = async (options: SafeOpts, logger: Logger) => {
  const code = await compile(options, logger);
  if (options.outputStdout) {
    logger.success('Compiled code:');
    logger.success('\n' + code);
  } else {
    await writeFile(options.outputPath, code);
    logger.success(`Compiled to ${options.outputPath}`);
  }
};

export default compileHandler;