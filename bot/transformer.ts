import { CommandError } from './internals'
import type { StringParser } from "./internals";

export interface BaseTransformer<T> {
    handleConstraint(ctx : Context, stringParser : StringParser) : T
}

export interface stringTransformer { 
    restOfString : boolean
    lowerCase    : boolean
    quotedString : boolean
}

export class StringTransformer implements BaseTransformer<string>, Complete<stringTransformer> {

    restOfString : boolean
    quotedString : boolean
    lowerCase    : boolean

    constructor(restOfString : boolean = false, lowerCase = false, quotedString = true,) {
        this.restOfString = restOfString
        this.quotedString = quotedString
        this.lowerCase = lowerCase
    }

    handleConstraint(ctx : Context, stringParser : StringParser) { 
        let arg = '';

        if (this.restOfString) {
            arg = stringParser.getRestOfString();
        } else {
            arg = stringParser.getArg(this.quotedString);
        }

        if (this.lowerCase) 
            arg = arg.toLowerCase()

        return arg; 
    }
}

export interface numberTransformer { 
    min? : number
    max? : number
}

export class NumberTransformer implements BaseTransformer<number>, Complete<numberTransformer> {

    min : number | undefined
    max : number | undefined

    constructor(min? : number, max? : number) {
        this.min = min
        this.max = max
    }

    handleConstraint(ctx: Context, stringParser: StringParser) {
        let number = parseInt(
            stringParser.getArg(),
            10
        )

        if (isNaN(number)) {
            throw new CommandError.ParseError("Invalid Number Entered!")
        }

        if (this.min) {
            number = Math.max(number, this.min)
        }

        if (this.max) {
            number = Math.min(number, this.max)
        }

        return number
    }
}

export class BooleanTransformer implements BaseTransformer<boolean> {
    handleConstraint(ctx: Context, stringParser: StringParser): boolean {
        const arg = stringParser.getArg(false).toLowerCase()

        if (['yes', 'y', 'true', 't', '1', 'enable', 'on'].includes(arg)) 
            return true

        if (['no', 'n', 'false', 'f', '0', 'disable', 'off'].includes(arg))
            return false

        throw new CommandError.ParseError("Invalid True/False Value!")
    }
}

export class Transformer<T> implements BaseTransformer<T> {

    constructor(func: (ctx: Context, stringParser: StringParser) => T) {
        this.handleConstraint = func;
    }

    handleConstraint: (ctx: Context, stringParser: StringParser) => T;
}

const stringTransformerInstance = new StringTransformer();
const numberTransformerInstance = new NumberTransformer();
const booleanTransformerInstance = new BooleanTransformer();

export const standardStringTransformer  = stringTransformerInstance.handleConstraint.bind(stringTransformerInstance)
export const standardNumberTransformer  = numberTransformerInstance.handleConstraint.bind(numberTransformerInstance)
export const standardBooleanTransformer = booleanTransformerInstance.handleConstraint.bind(booleanTransformerInstance)