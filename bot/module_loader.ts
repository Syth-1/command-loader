import { cloneDeepWith } from 'lodash'
import { CommandsBuffer, parentVarName } from './internals'
import Queue from './utils/queue'
import path from 'node:path'

interface ModuleCommandsObj { 
    [key: string] : ModuleCommands
}

interface baseCommands { 
    commands : Array<string>
    subcommands : SubCommandObj
}

interface ModuleCommands extends baseCommands {
    class : Array<Class>
}


type PartialCommands = {
    cls : Class, 
    command : Function
}

type SubCommand = Converter<MergeTwo<baseCommands, NestedCommandObj>, PartialCommands | undefined, boolean> 

interface SubCommandObj {
    [key: string] : SubCommand
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
    commands : CommandsCollection = {}
    eventListener : ListenerEvents = {}

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

        const commandsBufferMap = CommandsBuffer.readCommandBuffer()
        const listenerEvents = CommandsBuffer.readEventBuffer()

        CommandsBuffer.clearCache()

        // throws error if check failed.
        return {...this.checkCommands(commandsBufferMap, file), listenerEvents}
    }

    purgeImportCache() { 
        for (const file of Object.keys(require.cache)) {
            if (this.checkSkipImport(file)) continue

            delete require.cache[file]
        }
    }

    private checkSkipImport(filePath: string) { 
        return (filePath.includes(path.join(import.meta.dir, "command_buffer")))
    }
    

    private async loadModuleHandler(files : Array<string>, callback : eventCallBack) {

        const errors : Array<Error> = []
 
        for (let file of files) {
            try {
                if (this.moduleCommandTree.hasOwnProperty(file)) throw Error(`file '${file}' has already been loaded!`)

                const {copyCommands, moduleTree, listenerEvents} = await this.loadFile(file)

                for (const cls of moduleTree.class) {
                    const loadFunc = getFunctionFromCls(cls, "onLoad")
                    loadFunc?.()
                }

                this.commands = copyCommands
                this.moduleCommandTree[file] = moduleTree
                this.eventListener[file] = listenerEvents

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
                if (!this.moduleCommandTree.hasOwnProperty(file)) 
                    throw Error(`module ${file} has not been loaded!`)

                    for (const cls of this.moduleCommandTree[file].class) {
                        const unLoadFunc = getFunctionFromCls(cls, "onUnload")
                        unLoadFunc?.()
                    }

                    this.commands = this.deleteModulesCommands(file)
                    delete this.moduleCommandTree[file]
                    delete this.eventListener[file]

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
                const {copyCommands, moduleTree, listenerEvents} = await this.loadFile(file)

                for (const cls of moduleTree.class) {
                    const loadFunc = getFunctionFromCls(cls, "onLoad")
                    loadFunc?.()
                }

                await this.unloadModuleHandler([file], callbackError => {
                    errors.push(...callbackError)
                })

                this.commands = copyCommands
                this.moduleCommandTree[file] = moduleTree
                this.eventListener[file] = listenerEvents

            } catch (error : unknown) {
                errors.push(error as Error)
            }
        }

        await callback(errors)
    }

    private checkCommands(commandBufferMap : CommandBufferMap, module : string) {
        const copyCommands = this.deleteModulesCommands(module) // our compare object
        const moduleTree : ModuleCommands = {
            class : [],
            commands : [],
            subcommands : {}
        }

        for (const [cls, commandsToAdd] of commandBufferMap.entries()) {
            moduleTree.class.push(cls)

            const parent : NonEmptyArray<string> | undefined = Object.getOwnPropertyDescriptor(cls, parentVarName)?.value || Object.getOwnPropertyDescriptor(cls.constructor, parentVarName)?.value

            if (parent != undefined) {
                this.addChildCommands(parent, commandsToAdd, cls, moduleTree.subcommands, copyCommands)
                continue
            }

            this.addCommands(commandsToAdd, copyCommands, moduleTree.commands, cls)
       }

        return {copyCommands, moduleTree}
    }

    private addChildCommands(parent : NonEmptyArray<string>, commandsToAdd : CommandMap, cls : Class, commands : SubCommandObj, nestedCommandObj : CommandsCollection) {
        // returns commands tree + commandsObj

        const child = parent.shift()!

        if (!commands.hasOwnProperty(child)) {
            commands[child] = {
                commands : [],
                onDefaultCommand : false,
                onCommandNotFound : false,
                subcommands : {}
            } 
        }

        if (!nestedCommandObj.hasOwnProperty(child)) {
            nestedCommandObj[child] = {
                commands : {},
                onDefaultCommand : undefined,
                onCommandNotFound : undefined, 
            }
        } else {
            if (nestedCommandObj[child].hasOwnProperty("cls")) {
                throw Error(`error occured while adding parent '${child}' - this already exsists as a function! : '${((nestedCommandObj[child] as Commands).command as () => void).name}'`)
            }
        }
    
        const childObj = commands[child]
        const commandObj = (nestedCommandObj[child] as NestedCommandObj)

        if (parent.length != 0) { 
            // if parent recursively add

            this.addChildCommands(parent, commandsToAdd, cls, childObj.subcommands, commandObj.commands)
            // we use refs to add to the object.

            return { childObj, commandObj }
        }

        this.addCommands(commandsToAdd, commandObj.commands, childObj.commands, cls)
        // we use refs to add to the object.

        type booleanKeysOfSubcommand = KeysOfType<SubCommand, boolean>

        const functionKeys : Array<booleanKeysOfSubcommand> = [
            'onDefaultCommand',
            "onCommandNotFound",
        ]

        for (const key of functionKeys) {
            const typedKey = key as keyof Class || undefined;
            const func : Function | undefined = cls[typedKey] || cls.prototype?.[typedKey]

            if (func === undefined) continue

            childObj[key] = true as any // ts does not recognize its keys for booleans only

            //@ts-ignore
            commandObj[typedKey] = {
                cls : cls,
                command : func
            }
        }
    }

    private addCommands(commandsToAdd : CommandMap, commandCollection : CommandsCollection, moduleTreeCommandList : Array<string>, cls : Class) { 
        for (const [command, func] of Object.entries(commandsToAdd)) { 
            if (commandCollection.hasOwnProperty(command)) {
                throw Error(`command '${command}' already exists!`)
            }

            commandCollection[command] = {
                cls : cls, 
                command : func
            }
            moduleTreeCommandList.push(command)
        }
    }

    private deleteModulesCommands(module : string) {
        const copyCommands = cloneDeepWith(this.commands, val => {
            if (val?.hasOwnProperty("cls") && val?.hasOwnProperty("command") && typeof val["command"] == 'function') return val
        })
        
        const moduleTree : ModuleCommands | undefined = this.moduleCommandTree[module]
        
        if ( moduleTree === undefined ) return copyCommands

        for (const commands of moduleTree.commands) {
            delete copyCommands[commands]
        }

        for (const [prefix, child] of Object.entries(moduleTree.subcommands)) {
            const childCommandObj = copyCommands[prefix] as NestedCommandObj

            this.deleteSubCommand(child, childCommandObj)

            if (this.checkChildEmpty(childCommandObj)) {
                delete copyCommands[prefix]
            }
        } 
        
        return copyCommands
    }

    private deleteSubCommandObj(subcommandObj : SubCommandObj, copyCommands : NestedCommandObj) {
        for (const [prefix, child] of Object.entries(subcommandObj)) {
            const childCommandObj = copyCommands.commands[prefix] as NestedCommandObj

            this.deleteSubCommand(child, childCommandObj)

            if (this.checkChildEmpty(childCommandObj)) {
                delete copyCommands.commands[prefix]
            }
        } 
    } 

    private deleteSubCommand(subcommand : SubCommand, copyCommands : NestedCommandObj) {
        if (subcommand.onDefaultCommand) copyCommands.onDefaultCommand = undefined
        if (subcommand.onCommandNotFound) copyCommands.onCommandNotFound = undefined

        for (const commands of subcommand.commands) {
            delete copyCommands.commands[commands]
        }

        this.deleteSubCommandObj(subcommand.subcommands, copyCommands)

        for (const [key, val] of Object.entries(subcommand)) {
            if (typeof val === "boolean" && !val) // we expect any boolean to be nullable.
                copyCommands[key as keyof NestedCommandObj] = undefined as any
        }
    }

    private checkChildEmpty(copyCommands : NestedCommandObj) { 
        for (const [key, val] of Object.entries(copyCommands)) {
            switch (typeof val) {
                case 'function' : {
                    if (val != undefined) return false
                    break
                }
                case 'object' : {
                    if (Object.keys(val).length != 0) return false
                    break
                }
            }
        }

        return true
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

export function getFunctionFromCls(cls : Class, funcName : string) : Function | undefined { 
    return cls[funcName as keyof Class] || cls.prototype?.[funcName]
}

function checkSkipImport(filePath: string) { 
    const cwd = path.dirname(Bun.main);
    const pathsToSkip = [
        path.join(cwd, "node_module"), 
        import.meta.dirname
    ];

    if (!filePath.startsWith(cwd)) return true;

    for (const pathToSkip of pathsToSkip) {
        if (filePath.startsWith(pathToSkip))
            return true;
    }

    return false;
}

for (const file of Object.keys(require.cache)) {
    if (checkSkipImport(file)) continue

    delete require.cache[file]
}