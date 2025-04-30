import { Commands } from "@/commands";
import type { Context } from "@/test-context";

export class Test { 
    @Commands.command()
    async test(ctx : Context) {
        console.log("text test has run")

        ctx.future.resolve("hello world")
    }
}
