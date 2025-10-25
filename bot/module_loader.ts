import { cloneDeepWith } from 'lodash'
import { buffers, clearCache, parentVarName, cacheFlag, type typedCls, type BaseGlobals } from './internals'
import path from 'node:path'
import { EventNames } from './internals'
import { IntervalHandler } from './intervals'
import { Mutex, withMutex } from './utils/mutex'

interface ModuleCommandsObj { 
    [key: string] : ModuleCommands
}

interface BaseCommands { 
    commands : Array<string>
    subcommands : SubCommandObj
}

interface ModuleCommands extends BaseCommands {
    class : Array<Class>
}


type PartialCommands = {
    cls : Class, 
    command : Function
}

type CheckCommandsObj = {
    [key: string]: PartialCommands
}

type SubCommand = Converter<Converter<MergeTwo<BaseCommands, NestedCommandObj>, PartialCommands | undefined, boolean>, 
    CheckCommandsObj, Array<string>
>

interface SubCommandObj {
    [key: string] : SubCommand
}


export class ModuleLoader {

    moduleCommandTree : ModuleCommandsObj = {}
    commands : CommandsCollection = {}
    eventListener : ListenerEvents = {}
    intervals : IntervalEvents = {}

    private readonly globals : BaseGlobals

    static readonly mutex = new Mutex();

    constructor(globals : BaseGlobals) {
        
        this.globals = globals;
    }

    private async loadFile(file : string) {

        const importedCls : Array<typedCls> = await import(file)

        const commandsBufferMap : CommandBufferMap = new Map()
        const listenerEvents : ModuleEvent = {}
        const intervals : ModuleInterval = {}
        

        for (const [_moduleName, cls] of Object.entries(importedCls)) {
            if (!isClass(cls)) continue

            // instance the class we want to bind to!
            const instancedCls = new cls()

            // load events
            const events = buffers.EventBuffer.read(cls)

            if (events !== undefined) {
                for (const [name, funcArr] of Object.entries(events)) {
                    if (!listenerEvents.hasOwnProperty(name)) listenerEvents[name] = []

                    listenerEvents[name].push(...funcArr.map(func => func.bind(instancedCls)))
                }
            }

            // load intervals
            const intervalsObj = buffers.IntervalBuffer.read(cls) ?? {}
            Object.values(intervalsObj).forEach(val => val.func = val.func.bind(instancedCls))
            Object.assign(intervals, intervalsObj)

            // load commands
            const commandsMap = buffers.CommandBuffer.read(cls) || {}
            const checkMap = buffers.CheckBuffer.read(cls) || []
            
            // add empty objects as they may contain load and unload!
            commandsBufferMap.set(instancedCls, {
                commands : commandsMap,
                check : Object.fromEntries(checkMap.map(checkFunc => [checkFunc.name, checkFunc]))
            })
            
        
            clearCache(cls)
        }

        // throws error if check failed.
        return {...this.checkCommands(commandsBufferMap, file), listenerEvents, intervals}
    }

    purgeImportCache() { 
        for (const [file, module] of Object.entries(require.cache)) {
            if (!module) continue
            if (checkSkipImport(file) || module.exports?.[cacheFlag] === true) continue
        
            delete require.cache[file]
        }
    }

    @withMutex(ModuleLoader.mutex)
    async loadModule(files : string | Array<string>) {
        if (typeof files === 'string') files = [files]

        const errors : Array<Error> = []
 
        for (let file of files) {
            try {
                if (this.moduleCommandTree.hasOwnProperty(file)) throw Error(`file '${file}' has already been loaded!`)

                const {copyCommands, moduleTree, listenerEvents, intervals} = await this.loadFile(file)

                for (const cls of moduleTree.class) {
                    const loadFunc = getFunctionFromCls(cls, "onLoad")
                    if (loadFunc) {
                        this.globals.commandProcessor.tryExecuteFunction(
                            cls, 
                            loadFunc, 
                            this.globals
                        )
                    }
                }

                await this.globals.commandProcessor.callEvent(EventNames.onLoad, this.globals, file)

                this.commands = copyCommands
                this.moduleCommandTree[file] = moduleTree
                this.eventListener[file] = listenerEvents

                this.reloadIntervals(this.intervals, file, intervals, this.globals)

            } catch (error : unknown) {
                errors.push(error as Error)
            } finally { 
                this.purgeImportCache()
            }
        }

        return errors
    }

    @withMutex(ModuleLoader.mutex)
    async unloadModule(files : string | Array<string>) {
        return this.unloadModuleHandler(files)
    }

    private async unloadModuleHandler(files : string | Array<string>, reloading : boolean = false) {
        if (typeof files === 'string') files = [files]

        const errors : Array<Error> = []

        for (const file of files) {
            try {
                if (!this.moduleCommandTree.hasOwnProperty(file)) 
                    throw Error(`module ${file} has not been loaded!`)

                for (const cls of this.moduleCommandTree[file].class) {
                    const unLoadFunc = getFunctionFromCls(cls, EventNames.onUnload)
                    if (unLoadFunc) {
                        this.globals.commandProcessor.tryExecuteFunction(
                            cls, 
                            unLoadFunc,
                            this.globals
                        )
                    }
                }

                await this.globals.commandProcessor.callEvent(EventNames.onUnload, this.globals, file)

                this.commands = this.deleteModulesCommands(file)
                delete this.moduleCommandTree[file]
                delete this.eventListener[file]

                if (!reloading) this.unloadIntervals(this.intervals[file])

            } catch (error : unknown) {
                errors.push(error as Error)
            }
        }

        return errors
    }

    @withMutex(ModuleLoader.mutex)
    async reloadModule(files : string | Array<string>) {
        if (typeof files === 'string') files = [files]

        const errors : Array<Error> = []

        for (let file of files) {
            try {
                const {copyCommands, moduleTree, listenerEvents, intervals} = await this.loadFile(file)

                for (const cls of moduleTree.class) {
                    const loadFunc = getFunctionFromCls(cls, EventNames.onLoad)
                    if (loadFunc) {
                        this.globals.commandProcessor.tryExecuteFunction(
                            cls, 
                            loadFunc,
                            this.globals
                        )
                    }
                }

                await this.globals.commandProcessor.callEvent(EventNames.onLoad, this.globals, file)

                const unloadErrors = await this.unloadModuleHandler(file, true)

                errors.push(...unloadErrors)

                this.commands = copyCommands
                this.moduleCommandTree[file] = moduleTree
                this.eventListener[file] = listenerEvents

                this.reloadIntervals(this.intervals, file, intervals, this.globals)

            } catch (error : unknown) {
                errors.push(error as Error)
            } finally { 
                this.purgeImportCache()
            }
        }

        return errors
    }


    async handleReload({addFiles, removeFiles, reloadFiles} : {
        addFiles? : Array<string>, 
        removeFiles? : Array<string>, 
        reloadFiles? : Array<string>
    }) {
        const errors : Error[] = []

        // remove files first before adding in event of re-naming files!

        if (removeFiles) {
            const error = await this.unloadModule(removeFiles)
            errors.push(...error)
        }

        if (reloadFiles) {
            const error = await this.reloadModule(reloadFiles)
            errors.push(...error)
        }

        if (addFiles) {
            const error = await this.loadModule(addFiles)
            errors.push(...error)
        }

        return errors
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

            this.addCommands(commandsToAdd.commands, copyCommands, moduleTree.commands, cls)
       }

        return {copyCommands, moduleTree}
    }

    private addChildCommands(parent : NonEmptyArray<string>, commandsToAdd : CommandBufferObj, cls : Class, commands : SubCommandObj, nestedCommandObj : CommandsCollection) : undefined {
        // returns commands tree + commandsObj

        const child = parent.shift()!

        if (!commands.hasOwnProperty(child)) {
            commands[child] = {
                commands : [],
                onDefaultCommand : false,
                onCommandNotFound : false,
                subcommands : {},
                check : []
            } 
        }

        if (!nestedCommandObj.hasOwnProperty(child)) {
            nestedCommandObj[child] = {
                commands : {},
                onDefaultCommand : undefined,
                onCommandNotFound : undefined,
                check : {}
            }
        } else {
            if (nestedCommandObj[child].hasOwnProperty("cls")) {
                throw Error(`error occured while adding parent '${child}' - this already exsists as a function! : '${((nestedCommandObj[child] as Commands).command as Function).name}'`)
            }
        }

        const childObj = commands[child]
        const commandObj = (nestedCommandObj[child] as NestedCommandObj)

        if (parent.length != 0) { 
            // if parent recursively add

            return this.addChildCommands(parent, commandsToAdd, cls, childObj.subcommands, commandObj.commands)
            // we use refs to add to the object.
        }

        this.addCommands(commandsToAdd.commands, commandObj.commands, childObj.commands, cls)
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
                command : func.bind(cls)
            }
        }

        // add checks
        for (const [key, val] of Object.entries(commandsToAdd.check)) {
            if (key in childObj.check)
                throw Error(`check '${key}' already exists!`)

            childObj.check.push(key)
            commandObj.check[key] = {
                cls: cls, 
                command : val.bind(cls)
            }
        }
    }

    private addCommands(commandsToAdd : CommandMap, commandCollection : CommandsCollection, moduleTreeCommandList : Array<string>, cls : Class) { 
        // keep same ref across command alias'
        const funcBindMap : Map<CommandFunction, CommandFunction> = new Map()

        for (const [command, func] of Object.entries(commandsToAdd)) { 
            if (commandCollection.hasOwnProperty(command)) {
                throw Error(`command '${command}' already exists!`)
            }

            if (!funcBindMap.has(func)) { 
                funcBindMap.set(func, func.bind(cls))
            }

            commandCollection[command] = {
                cls : cls, 
                command : funcBindMap.get(func)!
            }
            moduleTreeCommandList.push(command)
        }
    }

    private deleteModulesCommands(module : string) {
        const copyCommands = cloneDeepWith(this.commands, val => {
            if (isCommandObj(val)) return val
        })
        
        const moduleTree : ModuleCommands | undefined = this.moduleCommandTree[module]
        
        if ( moduleTree === undefined ) return copyCommands

        for (const commands of moduleTree.commands) {
            delete copyCommands[commands]
        }

        for (const [prefix, child] of Object.entries(moduleTree.subcommands)) {
            const childCommandObj = copyCommands[prefix]

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

        for (const check of subcommand.check) { 
            delete copyCommands.check[check]
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

    private reloadIntervals(intervalsMapObj : IntervalEvents, file : string, intervalModule : ModuleInterval, globals : Globals) { 

        if (intervalsMapObj[file] === undefined)
            intervalsMapObj[file] = {}

        const intervalsMap = intervalsMapObj[file]

        for (const [key, {func, interval, cls}] of Object.entries(intervalModule)) {
            // new key!
            if (!(key in intervalsMap)) {
                intervalsMap[key] = new IntervalHandler(cls, func, interval, globals)
            } else if (key in intervalsMap) { 
                intervalsMap[key].reload(func, interval)
            }
        }

        // for keys that dont exist: 
        this.unloadIntervals( 
            Object.keys(intervalsMap).filter(x => !intervalModule.hasOwnProperty(x))
            .reduce(
                (res, key) => (res[key] = intervalsMap[key], res), 
                {} as IntervalEvents[number]
            )
        ) 
    }

    private unloadIntervals(intervalsMap : IntervalEvents[number]) { 
        for (const [key, val] of Object.entries(intervalsMap)) {
            val.stop()
            delete intervalsMap[key]
        };
    }

}

export function getFunctionFromCls(cls : Class, funcName : string) : Function | undefined { 
    return cls[funcName as keyof Class] || cls.prototype?.[funcName]
}

export function isCommandObj(val: any): val is Commands {
    if (typeof val !== 'object') return false

    const checks: Record<keyof Commands, boolean> = {
      cls: 'cls' in val,
      command: typeof val.command === 'function',
    };
  
    return Object.values(checks).every(Boolean);
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

// https://stackoverflow.com/a/43197340
function isClass(obj: any): boolean {
    const isCtorClass = obj.constructor && obj.constructor.toString().substring(0, 5) === 'class';
    if (obj.prototype === undefined) {
      return isCtorClass;
    }
    const isPrototypeCtorClass = obj.prototype.constructor 
      && obj.prototype.constructor.toString 
      && obj.prototype.constructor.toString().substring(0, 5) === 'class';
    return isCtorClass || isPrototypeCtorClass;
  }