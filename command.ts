
import { Commands, Listener } from "./bot/commands"
import { type Context } from "./context"

@Commands.parent(["hello"])
class Test{

    @Commands.command({alias : ["hello", "world"]})
    test(ctx : Context)  { 
        console.log("hello world")
    }

    @Commands.command()
    test2(ctx : Context, number : number) {
        console.log("^^")
        console.log(number)
    }

    @Commands.command()
    async reload(ctx : Context, file : string) {
        console.log({file})

        await ctx.moduleLoader.scheduleEvent(
            "reload", 
            "@/command.ts", 
            (error) => {
                if (error.length > 0) {
                    console.log(error)
                } else {
                    console.log("loaded files!")
                }
            }
        )
    }

    @Listener.precheck
    async check() { 
        console.log("precheck!")
    }

    @Listener.command
    async command() { 
        console.log("on command!")
    }

    @Listener.error
    async globalError(err : Error, ctx? : Context) { 
        console.log("an error occured!", err.message)
    }

    async onDefaultCommand(ctx : Context) { 
        console.log("default command heck ye!")
    }

    async onLoad() { 
        console.log("I HAVE LOADED!")
    }

    async onUnload() { 
        console.log("I HAVE UNLOADED!")
    }

    async onError() { 
        console.log("this is a local error message")
    }

    async onCommand() { 
        console.log("ive invoked a command!!")
    } 
}