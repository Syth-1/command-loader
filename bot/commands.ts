import { 
    CommandsBuffer, 
    Transformer,
    StringParser,
    CommandError,

    standardStringTransformer,
    standardNumberTransformer,
    standardBooleanTransformer,

    type BaseTransformer,
} from "./internals";


interface commandName { 
    name? : string, 
    alias? : Array<string>
}

type reflectTypes = "Number" | "Boolean" | "String" | "Object"

type Class = { new(...args: any[]): any; }; 

const parentVarName : string = '__parent__'

export class Commands {

    static command(commandInfo? : commandName | string, ...rest : Array<BaseTransformer<any>>) {
        return (methodClass : any, methodName : string, descriptor: PropertyDescriptor) => {

            let commandName : string
            let alias : Array<string> = []

            if (commandInfo == undefined) {
                commandName = methodName;
            } else if (typeof commandInfo == "string") {
                commandName = commandInfo
            } else {
                commandName = commandInfo.name || methodName
                alias = commandInfo.alias || []
            }

            const types = Reflect.getMetadata("design:paramtypes", methodClass, methodName);
            const argsInfo : Array<reflectTypes> = types.map((type : { name : string }) => type.name );
            
            const ctxArg = argsInfo.shift() // first item is for context!

            if (ctxArg != 'Object') {
                throw Error(`Invalid Argument Found: first argument for '${methodName}' does not appear to be for Context!`)
            }

            const childFunction : CommandFunction = descriptor.value;

            descriptor.value = function (ctx : Context, args : string) {
                
                ctx.className = methodClass
                ctx.methodName = methodName

                const validatedArgs = validateArgs(ctx, args, argsInfo, rest, childFunction.length - 1)

                if (validatedArgs == undefined) return; 

                const retVal = childFunction.apply(this, [ctx, ...validatedArgs]);

                return retVal
            }

            const parent : string | undefined = Object.getOwnPropertyDescriptor(methodClass, parentVarName)?.value
            
            console.log(parent)

            CommandsBuffer.addCommandBuffer([commandName, ...alias], parent, descriptor.value)
        }
    }

    static parent(parent? : string): Function {
        return function(targetClass: Class): any {
            console.log(targetClass.name)
            Object.defineProperty(targetClass, parentVarName, { value: parent || targetClass.name })
            return targetClass
        }
    }
}

function validateArgs(ctx : Context, args : string, argsInfo : Array<reflectTypes>, constraints : Array<null | BaseTransformer<any>>, argsRequired : number) {

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


function checkArgs(ctx : Context, stringParser : StringParser, argInfo : reflectTypes, constraint : BaseTransformer<any> | null, index : number) { 
    
    if (constraint instanceof Transformer) {
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