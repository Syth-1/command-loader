import { EventNames, ModuleLoader, StringParser, getFunctionFromCls } from "./internals";

export class ProcessCommands<T extends new (...args : any) => BaseContext> { 

    readonly prefix : string;
    readonly moduleLoader : ModuleLoader
    private contextCls : T

    constructor(prefix : string, contextCls : T) { 
        this.moduleLoader = new ModuleLoader()
        this.contextCls = contextCls
        this.prefix = prefix
    }

    processCommands(msg : string, ...args : ConstructorParameters<T>) {
        msg = msg.trim();

        if (!msg.startsWith(this.prefix)) return;

        const context = new this.contextCls(...args)

        context.msg = msg;
        context.moduleLoader = this.moduleLoader
        
        const preCheck = this.callEvent(EventNames.preCheck, context, msg)

        if (typeof preCheck === 'boolean') {
            if (!preCheck) return
        } else if (typeof preCheck === 'string') {
            msg = preCheck
        }
        
        msg = msg.substring(this.prefix.length)

        let commandParser = new StringParser(msg, false)

        const command = commandParser.getArg().toLocaleLowerCase()

        if (command.length === 0) return;

        let funcOrParent = this.moduleLoader.commands[command]
        
        if (funcOrParent === undefined) return
        
        let func = this.tryGetSubCommand(funcOrParent, commandParser, context)
        
        if (func === undefined) return; 

        context.content = commandParser.getRestOfString()

        const onCommandCheck = this.callEvent(EventNames.onCommand, context)

        if (typeof onCommandCheck === 'boolean') {
            if (!onCommandCheck) return
        } else if (typeof onCommandCheck === 'string') {
            context.content = onCommandCheck
        }

        const onLocalCommand = getFunctionFromCls(func.cls, "onCommand")

        if (onLocalCommand != undefined) {
            const onLocalCommndCheck = this.tryExecuteCommand(func.cls, onLocalCommand, context)

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
    
    private tryExecuteCommand(cls : Class, func : Function, ctx : Context, ...args : any) { 
        try {
            func(ctx, ...args)
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(e as any)
            }

            const onErrorFunc = (getFunctionFromCls(cls, "onError"))

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
        }
    }

    callEvent( event : string, ...args : any ) { 
        for (const [file, moduleEvents] of Object.entries(this.moduleLoader.eventListener)) {
            const funcArr = moduleEvents[event]
            if (funcArr === undefined) continue
    
            for (const func of funcArr) {
                try {
                    const value = func(...args)
    
                    if (value !== undefined) return value // assume if a value is returned, we early return!
                } catch { 
                    if (event === EventNames.error) continue
    
                    this.callEvent(
                        EventNames.error, 
                        Error(`calling function: '${func.name}' for event '${event}' failed! args passed: ${args}`)
                    )
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
    moduleLoader : ModuleLoader | undefined


    constructor() {
        this.msg = ""
        this.content = ""

        this.methodName = ""
        this.className = ""
        this.moduleLoader = undefined
    }
}

// this.name = ""
// this.channel = ""    
// this.id = ""
// this.vip = 0
// this.level = 1