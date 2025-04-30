import { Commands, type Module } from "@/commands";
import type { Context } from "@/context";

// will stop on check

export class Test implements Module { 

    async onCommand(ctx: Context): Promise<string | boolean | any> {
        ctx.testVals.runs++
        return ctx.content !== 'foo bar'
    }

    @Commands.command()
    async command(ctx : Context, msg : string) {
        ctx.future.resolve(true)
    }
}
