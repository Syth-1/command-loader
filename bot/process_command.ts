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
        
        globals.callEvent = this.callEvent
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

        const command = commandParser.getArg().toLocaleLowerCase()

        if (command.length === 0) return;

        let funcOrParent = this.moduleLoader.commands[command]
        
        if (funcOrParent === undefined) return
        
        let func = this.tryGetSubCommand(funcOrParent, commandParser, context)
        
        if (func === undefined) return; 

        context.content = commandParser.getRestOfString()

        const onCommandCheck = await this.callEvent(EventNames.onCommand, context)

        if (typeof onCommandCheck === 'boolean') {
            if (!onCommandCheck) return
        } else if (typeof onCommandCheck === 'string') {
            context.content = onCommandCheck
        }

        const onLocalCommand = getFunctionFromCls(func.cls, "onCommand")

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

    
    private tryGetSubCommand(commandObj :  Commands | NestedCommandObj, commandParser : StringParser, ctx : Context) {
        
        while (true) {
            if (typeof commandObj === 'object' && !commandObj.hasOwnProperty("cls")) {
                
                let nestedCommandObj = commandObj as NestedCommandObj
                const subcommand = commandParser.getArg().toLocaleLowerCase()
                
                if (subcommand.length === 0) {
                    if (nestedCommandObj.onDefaultCommand != undefined) {
                        return nestedCommandObj.onDefaultCommand as Commands // default command is just command function without any additional params.
                    }
                    return
                }
                
                // handle subcommand not found!
                if (nestedCommandObj.commands[subcommand] === undefined) {
                    if (nestedCommandObj.onCommandNotFound != undefined) {
                        const onCommandNotFound = nestedCommandObj.onCommandNotFound
                        
                        this.tryExecuteCommand(onCommandNotFound.cls, onCommandNotFound.command, ctx)
                        return
                    }
                }
                
                commandObj = nestedCommandObj.commands[subcommand]
            } else return commandObj as Commands
        }
    }
    
    private async tryExecuteCommand(cls : Class, func : Function, ctx : Context, ...args : any) { 
        try {
            return await func(ctx, ...args)
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(e as any)
            }

            const onErrorFunc = await (getFunctionFromCls(cls, "onError"))

            if (onErrorFunc != undefined) {
                // try execute local on error function 
                try { 
                    onErrorFunc(e, ctx)
                    return
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

    msg : string
    content : string
    
    methodName : string
    className  : string
    globals! : BaseGlobals // override the types!
    callEvent! : (event : string, ...args : any) => Promise<any>

    constructor() {
        this.msg = ""
        this.content = ""

        this.methodName = ""
        this.className = ""
    }
}

export class BaseGlobals implements Globals {
    moduleLoader! : ModuleLoader
    callEvent! : typeof CommandProcessor.prototype.callEvent

    constructor(
        public botName : string,
        public prefix : string,
    ) { }
}