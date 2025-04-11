import { BaseGlobals, CommandProcessor } from '@/bot/process_command'
import { Context, getModuleFiles } from './context'

const prefix = '/'

async function main() {

    const commandProcessor = new CommandProcessor(
        Context, // pass in Context class here, this is the class that will be instanced for every command
        new BaseGlobals() 
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

    // on message call -- process command:
    for await (const line of console) {
        commandProcessor.processCommands(prefix, line)
        // can pass in additional arguments which will be used to instance the Context class!
        // example use-case: name of user, channel etc
    }
}

main()