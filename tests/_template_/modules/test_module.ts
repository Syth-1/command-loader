import { Commands } from "@/commands";
import type { Context } from "@/test-context";

export class Test { 
    @Commands.command()
    async test(ctx : Context) {
        ctx.future.resolve("hello world")
    }
}
