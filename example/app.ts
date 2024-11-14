import { BaseGlobals, CommandProcessor } from '@/bot/process_command'
import { Context, getModuleFiles, moduleFolder } from './context'

async function main() {
    const globals = new BaseGlobals(
        "/", // the prefix to call a command!

        // add any other variables you would like to have access across the entire bot,
        // this is passed to all context and event calls
        // example, DB instance would be assigned here.
        // subclass BaseGlobals to add your own vars
    )

    const commandProcessor = new CommandProcessor(
        Context, // pass in Context class here, this is the class that will be instanced for every command
        globals 
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
        commandProcessor.processCommands(line)
        // can pass in additional arguments which will be used to instance the Context class!
        // example use-case: name of user, channel etc
    }
}

main()