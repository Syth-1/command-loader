import { EventNames, ModuleLoader, StringParser, getFunctionFromCls } from "./internals";

type typedCls<T> = new (...args : any) => T

export class CommandProcessor<
    T extends new (...args : any) => BaseContext, 
    U extends BaseGlobals
>
{ 
    readonly moduleLoader : ModuleLoader
    readonly globals : U
    private contextCls : T
    

    constructor(contextCls : T, globals : U) { 
        this.moduleLoader = new ModuleLoader(globals)
        this.contextCls = contextCls
        
        globals.commandProcessor = this
        globals.moduleLoader = this.moduleLoader
        
        this.globals = globals
    }

    async processCommands(msg : string, ...args : ConstructorParameters<T>) {
        msg = msg.trim();
        
        const context = new this.contextCls(...args)
        
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

        if (!msg.startsWith(this.globals.prefix)) return;

        const preCheck = await this.callEvent(EventNames.preCheck, context, msg)

        if (typeof preCheck === 'boolean') {
            if (!preCheck) return
        } else if (typeof preCheck === 'string') {
            msg = preCheck
        } else {
            msg = context.msg
        }
        
        msg = msg.substring(this.globals.prefix.length)

        let commandParser = new StringParser(msg, false)

        const command = commandParser.getArg().toLowerCase()

        if (command.length === 0) return;

        let funcOrParent = this.moduleLoader.commands[command]
        
        if (funcOrParent === undefined) return

        let func = await this.tryGetSubCommand(funcOrParent, commandParser, context, command)
        
        if (func === undefined) return; 

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

        this.tryExecuteCommand(func.cls, func.command, context, context.content)
    }

    
    private async tryGetSubCommand(commandObj :  Commands | NestedCommandObj, commandParser : StringParser, ctx : Context, commandName : string) {
        let lastCommandName = commandName
        while (true) {
            if (typeof commandObj === 'object' && !commandObj.hasOwnProperty("cls")) {

                if (commandObj.hasOwnProperty("check")) {
                    const typedCommandObj = commandObj as NestedCommandObj

                    for (const checkFunc of Object.values(typedCommandObj.check))
                        if ((await this.tryExecuteCommand(checkFunc.cls, checkFunc.command, ctx)) === false) return
                }

                let nestedCommandObj = commandObj as NestedCommandObj
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
                        
                        this.tryExecuteCommand(onCommandNotFound.cls, onCommandNotFound.command, ctx)
                        return
                    }
                }
                
                commandObj = nestedCommandObj.commands[lastCommandName]
            } else{
                ctx.commandName = lastCommandName
                return commandObj as Commands
            }
        }
    }
    
    async tryExecuteCommand(cls : Class, func : Function, ctx : Context, ...args : any) { 
        try {
            return await func(ctx, ...args)
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

                    this.callEvent(EventNames.error, e, ctx)
                } 
            }

            this.callEvent(EventNames.error, e, ctx)

            return false
        }
    }

    async callEvent( event : string, ...args : any ) { 
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
                        Error(`calling function: '${func.name}' for event '${event}' failed! args passed: ${args}`)
                    )

                    await this.callEvent(
                        EventNames.error, 
                        error
                    )

                    return false // if an error occurs, we hault execution flow
                }
            }
        }
    }
}


export class BaseContext implements Context {

    msg! : string
    content! : string
    commandName! : string
    methodName! : string
    class!  : Class
    globals! : BaseGlobals // override the types!
    callEvent! : (event : string, ...args : any) => Promise<any>
}

export class BaseGlobals implements Globals {
    moduleLoader! : ModuleLoader
    commandProcessor! : CommandProcessor<any, any>

    constructor(
        public prefix : string = '',
    ) { }
}