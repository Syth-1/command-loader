import { Listener } from "@/commands";
import type { Context } from "@/test-context";
import { Globals } from "@/globals";

export class Test { 
    async onLoad(globals : Globals) { 
        globals.load = true
    }

    async onUnload(globals : Globals) { 
        globals.unload = true
    }
}
