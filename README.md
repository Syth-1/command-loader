# command-loader

Command-Loader is an agnostic bot library, designed to make creating text bots easier, be it for games or other services. Command-Loader will automatically handle the number of arguments required by your commands and convert the input to the necessary types.


## Installation

> [!NOTE]
> For ideal installation in your project, it is recommended to use submodules.

- Installing a new submodule: 
```bash
    git submodule add <url>
    git submodule update --init

    # updating existing submodules to newest commit:
    git submodule update --remote --merge
```
- Installing dependencies & running the example:
```
    cd command-loader
    bun install
    bun run example/app.ts
```
## Features

- Auto args handling
- Reloading
- Subcommands


## Usage/Examples

ensure the following is added to `tsconfig.json`:
```json
    "experimentalDecorators":  true,
    "emitDecoratorMetadata": true,
```

main script:
```typescript
import { CommandProcessor, BaseGlobals, BaseContext } from './command-loader/bot/process_command'
import { readdir } from 'node:fs/promises'
import path from 'path'

const moduleFolder = "modules"

async function getModuleFiles(folder : string) {
    return (await readdir(`./${folder}`))
        .map(file => import.meta.resolve(`./${path.join(folder, file)}`)
    )
}

async function main() {
    const globals = new BaseGlobals(
        "/", // prefix
    )

    const commandProcessor = new CommandProcessor(
        BaseContext,
        globals
    )

    await commandProcessor.moduleLoader.scheduleEvent(
        "load", 
        await getModuleFiles(moduleFolder), 
        error => {
            if (error.length > 0)
                console.log(error)
            else
                console.log("loaded files!")
        }
    )

    for await (const line of console)
        commandProcessor.processCommands(line)

}

main()
```

within `modules/script_module.ts`:
```typescript
import { Commands, Listener } from "../command-loader/bot/commands"
import { type BaseContext as Context } from '../command-loader/bot/process_command'

export class Module {

    @Commands.command()
    async hello(ctx : Context) {
        console.log("hello world")
    }

    @Commands.command()
    async add(ctx : Context, num1 : number, num2 : number) { 
        console.log(num1 + num2)
    }

    @Listener.error
    async globalError(err : Error, ctx? : Context) { 
        console.log("an error occured!", err.message)
    }
}
```
