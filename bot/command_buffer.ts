// we first store the commands into a commands buffer incase there's an error when loading the file,
// we can simply clear the buffer without making changes to the actual commands list. 

// due to the fact we dont export classes, we have to use a command buffer to load the commands into, for module loader to read from!

export class CommandsBuffer { 
    private static commands : CommandBufferMap = new Map()

    static clearCache() { 
        this.commands = new Map(); 
    }

    static addCommandBuffer(commandName : Array<string>, cls : Class, func : CommandFunction) {

        const error = (name : string, error : string) => Error(`Command "${name}" ${error} (func: ${func.name} - existing func: ${this.commands.get(cls)?.[name].name} in class : ${cls.name})`) 
        
        if (!this.commands.has(cls)) {
            this.commands.set(cls, {})
        }

        let commandsObj : CommandMap = this.commands.get(cls)!

        commandName.forEach((name) => {
            name = name.toLowerCase();

            if (name == "" || /\s/.test(name)) throw error(name, "contains an empty string!")
            if (commandsObj.hasOwnProperty(name)) throw error(name, "already exists!")

            commandsObj[name] = func
        })
    }

    static readCommandBuffer() {
        return this.commands
    }
}

export const parentVarName : string = '__parent__'

export interface parent {
    name? : string, 
    parent? : string | Array<string>
}