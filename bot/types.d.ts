

interface Commands { 
    [key: string] : (CommandFunction | {
        [key: string] : CommandFunction
    })
}

type CommandObj = { [key: string] : CommandFunction }

type CommandFunction = (ctx : Context, ...args : unknown) => any

interface Context { 
    msg : string
    content : string
    moduleLoader : ModuleLoader

    methodName : string
    className  : string
}

type Complete<T> = {
    [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : (T[P] | undefined);
}