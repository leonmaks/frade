import type { Step } from './runner'
import { entities } from './entities'
import { sessions } from './sessions'
import { commands } from './commands'
import { infrastructure } from './infrastructure'
export const steps: Step[] = [...entities, ...sessions, ...commands, ...infrastructure]
export async function disposeWorld(world: any) {
  world.gate?.resolve()
  for (const session of world.sessions ?? []) await session.close()
}
