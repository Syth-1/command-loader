import { sleep } from 'bun'
import { ProcessCommands } from './bot/process_command'
import { Context, getModuleFiles } from './context'

async function main() {
    const commandProcessor = new ProcessCommands<typeof Context>("/", Context)

    console.log(".-.")

    await commandProcessor.moduleLoader.scheduleEvent(
        "load", 
        await getModuleFiles(), 
        error => {
            if (error.length > 0)
                console.log(error)
            else
                console.log("loaded files!")
        }
    )

    for await (const line of console) {
        commandProcessor.processCommands(line)
    }
}

main()