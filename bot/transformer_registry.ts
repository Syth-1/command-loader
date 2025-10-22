import { standardBooleanTransformer, standardNumberTransformer, standardStringTransformer, type BaseTransformer } from "./internals";

export interface TrasnformerRegistry {
    [key: string]: {
        name : string,
        func: BaseTransformer<any>['handleConstraint']
    }
}

const baseRegistry : TrasnformerRegistry = {
    String : { name : "string", func : standardStringTransformer },
    Number : { name : "number", func : standardNumberTransformer },
    Boolean : { name : "boolean", func : standardBooleanTransformer }
}

export const getBaseTransformer = () => { return {...baseRegistry} }