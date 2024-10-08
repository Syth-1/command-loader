
import { Commands, Listener } from "@/bot/commands"
import { type Context } from "@/context"

export class TestCommands{
    @Commands.command({alias : ["hello", "world"]})
    test(ctx : Context)  { 
        console.log("hello world")
    }

    @Commands.command()
    test2(ctx : Context, number : number) {
        console.log("^^")
        console.log(number)
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

@Commands.parent("prefix")
class AnotherClass { 

    @Commands.command({name : "hi"})
    test(ctx : Context)  { 
        console.log("hello world")
    }

    async onDefaultCommand(ctx : Context) { 
        console.log("default command heck ye!")
    }

    async onCommand() { 
        console.log("on command!!")
        return false
    }
}

@Commands.parent(["1", "2", "3", "4",  "5"])
class AndAnotherClass {

    @Commands.command({name : "foo"})
    test(ctx : Context)  { 
        console.log("bar")
    }
}

@Commands.parent(["1", "2", "3"])
class NestedCommands { 

    @Commands.command({name : "foo"})
    test(ctx : Context)  { 
        console.log("bar")
    }
}
