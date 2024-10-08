// Use this class to correct the prototype chain.
export class BaseError extends Error {
    constructor(message?: string) {
        super(message);
         this.name = this.constructor.name;
         Object.setPrototypeOf(this, new.target.prototype);
    }
}

export namespace CommandError {

    export class ObjectArgError extends BaseError { }

    export class EndOfArgs extends BaseError { }

    export class ParseError extends BaseError { }
}