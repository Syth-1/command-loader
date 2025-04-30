import { Commands, type Module } from "@/commands";
import type { BaseContext } from "@/internals";
import type { Context } from "@/test-context";

// all checks should go thru

export class Test implements Module { 

    async onCommand(ctx: BaseContext): Promise<string | boolean | any> {
        return ctx.content !== 'foo bar'
    }
    
    async onExecute(ctx: BaseContext): Promise<string | boolean | any> {
        return ctx.content !== 'foo bar'
    }

    @Commands.command()
    async all(ctx : Context, msg : string) {
        ctx.future.resolve(true)
    }
}
