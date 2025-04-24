import { getFuncName } from "./utils/func-name";

export class ArgsMetadata {
    private static readonly ArgsMetadataKey = Symbol('__argsNames__')

    public static getParamMetadata(cls : any, methodName : string) : Array<reflectTypes> {
        methodName = getFuncName(methodName)
        if ('prototype' in cls) cls = cls.prototype

        const types =  Reflect.getMetadata(
            "design:paramtypes",
            cls, 
            methodName
        )

        return types.map((type : { name : string }) => type.name );
    }

    public static getArgsMetadata(cls : any, methodName : string) : Array<string> | undefined {
        methodName = getFuncName(methodName)
        if ('prototype' in cls) cls = cls.prototype

        return Reflect.getMetadata(
            ArgsMetadata.ArgsMetadataKey, 
            cls, 
            methodName
        )
    }

    public static setArgsMetadata(cls : any, methodName : string) { 
        methodName = getFuncName(methodName)

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
    private static readonly DescMetadataKey = Symbol('__CommandDescription__')


    public static getDescMetadata(cls : any, methodName : string) : string | undefined {
        methodName = getFuncName(methodName)

        const description = Reflect.getMetadata(
            DescMetadata.DescMetadataKey, 
            cls, 
            methodName
        )

        if (description) return description
            
        return this.getDescMetadataFromCls(cls)
    }

    public static getDescMetadataFromCls(cls : any) : string | undefined {
        return Reflect.getMetadata(
            DescMetadata.DescMetadataKey, 
            cls, 
        )
    }

    public static setDescMetadata(description : string, cls : any, methodName : string | undefined) { 
        methodName = getFuncName(methodName)

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