import 'reflect-metadata'
import { isArray } from "lodash";
import { 
    CommandsBuffer, 
    Transformer,
    StringParser,
    CommandError,

    standardStringTransformer,
    standardNumberTransformer,
    standardBooleanTransformer,

    parentVarName,
    commandBufferVarName,
    EventNames,

    type BaseTransformer,
    type parent,
    BaseGlobals,
    BaseContext
} from "./internals";


interface commandName { 
    name? : string, 
    alias? : NonEmptyArray<string>
}

type parentArg = AtLeastOne<parent>

type reflectTypes = "Number" | "Boolean" | "String" | "Object"

type Class = { new(...args: any[]): any; }; 

export class Commands {

    static command(commandInfo? : commandName | string, ...rest : Array<undefined | null | BaseTransformer<any>>) {
        return (methodClass : any, methodName : string, descriptor: PropertyDescriptor) => {

            let commandName : string
            let alias : Array<string> = []

            if (commandInfo === undefined) {
                commandName = methodName;
            } else if (typeof commandInfo === "string") {
                commandName = commandInfo
            } else {
                commandName = commandInfo.name || methodName
                alias = commandInfo.alias || []
            }

            const types = Reflect.getMetadata("design:paramtypes", methodClass, methodName);
            const argsInfo : Array<reflectTypes> = types.map((type : { name : string }) => type.name );
            
            const ctxArg = argsInfo.shift() // first item is for context!

            if (ctxArg != 'Object' && ctxArg != "Context" as any) {
                throw Error(`Invalid Argument Found: first argument for '${methodName}' does not appear to be for Context!`)
            }

            const childFunction : CommandFunction = descriptor.value;

            descriptor.value = function (ctx : Context, args : string) {
                
                ctx.className = methodClass
                ctx.methodName = methodName

                const validatedArgs = validateArgs(ctx, args, argsInfo, rest, childFunction.length - 1)

                if (validatedArgs === undefined) return; 

                const retVal = childFunction.apply(methodClass.prototype || methodClass, [ctx, ...validatedArgs]);

                return retVal
            }

            const parent : string | undefined = Object.getOwnPropertyDescriptor(methodClass, parentVarName)?.value

            CommandsBuffer.addCommandBuffer([commandName, ...alias], methodClass, descriptor.value)
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
}

export class Listener {
    static message(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        CommandsBuffer.addEvent(methodClass, EventNames.onMessage, descriptor.value)
    }

    static command(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        CommandsBuffer.addEvent(methodClass, EventNames.onCommand, descriptor.value)
    }
    
    static precheck(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        CommandsBuffer.addEvent(methodClass, EventNames.preCheck, descriptor.value)
    }

    static error(methodClass : any, methodName : string, descriptor: PropertyDescriptor) { 
        CommandsBuffer.addEvent(methodClass, EventNames.error, descriptor.value)
    }

    static custom(eventName? : string) {
        return (methodClass : any, methodName : string, descriptor: PropertyDescriptor) => {
            CommandsBuffer.addEvent(methodClass, eventName || methodName, descriptor.value)
        }
    }
}

export interface Module {
    onLoad?(globals : BaseGlobals) : Promise<void>
    onUnload?(globals : BaseGlobals) : Promise<void>
    onError?(error : Error, ctx? : BaseContext) : Promise<void>
    onCommand?(ctx : BaseContext) : Promise<void | string | boolean>
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
                throw error // throw error upstream to error handler!
            }
        }
    }

    if (convertedArgs.length < argsRequired) {
        throw new CommandError.ParseError(
            `Invalid Number Of Arguments:\nExpected ${argsRequired}, Recived ${convertedArgs.length}`
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
            throw new CommandError.ObjectArgError(`Cant handle type ${argInfo} {${ctx.className}-${ctx.methodName} arg: ${index}} - No transformer specified!`)
        }
    }

    return transformer(ctx, stringParser)
}