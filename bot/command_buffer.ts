// we first store the commands into a commands buffer incase there's an error when loading the file,
// we can simply clear the buffer without making changes to the actual commands list. 

export class CommandsBuffer { 
    
    static clearCache(cls : typedCls) { 
        delete cls.prototype[commandBufferVarName]
        delete cls.prototype[eventBufferVarName]
    }

    static addCommandBuffer(commandName : Array<string>, cls : typedCls, func : CommandFunction) {

        const error = (name : string, error : string) => Error(`Command "${name}" ${error} (func: ${func.name} - existing func: ${cls[commandBufferVarName]?.[name].name} in class : ${cls.name})`) 

        if (cls[commandBufferVarName] === undefined)
            cls[commandBufferVarName] = {}

        let commandsObj : CommandMap = cls[commandBufferVarName]

        commandName.forEach((name) => {
            name = name.toLowerCase();

            if (name === "" || /\s/.test(name)) throw error(name, "contains an empty string!")
            if (commandsObj.hasOwnProperty(name)) throw error(name, "already exists!")

            commandsObj[name] = func
        })
    }

    static addEvent(cls : typedCls, eventName : string, func : Function) {
        if (cls[eventBufferVarName] == undefined)
            cls[eventBufferVarName] = {}

        const events = cls[eventBufferVarName]

        if (!events.hasOwnProperty(eventName)) events[eventName] = []
        events[eventName].push(func)
    }

    static readCommandBuffer(cls : typedCls) {
        return cls.prototype[commandBufferVarName] as commands
    }

    static readEventBuffer(cls : typedCls) { 
        return cls.prototype[eventBufferVarName] as events
    }
}

type commands = CommandMap | undefined
type events = ModuleEvent | undefined

export type typedCls = Class & { 
    [commandBufferVarName] : commands,
    [eventBufferVarName] : events
}

export const commandBufferVarName = '__commandBuffer__'

export const eventBufferVarName = '__eventBuffer__'

export const parentVarName = '__parent__'

export interface parent {
    name? : string, 
    parent? : string | Array<string>
}