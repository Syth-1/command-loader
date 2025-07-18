// Use this class to correct the prototype chain.
export class BaseError extends Error {
    constructor(message?: string) {
        super(message);
         this.name = this.constructor.name;
         Object.setPrototypeOf(this, new.target.prototype);
    }
}

export const useCache = true

export namespace CommandError {

    export class ObjectArgError extends BaseError { }

    export class EndOfArgs extends BaseError { }

    export class ParseError extends BaseError {
        arg! : number
    }

    export class NumberBoundsError extends ParseError { 
        constructor(public type : 'min' | 'max', public expected : number, public gotten : number ) { 
            const text = type === 'min' ? 'smaller' : 'greater'
            const message = `The number must be ${text} than or equal to ${expected}, but received ${gotten}.`

            super(message)
        }
    }

    export class InvalidArgsCount extends BaseError { 
        constructor(public recivied : number, public required : number) { 
            super(`Invalid Number Of Arguments:\nExpected ${required}, Recived ${recivied}`)
        }
    }
}