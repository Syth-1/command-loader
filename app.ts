import 'reflect-metadata'
import { ProcessCommands } from './bot/process_command'

import { Context } from './context'

const files = ["../command.ts"]

async function main() {
    const commandProcessor = new ProcessCommands<typeof Context>("/", Context)

    await commandProcessor.moduleLoader.scheduleEvent(
        "load", 
        files, 
        error => {
            if (error.length > 0)
                console.log(error)
            else
                console.log("loaded files!")
        }
    )

    for await (const line of console) {
        commandProcessor.processCommands(line, commandProcessor.moduleLoader)
    }
}

main()