import { EventNames, ModuleLoader, StringParser } from "./internals";

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
        
        let func = tryGetSubCommand(funcOrParent, commandParser)
        
        if (func === undefined) return; 

        const onCommandCheck = this.callEvent(EventNames.onCommand, context, commandParser.getRestOfString())
        
        if (typeof onCommandCheck === 'boolean') {
            if (!onCommandCheck) return
        } else if (typeof onCommandCheck === 'string') {
            commandParser = new StringParser(onCommandCheck)
        }

        context.content = commandParser.getRestOfString()

        try {
            func(context, context.content)
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(e as any)
            }

            this.callEvent(EventNames.error, e)
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


function tryGetSubCommand(commandObj :  CommandFunction | NestedCommandObj, commandParser : StringParser) {
    
    while (true) {
        if (typeof commandObj === 'object') {

            const subcommand = commandParser.getArg().toLocaleLowerCase()

            if (subcommand.length === 0) {
                if (commandObj.onDefaultCommand != undefined) {
                   return commandObj.onDefaultCommand as CommandFunction // default command is just command function without any additional params.
                }
                return
            }

            // handle subcommand not found!
            if (commandObj.commands[subcommand] === undefined) {
                if (commandObj.onCommandNotFound != undefined) {
                    commandObj.onCommandNotFound(subcommand)
                    return
                }
            }

            commandObj = commandObj.commands[subcommand]
        } else return commandObj
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