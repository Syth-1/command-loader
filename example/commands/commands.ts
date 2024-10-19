
import { Commands, Listener } from "@/bot/commands"
import { type Context } from "@/context"
import { value } from "../script"
import { StringTransformer } from "@/bot/transformer"

// dont forget to export a modules class, else it wont be loaded!
export class TestCommands{

    // use '@Commands.command' to register a command
    // arguments: 
    // string -- this will be the name of the command 
    // object:
    // {
    //    name? : string.
    //    alias? : string
    // }

    // if name is not provided, it will use the functions name!
    // all commands are checked if they already exists, so ensure to use a unique name!

    // first argument of the function will always be Context!
    @Commands.command({alias : ["hello", "world"]})
    test(ctx : Context)  {
        ctx.sendMessage("hello world")
        ctx.sendMessage(`${value}`)
    }

    @Commands.command()
    test2(ctx : Context, number : number) {
        console.log("^^")
        console.log(number)
    }

    // using custom input transformers,
    // after the first arg in `@Command.command`, pass a transformer
    // to change how processing the arguments work
    // can even use a custom transformer for a custom data type
    // pass null or undefined to keep default behaviour for that argument
    @Commands.command('copy', new StringTransformer(true))
    copy(ctx : Context, input : string) { 
        ctx.sendMessage(input)
    }

    @Commands.command('info', null, new StringTransformer(true))
    info(ctx : Context, age : number, fullName : string) {
        ctx.sendMessage(`hello ${fullName}, you are ${age} old`)
    }

    // listeners are global! they are run when ever this event is fired from anywhere in the bot

    // precheck is called when we know an input starts with the prefix,
    // but before any other processing happens
    // can be useful for rate limiting by returning false and sending a message to the user
    @Listener.precheck
    async check(ctx : Context) { 
        console.log("precheck!")
    }

    // a valid command has been found, but before a command is executed
    // this is before the args for the command are verified**
    @Listener.command
    async command() { 
        console.log("on command!")
    }

    // global error event!
    // chance ctx can be unknown, be wary to check and return out if you rely on ctx to handle the error!
    @Listener.error
    async globalError(err : Error, ctx? : Context) { 
        console.log("an error occured!", err.message)
    }

    // local functions are class specific, this will only run for this specific class
    // when the module loads
    async onLoad(globals : Globals) { 
        console.log("I HAVE LOADED!")
    }

    // when the module unloads
    async onUnload(globals : Globals) { 
        console.log("I HAVE UNLOADED!")
    }

    // if an error happens within this class
    async onError(error : Error, ctx? : Context) { 
        console.log("this is a local error message")
    }

    // when a command is called that belongs in this class
    async onCommand(ctx : Context) { 
        console.log("ive invoked a command!")
    } 
}

@Commands.parent("prefix")
export class AnotherClass { 

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

    async onCommandNotFound(ctx : Context) { 
        console.log("couldnt find your command: " + ctx.content)
    }
}

// a class decorator is used to register a parent command
// it takes in either a single string, or an array,
// those are used as the prefix to call the command

// this is a subcommand, 
// this can be invoked with '/1 2 3 4 5 foo'
@Commands.parent(["1", "2", "3", "4",  "5"])
export class AndAnotherClass {

    @Commands.command({name : "foo"})
    test(ctx : Context)  { 
        console.log("bar")
    }
}

@Commands.parent(["1", "2", "3"])
export class NestedCommands { 

    @Commands.command({name : "foo"})
    test(ctx : Context)  { 
        console.log("bar")
    }
}
