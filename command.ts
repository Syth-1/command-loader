
import { Commands } from "./bot/commands"
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

        // @ts-ignore
        console.log(Test.__parent__)

    }

    @Commands.command()
    async reload(ctx : Context, file : string) {

        await ctx.moduleLoader.scheduleEvent(
            "reload", 
            "../command.ts", 
            (error) => {
                if (error.length > 0) {
                    console.log(error)
                } else {
                    console.log("loaded files!")
                }
            }
        )
    }


    async onDefaultCommand(ctx : Context) { 
        console.log("default command heck ye!")
    }
}