import { cloneDeep } from 'lodash'
import { CommandsBuffer } from './internals'
import Queue from './utils/queue'

interface ModuleCommandsObj { 
    [key: string] : ModuleCommands
}

type ModuleCommands = Array<string | SubCommand>

type SubCommand = {
    prefix : string, 
    commands : Array<string>
}

// creates a module > command tree, this is for adding and removing commands only!
// creates a flat command array,

type eventCallBack = (errors : Array<Error>) => any

interface Event { 
    type : EventType,
    file : Array<string>
    callback : eventCallBack
}

type EventType = "load" | "unload" | "reload" 

export class ModuleLoader {

    moduleCommandTree : ModuleCommandsObj = {}
    commands : Commands = {}

    private events = new Queue<Event>()

    constructor() {
        // we use an IIFE in constructor so there is never more than one consumer running at any given time within ModuleLoader instance. 
        (async () => {
            while (true) { 
                const event = await this.events.get()

                if (event === undefined) continue;
 
                await this.handleEvent(event)
            }
        })()
    }

    async scheduleEvent(event : EventType, files : string | Array<string>, callback : eventCallBack = () => {}) {
        const eventFile = Array.isArray(files) ? files : [files]

        await this.events.put({
            type : event,
            file : eventFile,
            callback : callback
        })
    }

    private async loadFile(file : string) { 
        await import(file + '?q=' + Math.random()) // dirty load

        const commands = CommandsBuffer.readCommandBuffer()

        CommandsBuffer.clearCache()

        // throws error if check failed.
        return this.checkCommands(commands, file)
    }


    private async loadModuleHandler(files : Array<string>, callback : eventCallBack) {

        const errors : Array<Error> = []
 
        for (let file of files) {
            try {
                if (file in this.moduleCommandTree) throw Error(`file '${file}' has already been loaded!`)

                const {copyCommands, moduleTree} = await this.loadFile(file)

                this.commands = copyCommands
                this.moduleCommandTree[file] = moduleTree

            } catch (error : unknown) {
                errors.push(error as Error)
            }
        }

        await callback(errors)
    }

    private async unloadModuleHandler(files : Array<string> | string, callback : eventCallBack) {

        const errors : Array<Error> = []

        for (const file of files) {
            try {
                if (file in this.moduleCommandTree == false) 
                    throw Error(`module ${file} has not been loaded!`)

                    this.commands = this.deleteModulesCommands(file)
                    delete this.moduleCommandTree[file]

            } catch (error : unknown) {
                errors.push(error as Error)
            }
        }

        await callback(errors)
    }

    private async reloadModuleHandler(files : Array<string>, callback : eventCallBack) {
        
        const errors : Array<Error> = []

        for (let file of files) {
            try {
                const {copyCommands, moduleTree} = await this.loadFile(file)

                await this.unloadModuleHandler(files, callbackError => {
                    errors.push(...callbackError)
                })

                this.commands = copyCommands
                this.moduleCommandTree[file] = moduleTree

            } catch (error : unknown) {
                errors.push(error as Error)
            }
        }

        await callback(errors)
    }

    private checkCommands(commands : Commands, module : string) {
        const copyCommands = this.deleteModulesCommands(module) // our compare object
        const moduleTree : ModuleCommands = []

        for (const [command, funcOrSubCommands] of Object.entries(commands)) {

            if (typeof funcOrSubCommands === 'object') { // if its a subcommand

                const subCommandTree : SubCommand = {
                    "prefix" : command,
                    "commands" : []
                }

                for (const [subCommands, func] of Object.entries(funcOrSubCommands)) {
                    if (subCommands in copyCommands[command]) {
                        throw Error(`subcommand '${subCommands}' already exists in parent command '${command}'\nmodule: ${module}`)
                    }

                    if (copyCommands[command] == undefined) 
                        copyCommands[command] = {};

                    (copyCommands[command] as CommandObj)[subCommands] = func
                    subCommandTree.commands.push(subCommands)
                }

                moduleTree.push(subCommandTree)
                continue;
            }

            if (command in copyCommands) {
                throw Error(`command '${command}' already exists!\nmodule: ${module}`)
            }

            const func = funcOrSubCommands
            copyCommands[command] = func
            moduleTree.push(command)
        }

        return {copyCommands, moduleTree}
    }

    private deleteModulesCommands(module : string) { 
        const copyCommands = cloneDeep(this.commands)
        const moduleTree : ModuleCommands | undefined = this.moduleCommandTree[module]
        
        if ( moduleTree == undefined ) return copyCommands

        for (const commands of moduleTree) {
            if (typeof commands == 'object') { // if its a subcommand
                for (const subCommand of commands.commands) {
                    delete (copyCommands[commands.prefix] as CommandObj)[subCommand]
                }

                if (Object.keys(copyCommands[commands.prefix]).length == 0) {
                    delete copyCommands[commands.prefix] // clean up empty objects.
                }

                continue
            }

            delete copyCommands[commands]
        }
        
        return copyCommands
    }

    private async handleEvent(event : Event) { 
        switch (event.type) {
            case "load" : {
                await this.loadModuleHandler(event.file, event.callback)
                break
            }

            case "unload": {
                await this.unloadModuleHandler(event.file, event.callback)
                break
            }

            case "reload" : {
                await this.reloadModuleHandler(event.file, event.callback)
                break
            }
        }
    }
}