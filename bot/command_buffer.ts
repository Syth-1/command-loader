// we first store the commands into a commands buffer incase there's an error when loading the file,
// we can simply clear the buffer without making changes to the actual commands list. 

import { cloneDeep } from "lodash";

// due to the fact we dont export classes, we have to use a command buffer to load the commands into, for module loader to read from!

export class CommandsBuffer { 
    private static commands : Commands = {}

    static clearCache() { 
        this.commands = {}; 
    }

    static addCommandBuffer(commandName : Array<string>, parent : string | undefined, func : CommandFunction) {
        commandName.forEach(name => {
            const error = () => Error(`Command "${name}" already exists! (func: ${func.name} - existing func: ${this.commands[name].name})`) 

            name = name.toLowerCase(); 

            if (name in this.commands)
                throw error()

            if (parent) {
                if (this.commands[parent] == undefined) {
                    this.commands[parent] = {}
                } else if (typeof this.commands[parent] == 'function') {
                    throw error()
                } else if (name in this.commands[parent]) {
                    throw Error(`subcommand '${name}' already exists in parent command '${parent}'`)
                }
                
                (this.commands[parent] as CommandObj)[name] = func
            } else
                this.commands[name] = func
        });
    }

    static readCommandBuffer() {
        return cloneDeep(this.commands)
    }
}



