
export class ArgsMetadata {
    private static readonly ArgsMetadataKey = '__argsNames__'

    public static setArgsMetadata(target : Object, func : (args : any) => any) { 
        Reflect.defineMetadata(
            ArgsMetadata.ArgsMetadataKey, 
            ArgsMetadata.getArgName(func), 
            target
        )
    }

    public static getArgsMetadata(target : Object) : Array<string> | undefined { 
        return Reflect.getMetadata(
            ArgsMetadata.ArgsMetadataKey, 
            target
        )
    }

    private static getArgName(func : (args : any) => any) {
        const RE_STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const RE_ARGUMENT_NAMES = /[,]|\s*(?:\.\.\.)?([A-Za-z_$][0-9A-Za-z_$]*)(?:\s)?.*?(?:,|$)/gm;

        const strippedFunc = func.toString().replace(RE_STRIP_COMMENTS, '');

        const openParenIndex = strippedFunc.indexOf('(') + 1
        const closeParenIndex = strippedFunc.indexOf(')')

        const result : Array<string> | null = Array.from((
            strippedFunc.slice(
                openParenIndex,
                closeParenIndex
            ).matchAll(RE_ARGUMENT_NAMES)
        ),
            match => match[1]
        )

        if (result === null) return []
        
        return result;
    }
}