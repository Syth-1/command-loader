import { Commands } from "@/commands";
import type { Context } from "@/test-context";
import type Future from "@/utils/future";

export class Test { 

    // ensure this bindings works! 
    resolve(future : InstanceType<typeof Future>) { 
        future.resolve(true)
    }

    @Commands.command()
    async test(ctx : Context) {
        this.resolve(ctx.future)
    }
}
