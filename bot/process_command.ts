import { 
    EventNames, 
    ModuleLoader, 
    StringParser, 
    getFunctionFromCls, 
    type EventRequiresCTX, 
    type EventRequiresGlobal 
} from "./internals";
import { getFuncName } from "./utils/func-name";

export class CommandProcessor<
    T extends new (...args : any) => BaseContext, 
    U extends BaseGlobals
>
{ 
    readonly moduleLoader : ModuleLoader
    readonly globals : U
    private contextCls : T
    

    constructor(contextCls : T, globals : U | (new () => U)) { 
        if (!(globals instanceof BaseGlobals)) { 
            globals = new globals()
        }

        this.moduleLoader = new ModuleLoader(globals)
        this.contextCls = contextCls
        
        globals.commandProcessor = this
        globals.moduleLoader = this.moduleLoader
        
        this.globals = globals
    }

    async processCommands(prefix : string | RegExp | Array<string | RegExp>, msg : string, ...args : ConstructorParameters<T>) {
        msg = msg.trim();
        
        const context = new this.contextCls(...args)
        
        context.prefix = typeof prefix === 'string' || prefix instanceof RegExp ? [ prefix ] : prefix
        context.msg = msg;
        context.globals = this.globals
        
        const onMsg = await this.callEvent(EventNames.onMessage, context)

        if (typeof onMsg === 'boolean') {
            if (!onMsg) return
        } else if (typeof onMsg === 'string') {
            msg = onMsg
        } else {
            msg = context.msg
        }

        let currentPrefix : string | undefined = undefined

        for (const checkPrefix of context.prefix) {
            if (typeof checkPrefix === 'string') {
                if (msg.startsWith(checkPrefix)) {
                    currentPrefix = checkPrefix
                    break
                }
                continue
            } 
            // else

            const match = msg.match(checkPrefix)

            if (!match) continue
            currentPrefix = match[0]
            break
        }

        if (currentPrefix === undefined) return

        context.currentPrefix = currentPrefix
        context.msg = msg.substring(context.currentPrefix.length)

        const preCheck = await this.callEvent(EventNames.preCheck, context)

        if (typeof preCheck === 'boolean') {
            if (!preCheck) return
        } else if (typeof preCheck === 'string') {
            msg = preCheck
        } else {
            msg = context.msg
        }

        let commandParser = new StringParser(msg, false)

        const command = commandParser.getArg().toLowerCase()

        if (command.length === 0) return;

        let funcOrParent = this.moduleLoader.commands[command]
        
        if (funcOrParent === undefined) return

        let func = await this.tryGetSubCommand(funcOrParent, commandParser, context, command)
        
        if (func === undefined) return; 

        context.commandObj = func
        context.content = commandParser.getRestOfString()

        const onCommandCheck = await this.callEvent(EventNames.onCommand, context)

        if (typeof onCommandCheck === 'boolean') {
            if (!onCommandCheck) return
        } else if (typeof onCommandCheck === 'string') {
            context.content = onCommandCheck
        }

        const onLocalCommand = getFunctionFromCls(func.cls, EventNames.onCommand)

        if (onLocalCommand != undefined) {
            const onLocalCommndCheck = await this.tryExecuteCommand(func.cls, onLocalCommand, context)

            if (typeof onLocalCommndCheck === 'boolean') {
                if (!onLocalCommndCheck) return
            } else if (typeof onLocalCommndCheck === 'string') {
                context.content = onCommandCheck
            }
        }

        await this.tryExecuteCommand(func.cls, func.command, context, context.content)
    }

    
    private async tryGetSubCommand(commandObj :  Commands | NestedCommandObj, commandParser : StringParser, ctx : Context, commandName : string) {
        const parent = []
        let lastCommandName = commandName
        while (true) {
            if (typeof commandObj === 'object' && !commandObj.hasOwnProperty("cls")) {

                if (commandObj.hasOwnProperty("check")) {
                    const typedCommandObj = commandObj as NestedCommandObj

                    for (const checkFunc of Object.values(typedCommandObj.check))
                        if ((await this.tryExecuteCommand(checkFunc.cls, checkFunc.command, ctx)) === false) return
                }

                let nestedCommandObj = commandObj as NestedCommandObj

                parent.push(lastCommandName)
                lastCommandName = commandParser.getArg().toLowerCase()
                
                if (lastCommandName.length === 0) {
                    if (nestedCommandObj.onDefaultCommand != undefined) {
                        return nestedCommandObj.onDefaultCommand as Commands // default command is just command function without any additional params.
                    }
                    return
                }
                
                // handle subcommand not found!
                if (nestedCommandObj.commands[lastCommandName] === undefined) {
                    if (nestedCommandObj.onCommandNotFound != undefined) {
                        const onCommandNotFound = nestedCommandObj.onCommandNotFound
                        
                        ctx.commandObj = onCommandNotFound as Commands

                        this.tryExecuteCommand(onCommandNotFound.cls, onCommandNotFound.command, ctx)
                        return
                    }
                }
                
                commandObj = nestedCommandObj.commands[lastCommandName]
            } else{
                ctx.parent = parent 
                ctx.commandName = lastCommandName
                return commandObj as Commands
            }
        }
    }
    
    async tryExecuteFunction(cls : Class, func : Function, globals : Globals, ...args : any) { 
        try {
            return await func.bind(cls)(...args, globals, ...args)
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(e as any)
            }

            const onErrorFunc = getFunctionFromCls(cls, EventNames.error)

            if (onErrorFunc != undefined) {
                // try execute local on error function 
                try { 
                    const errorHandled = await onErrorFunc(e)
                    if (typeof errorHandled !== 'boolean' || errorHandled) return false
                } catch (e) {
                    if (!(e instanceof Error)) {
                        e = new Error(e as any)
                    }

                    this.callEvent(EventNames.error, e as Error, {
                        ctx : undefined,
                        globals : globals
                    })
                } 
            }

            this.callEvent(EventNames.error, e as Error, {
                ctx : undefined, 
                globals : globals
            })

            return false
        }
    }

    async tryExecuteCommand(cls : Class, func : Function, ctx : BaseContext, ...args : any) { 
        try {
            return await func.bind(cls)(ctx, ...args)
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(e as any)
            }

            const onErrorFunc = getFunctionFromCls(cls, EventNames.error)

            if (onErrorFunc != undefined) {
                // try execute local on error function 
                try { 
                    const errorHandled = await onErrorFunc(e, ctx)
                    if (typeof errorHandled !== 'boolean' || errorHandled) return false
                } catch (e) {
                    if (!(e instanceof Error)) {
                        e = new Error(e as any)
                    }

                    this.callEvent(EventNames.error, e as Error, {
                        ctx : ctx, 
                        globals : ctx.globals
                    })
                } 
            }

            this.callEvent(EventNames.error, e as Error, {
                ctx : ctx, 
                globals : ctx.globals
            })

            return false
        }
    }


    async callEvent<TEventName extends typeof EventNames[keyof typeof EventNames] | string & {}>(event : TEventName, ...args : EventParams<TEventName> ) { 
        for (const [file, moduleEvents] of Object.entries(this.moduleLoader.eventListener)) {
            const funcArr = moduleEvents[event]
            if (funcArr === undefined) continue
    
            for (const func of funcArr) {
                try {
                    const value = await func(...args)
    
                    if (value !== undefined) return value // assume if a value is returned, we early return!
                } catch (e) { 
                    if (event === EventNames.error) continue
    
                    // check if a custom error message is thrown, else provide a diagnostic error
                    let error = (e instanceof Error && Object.getPrototypeOf(e) !== Error ? 
                        e : 
                        Error(`calling function: '${getFuncName(func)}' for event '${event}' failed! args passed: ${args}`)
                    )

                    await this.callEvent(
                        EventNames.error, 
                        error,
                        {
                            ctx : undefined,
                            globals : this.globals
                        }
                    )

                    return false // if an error occurs, we hault execution flow
                }
            }
        }
    }
}


type EventParams<T extends string> = (
    T extends typeof EventNames.error ? [Error, errorObject, ...any[]] :
    T extends EventRequiresCTX ? [Context, ...any[]] :
    T extends EventRequiresGlobal ? [Globals, ...any[]] :
    any[]
)

export class BaseContext implements Context {
    msg! : string
    content! : string
    parent! : Array<string>;
    commandName! : string
    globals! : BaseGlobals // override the types!
    commandObj! : Commands
    prefix! : Array<string | RegExp>
    currentPrefix!: string;
}

export class BaseGlobals implements Globals {
    moduleLoader! : ModuleLoader
    commandProcessor! : CommandProcessor<any, any>
}