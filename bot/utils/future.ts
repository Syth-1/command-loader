export enum FutureState { 
    PENDING,
    CANCELLED, 
    FINISHED
}

export default class Future<T> {
    promise : Promise<T>
    reject! :  (reason?: any) => void
    resolve! : (value: T | PromiseLike<T>) => void
    state : FutureState = FutureState.PENDING

    constructor() { 
        this.promise = new Promise((resolve, reject) => {
            this.resolve = ((value : T | PromiseLike<T>) => {
                if (this.done()) return; this.state = FutureState.FINISHED; resolve(value);
            });
            this.reject = ((reason : any) => {
                if (this.done()) return; this.state=FutureState.CANCELLED; reject(reason);
            });
        });
    }

    cancelled() { 
        return this.state === FutureState.CANCELLED; 
    }

    done() { 
        return this.state !== FutureState.PENDING;
    }
}