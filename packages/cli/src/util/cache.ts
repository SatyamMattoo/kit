import { ExecutionPlan } from '@openfn/lexicon';
import fs from 'node:fs/promises';
import path from 'node:path'

import type { Opts } from '../options';

export const getCachePath = async (plan: ExecutionPlan, options: Pick<Opts, 'baseDir' | 'cache'>, stepId: string) => {
  const { baseDir } = options;

  const { name } = plan.workflow;

  const basePath = `${baseDir}/.cli-cache/${name}`;
  
  if (stepId) {
    // const step = plan.workflow.steps.find(({ id }) => id === stepId);

    // TODO do we really want to use step name? it's not likely to be easily typeable
    // Then again, for Lightning steps, the id isn't friendly either
    // const fileName = step?.name ?? stepId;
    const fileName = stepId;
    return path.resolve(`${basePath}/${fileName.replace(/ /, '-')}.json`);
  }
  return path.resolve(basePath);

}

// TODO this needs to move out into a util or something
export const saveToCache = async (plan: ExecutionPlan, stepId: string, output: any, options: Pick<Opts, 'baseDir' | 'cache'>) => {
  if (options.cache) {
    const cachePath = await getCachePath(plan, options, stepId);
    await fs.mkdir(path.dirname(cachePath), { recursive: true })

    // TODO use the CLI logger
    console.log(`Writing ${stepId} output to ${cachePath}`)
    await fs.writeFile(cachePath, JSON.stringify(output))
  }
}