import { Commands, type Module } from "@/commands";
import type { Context } from "@/context";

// will stop on check

export class Test implements Module { 

    async onExecute(ctx: Context): Promise<string | boolean | any> {
        ctx.testVals.runs++
        console.log("execute check ran!")
        return ctx.content !== 'foo bar'
    }
    
    @Commands.command()
    async execute(ctx : Context, msg : string) {
        console.log("wha")

        ctx.future.resolve(true)
    }
}
