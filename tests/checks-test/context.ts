
import { Context as TestContext} from '@/test-context';
import type Future from '@/utils/future';

export type TestVals = { 
    runs : number
}

export class Context extends TestContext { 
    testVals : TestVals 

    constructor(future : InstanceType<typeof Future>, testVals : TestVals) { 
        super(future)
        this.testVals = testVals
    }
}