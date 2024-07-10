import { ProcessCommands } from '@/bot/process_command'
import { Context, getModuleFiles, moduleFolder } from './context'

async function main() {
    const settings : BotSettings = {
        botName : "Bot",
        moduleFolder : moduleFolder, 
        prefix : "/" 
    }

    const commandProcessor = new ProcessCommands<typeof Context>(
        settings, 
        Context
    )

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