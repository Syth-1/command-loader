import { Commands, Listener } from "@/commands";
import type { Context } from "@/context";

// all checks should go thru

export class Test { 

    @Listener.message
    async messageListener(ctx: Context) { 
        ctx.testVals.runs++

        console.log(ctx.msg)

        return ctx.msg !== 'listener foo'
    }

    @Listener.command
    async commandListener(ctx: Context): Promise<string | boolean | any> {
        ctx.testVals.runs++
        return ctx.content !== 'bar'
    }
    
    @Listener.execute
    async executeListener(ctx: Context): Promise<string | boolean | any> {
        ctx.testVals.runs++
        return ctx.content !== 'foobar'
    }

    @Commands.command()
    async listener(ctx : Context, msg : string) {
        ctx.testVals.runs++
        ctx.future.resolve(true)
    }
}
