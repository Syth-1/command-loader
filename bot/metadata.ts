
export class ArgsMetadata {
    private static readonly ArgsMetadataKey = '__argsNames__'

    public static getParamMetadata(cls : any, methodName : string) : Array<reflectTypes> {

        if ('prototype' in cls) cls = cls.prototype

        const types =  Reflect.getMetadata(
            "design:paramtypes",
            cls, 
            methodName
        )

        return types.map((type : { name : string }) => type.name );
    }

    public static getArgsMetadata(cls : any, methodName : string) : Array<string> | undefined {

        if ('prototype' in cls) cls = cls.prototype

        return Reflect.getMetadata(
            ArgsMetadata.ArgsMetadataKey, 
            cls, 
            methodName
        )
    }

    public static setArgsMetadata(cls : any, methodName : string) { 
        Reflect.defineMetadata(
            ArgsMetadata.ArgsMetadataKey, 
            ArgsMetadata.getArgName(cls[methodName]), 
            cls,
            methodName
        )
    }

    private static getArgName(func : (args : any) => any) {
        const RE_STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
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

export class DescMetadata {
    private static readonly DescMetadataKey = '__CommandDescription__'


    public static getDescMetadata(cls : any, methodName : string) : string {
        
        const description = Reflect.getMetadata(
            DescMetadata.DescMetadataKey, 
            cls.prototype, 
            methodName
        )

        if (description) return description
            
        return Reflect.getMetadata(
            DescMetadata.DescMetadataKey, 
            cls, 
        )
    }

    public static setDescMetadata(description : string, cls : any, methodName : string | undefined) { 
        if (methodName)
            Reflect.defineMetadata(
                DescMetadata.DescMetadataKey, 
                description, 
                cls,
                methodName
            )
        else Reflect.defineMetadata(
            DescMetadata.DescMetadataKey, 
            description, 
            cls,
        )
    }
}