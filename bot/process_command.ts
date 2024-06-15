import { ModuleLoader } from "./internals";

export class ProcessCommands<T extends new (...args : any) => BaseContext> { 

    readonly prefix : string;
    readonly moduleLoader : ModuleLoader
    private contextCls : T

    params : { 
        preCheck? : (msg : string, a : InstanceType<T>) => boolean | string | undefined,
        onCommand? : (msg : string, a : InstanceType<T>) => boolean | string | undefined
    }

    constructor(prefix : string, contextCls : T, params : ProcessCommands<T>["params"] = {}) { 
        this.moduleLoader = new ModuleLoader()
        this.contextCls = contextCls
        this.prefix = prefix
        this.params = params
    }

    processCommands(msg : string, ...args : ConstructorParameters<T>) {
        msg = msg.trim();

        if (!msg.startsWith(this.prefix)) return;

        const context = new this.contextCls(...args)

        context.msg = msg;
        context.moduleLoader = this.moduleLoader
        
        const preCheck = this.params.preCheck?.apply(this, [msg, context as InstanceType<T>])

        if (typeof preCheck == 'boolean') {
            if (!preCheck) return
        } else if (typeof preCheck == 'string') {
            msg = preCheck
        }
        
        msg = msg.substring(this.prefix.length)

        const command = msg.split(' ')[0].toLowerCase()

        if (command.length == 0) return;

        const funcOrParent = this.moduleLoader.commands[command]
        
        if (funcOrParent == undefined) return
        
        msg = msg.substring(command.length);
        
        let func : CommandFunction; 

        if (typeof funcOrParent == 'object') {
            const subcommand = msg.split(' ')[0]

            if (command.length == 0) return;

            func = funcOrParent[subcommand]
            
            if (func == undefined) return 

            msg = msg.substring(subcommand.length);
        } else { 
            func = funcOrParent
        }

        const onCommandCheck = this.params.onCommand?.apply(this, [msg, context as InstanceType<T>])
        
        if (typeof onCommandCheck == 'boolean') {
            if (!onCommandCheck) return
        } else if (typeof onCommandCheck == 'string') {
            msg = onCommandCheck
        }

        context.content = msg

        func.apply(this, [context, msg])
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