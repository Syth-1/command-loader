import { 
    standardBooleanTransformer, 
    standardNumberTransformer, 
    standardStringTransformer, 
    type BaseTransformer 
} from "./internals";

export interface TransformerRegistry {
    [key: string]: {
        name : string,
        func: BaseTransformer<any>['handleConstraint']
    }
}

const baseRegistry : TransformerRegistry = {
    String : { name : "Text", func : standardStringTransformer },
    Number : { name : "Number", func : standardNumberTransformer },
    Boolean : { name : "True/False", func : standardBooleanTransformer }
}

export const getBaseTransformer = () => { return {...baseRegistry} }