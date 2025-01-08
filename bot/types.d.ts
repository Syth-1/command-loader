import type { ModuleLoader } from "./module_loader"

declare global {
    type CommandMap = { [key: string] : CommandFunction }

    interface CommandsCollection { 
        [key: string] : (Commands | NestedCommandObj)
    }

    type Commands = {
        cls : Class,
        command : CommandFunction
    }

    type CommandFunction = (ctx : Context, ...args : unknown) => any

    type NestedCommandObj = {
        onCommandNotFound? : {
            cls : Class,
            command : (commandName : string) => void,
        }
        onDefaultCommand? : {
            cls : Class, 
            command : (ctx : Context) => any
        },
        check : {
            [key: string] : {
                cls : Class,
                command : CommandFunction
            }
        }
        commands : CommandsCollection
    }

    type CommandBufferMap = Map<Class, CommandBufferObj>

    type CommandBufferObj = {
        commands : CommandMap,
        check : CommandMap
    }

    type Class = { new(...args: any[]): any; name : string};

    interface Context { 
        msg : string
        content : string

        methodName : string
        className  : string
        globals : Globals
    }

    interface Globals {
        prefix : string;
        moduleLoader : ModuleLoader
        callEvent : (...args: any[]) => any
    } 

    interface ModuleEvent {
        [key: string] : Array<Function>
    }

    interface ListenerEvents {
        [file: string] : ModuleEvent
    }

    type Complete<T> = {
        [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : (T[P] | undefined);
    }

    type AtLeastOne<T, K extends keyof T = keyof T> = 
        K extends keyof T 
        ? { [P in K]-?: T[K] } & Partial<T> 
        : never;

    type NonEmptyArray<T> = [T, ...Array<T>]

    type KeysOfType<T, Type> = {
        [K in keyof T]: T[K] extends type ? K : never;
    }[keyof T];

    type MergeTwo<A, B> = {
        [K in keyof A | keyof B]: K extends keyof A ? A[K] : K extends keyof B ? B[K] : never;
    };
    
    // Recursive type to merge an array of interfaces
    type MergeAll<T extends any[]> = T extends [infer Head, ...infer Tail]
    ? MergeTwo<Head, MergeAll<Tail>>
    : {};

    type Converter<T, FromType, ToType> = {
        [K in keyof T]: T[K] extends FromType ? ToType : T[K];
    };
}
export {}