import 'reflect-metadata'
import { isArray } from "lodash";
import { 
    buffers, 
    StringParser,
    CommandError,

    standardStringTransformer,
    standardNumberTransformer,
    standardBooleanTransformer,

    parentVarName,
    EventNames,

    type BaseTransformer,
    type parent,
    BaseGlobals,
    BaseContext,
    getFunctionFromCls,

    ArgsMetadata,
    DescMetadata
} from "./internals";


interface commandName { 
    name? : string, 
    alias? : NonEmptyArray<string>
}

type parentArg = AtLeastOne<parent>

type Class = { new(...args: any[]): any; }; 

export class Commands {

    static command(commandInfo? : commandName | string | null, ...rest : Array<undefined | null | BaseTransformer<any>>) {
        return (methodClass : any, methodName : string, descriptor: PropertyDescriptor) => {

            let commandName : string
            let alias : Array<string> = []

            if (commandInfo === undefined || commandInfo === null) {
                commandName = methodName;
            } else if (typeof commandInfo === "string") {
                commandName = commandInfo
            } else {
                commandName = commandInfo.name || methodName
                alias = commandInfo.alias || []
            }

            const argsInfo = ArgsMetadata.getParamMetadata(
                methodClass,
                methodName
            )
            
            const ctxArg = argsInfo.shift() // first item is for context!

            if (ctxArg != 'Object' && ctxArg != "Context" as any) {
                throw Error(`Invalid Argument Found: first argument for '${methodName}' does not appear to be for Context!`)
            }

            const childFunction : CommandFunction = descriptor.value;

            descriptor.value = async function (ctx : Context, args : string) {
                const validatedArgs = validateArgs(ctx, args, argsInfo, rest, childFunction.length - 1)

                if (validatedArgs === undefined) return; 

                // onCommandExecute
                const check = await ctx.globals.commandProcessor.callEvent(EventNames.onExecute, ctx)

                if (typeof check === 'boolean' && !check) return
                
                const localCheckFunc = getFunctionFromCls(methodClass, EventNames.onExecute)

                if (localCheckFunc != undefined) {
                    const localCheck = await ctx.globals.commandProcessor.tryExecuteCommand(methodClass, localCheckFunc, ctx)
        
                    if (typeof localCheck === 'boolean' && !localCheck)  return
                }

                return childFunction.apply(methodClass.prototype || methodClass, [ctx, ...validatedArgs]);
            }

            ArgsMetadata.setArgsMetadata(
                methodClass, 
                methodName
            )

            // add back the original method name!
            Object.defineProperty(descriptor.value, "name", { value: methodName });


            buffers.CommandBuffer.add([commandName, ...alias], methodClass, descriptor.value)
        }
    }

    static parent(parent? :  string | parentArg | NonEmptyArray<string>): Function {
        return function(targetClass: Class): any {

            const parentVar = (() => {

                if (typeof parent === "object") {
                    if (isArray(parent)) {
                        return parent
                    }

                    const parentVar = []

                    if (parent.parent) parentVar.push(...parent.parent)
                    if (parent.name) parentVar.push(parent.name)

                    return parentVar
                } else {
                    return [parent || targetClass.name]
                }
                
            })().map((str, index) => {
                const trimmedString = str.trim().toLocaleLowerCase()

                if (trimmedString === "" || /\s/.test(trimmedString)) throw Error(`Invalid parent input : '${str}' - full parent var: '${parent}'. error occured for class: '${targetClass.name}' for index ${index}`)

                return trimmedString
            })

            Object.defineProperty(targetClass, parentVarName, { value: parentVar })
            return targetClass
        }
    }

    static check(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        buffers.CheckBuffer.add(methodClass, descriptor.value)
    }

    static interval(interval : number) {
        return (methodClass : any, methodName : string, descriptor : PropertyDescriptor) => { 
            buffers.IntervalBuffer.add(methodClass, descriptor.value, interval)
        }
    }


    static description(description : string) {
        return (methodClass : any, methodName : string | undefined = undefined) => {
            DescMetadata.setDescMetadata(
                description,
                methodClass, 
                methodName
            )
        }
    }
}

export class Listener {
    static precheck(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        buffers.EventBuffer.add(methodClass, EventNames.preCheck, descriptor.value)
    }

    static message(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        buffers.EventBuffer.add(methodClass, EventNames.onMessage, descriptor.value)
    }

    static command(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        buffers.EventBuffer.add(methodClass, EventNames.onCommand, descriptor.value)
    }

    static execute(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        buffers.EventBuffer.add(methodClass, EventNames.onExecute, descriptor.value)
    }

    static error(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        buffers.EventBuffer.add(methodClass, EventNames.error, descriptor.value)
    }

    static custom(eventName? : string) {
        return (methodClass : any, methodName : string, descriptor: PropertyDescriptor) => {
            buffers.EventBuffer.add(methodClass, eventName || methodName, descriptor.value)
        }
    }
}

export interface Module {
    onLoad?(globals : BaseGlobals) : Promise<void>
    onUnload?(globals : BaseGlobals) : Promise<void>
    onError? : errorFunction
    onCommand?(ctx : BaseContext) : Promise<void | string | boolean>
    onMessage?(ctx : BaseContext) : Promise<void | string | boolean>
    onExecute?(ctx : BaseContext) : Promise<void | string | boolean>
}

function validateArgs(ctx : Context, args : string, argsInfo : Array<reflectTypes>, constraints : Array<undefined | null | BaseTransformer<any>>, argsRequired : number) {

    if (argsRequired < 0) { 
        throw Error("Invalid Number of Arguments, is Argument for CTX provided?")
    }

    const stringParser = new StringParser(args) 
    const convertedArgs : Array<any> = []

    for (const [index, argInfo] of argsInfo.entries()) {
        const constraint = constraints[index] 

        try { 
            convertedArgs.push(
                checkArgs(ctx, stringParser, argInfo, constraint, index)
            )
        } catch (error) { 

            if (error instanceof CommandError.EndOfArgs) {
                break
            } else if (error instanceof CommandError.ObjectArgError) {
                console.log(error.message) // code error
                return undefined
            } else {
                if (error instanceof CommandError.ParseError)
                    error.arg = index

                throw error // throw error upstream to error handler!
            }
        }
    }

    if (convertedArgs.length < argsRequired) {
        throw new CommandError.InvalidArgsCount(
            convertedArgs.length, 
            argsRequired
        )
    }

    return convertedArgs
}


function checkArgs(ctx : Context, stringParser : StringParser, argInfo : reflectTypes, constraint : BaseTransformer<any> | null | undefined, index : number) { 
    
    if (constraint !== null && typeof constraint === 'object' && constraint['handleConstraint'] !== undefined) {
        return constraint.handleConstraint(ctx, stringParser)
    }

    let transformer : (ctx: Context, stringParser: StringParser) => any;

    switch (argInfo) {
        case "String": { 
            transformer = standardStringTransformer
            break
        }

        case "Number": {
            transformer = standardNumberTransformer
            break; 
        }

        case "Boolean": {
            transformer = standardBooleanTransformer
            break;
        }

        default : { // we check if object has transformer and handle it accordingly first!
            throw new CommandError.ObjectArgError(`Cant handle type ${argInfo} {${ctx.commandObj.cls.name}-${ctx.commandObj.command.name} arg: ${index}} - No transformer specified!`)
        }
    }

    return transformer(ctx, stringParser)
}