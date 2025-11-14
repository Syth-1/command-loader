import { 
    standardBooleanTransformer, 
    standardNumberTransformer, 
    standardStringTransformer, 
    type BaseTransformer 
} from "./internals";

export interface TransformerFunction {
    name : string,
    func: BaseTransformer<any>['handleConstraint']
}

export interface TransformerRegistry {
    [key: string]: TransformerFunction
}

const baseRegistry : TransformerRegistry = {
    String : { name : "Text", func : standardStringTransformer },
    Number : { name : "Number", func : standardNumberTransformer },
    Boolean : { name : "True/False", func : standardBooleanTransformer }
}

export const getBaseTransformer = () => { return {...baseRegistry} }