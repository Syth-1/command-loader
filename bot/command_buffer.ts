// we first store the commands into a commands buffer incase there's an error when loading the file,
// we can simply clear the buffer without making changes to the actual commands list. 

interface BufferClass { 
    /** ⚠️**CAUTION**⚠️ - *Typescript does not enforce* `readonly` */
    readonly varName : string
    add : Function, 
    read : Function,
    delete : Function
}

type commands = CommandMap | undefined
type events = ModuleEvent | undefined
type intervals = ModuleInterval | undefined


class CommandBuffer implements BufferClass { 
    readonly varName = '__commandBuffer__'

    add(commandName : Array<string>, cls : typedCls, func : CommandFunction) {

        const error = (name : string, error : string) => Error(`Command "${name}" ${error} (func: ${func.name} - existing func: ${cls[this.varName]?.[name].name} in class : ${cls.name})`) 


        if (cls[this.varName] === undefined)
            cls[this.varName] = {}

        const commandsObj : CommandMap = cls[this.varName]!

        commandName.forEach((name) => {
            name = name.toLowerCase();

            if (name === "" || /\s/.test(name)) throw error(name, "contains an empty string!")
            if (commandsObj.hasOwnProperty(name)) throw error(name, "already exists!")

            commandsObj[name] = func
        })
    }
    

    read(cls : typedCls) {
        return cls.prototype[this.varName] as commands
    }

    delete(cls : typedCls) { 
        delete cls.prototype[this.varName]
    }
}


class EventBuffer implements BufferClass { 
    readonly varName = "__eventBuffer__"

    add(cls : typedCls, eventName : string, func : Function) {

        if (cls[this.varName] === undefined)
            cls[this.varName] = {}

        const events = cls[this.varName]!

        if (!events.hasOwnProperty(eventName)) events[eventName] = []
        events[eventName].push(func)
    }

    read(cls : typedCls) { 
        return cls.prototype[this.varName] as events
    }
    
    delete(cls : typedCls) {
        delete cls.prototype[this.varName]
    }
}


class CheckBuffer implements BufferClass {
    readonly varName = "__checkBuffer__"

    add(cls : typedCls, func : Function) { 

        if (cls[this.varName] === undefined)
            cls[this.varName] = []

        cls[this.varName].push(func as CommandFunction)
    }
    
    read(cls : typedCls) { 
        return cls.prototype[this.varName] as Array<CommandFunction>
    }

    delete(cls : typedCls) {
        delete cls.prototype[this.varName]
    }
}

class IntervalBuffer implements BufferClass {
    readonly varName = "__intervalBuffer__"

    add(cls : typedCls, func : Function, interval : number) { 

        if (cls[this.varName] === undefined)
            cls[this.varName] = {}

        cls[this.varName]![`${cls.name}:${func.name}`] = {
            func : func as IntervalFunction,
            interval: interval,
            cls : cls
        }
    }
    
    read(cls : typedCls) { 
        return cls.prototype[this.varName] as intervals
    }

    delete(cls : typedCls) {
        delete cls.prototype[this.varName]
    }
}


export const buffers = classToInstancedDict({
    CommandBuffer,
    CheckBuffer,
    EventBuffer,
    IntervalBuffer
})

export type typedCls = Class & { 
    [ K in keyof typeof buffers as typeof buffers[K]['varName'] ] : ReturnType<typeof buffers[K]['read']>
}

export const parentVarName = '__parent__'

export interface parent {
    name? : string, 
    parent? : string | Array<string>
}

export function clearCache(cls : typedCls) { 
    for (const bufferCls of Object.values(buffers))
        bufferCls.delete(cls)
}

function classToInstancedDict<T extends Record<string, Class>>(classes: T): { [K in keyof T]: InstanceType<T[K]> } {
    const result = {} as { [K in keyof T]: InstanceType<T[K]> };
  
    for (const key in classes) {
        result[key] = new classes[key]();
    }
  
    return result;
}
