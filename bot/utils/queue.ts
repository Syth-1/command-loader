// following python asyncio queue:
// https://github.com/python/cpython/blob/main/Lib/asyncio/queues.py

import LinkedList from "./linked-list"
import Future from "./future"

class Lock {
    unlocked : boolean
    waiter : Future<any>

    constructor() {
        this.unlocked = false
        this.waiter = new Future()
    }

    set() { 
        this.unlocked = true
        this.waiter.resolve(0)
    }

    clear() { 
        
        if (this.unlocked) { 
            this.waiter = new Future()
        }

        this.unlocked = false;
    }

    async wait() { 
        await this.waiter.promise
    }
}

export default class Queue<T> { 
    #maxSize : number
    #getters : LinkedList<Future<any>>
    #putters : LinkedList<Future<any>>
    #unfinishedTasks : number
    #finished : Lock
    #queue : LinkedList<T>

    constructor(maxSize = 0) {
        this.#maxSize = maxSize;
        this.#getters = new LinkedList()
        this.#putters = new LinkedList()
        this.#unfinishedTasks = 0
        this.#finished = new Lock()
        this.#queue = new LinkedList<T>()
    }

    #get() { 
        return this.#queue.removeAt(0)
    }

    #put(item : T) {
        this.#queue.append(item)
    }

    #wakeupNext(waiters : LinkedList<Future<any>>) { 
        while (waiters.length) {
            let waiter = waiters.removeAt(0)
            if (waiter && !waiter.done()) {
                waiter.resolve(0)
                break;
            }
        }
    }

    qSize() { 
        return this.#queue.length; 
    }

    maxSize() { 
        return this.#maxSize;
    }

    empty() { 
        return !this.#queue.length;
    }
    
    full() { 
        if (this.#maxSize <= 0 ) {
            return false
        } else { 
            return this.qSize() >= this.#maxSize;
        }
    }

    async put(item : T) {
        while (this.full()) {
            let putter = new Future()
            this.#putters.append(putter); 
            try {
                await putter.promise
            } catch {
                putter.reject(); 
                this.#putters.remove(putter); 

                if (!this.full() && !putter.cancelled() ) {
                    this.#wakeupNext(this.#putters)
                }
            }
        }

        return this.putNoWait(item)
    }

    putNoWait(item : T) { 
        if (this.full()) {
            throw new Error("Queue Full!")
        }

        this.#put(item);
        this.#unfinishedTasks += 1; 
        this.#finished.clear(); 
        this.#wakeupNext(this.#getters)
    }

    async get() {
        while (this.empty()) { 
            let getter = new Future(); 
            this.#getters.append(getter); 

            try {
                await getter.promise; 
            } catch { 
                getter.reject(); 
                this.#getters.remove(getter); 

                if (!this.empty() && !getter.cancelled()) {
                    this.#wakeupNext(this.#getters);
                }
            }
        }
        return this.getNoWait()
    }

    getNoWait() { 
        if (this.empty()) {
            throw new Error("Queue Empty!")
        }

        let item = this.#get(); 
        this.#wakeupNext(this.#putters); 
        return item; 
    }

    taskDone() {
        if (this.#unfinishedTasks <= 0) {
            throw new Error("taskDone() called too many times!")
        }
        this.#unfinishedTasks -= 1; 
        if (this.#unfinishedTasks === 0) {
            this.#finished.set()
        }
    }

    async join() { 
        if (this.#unfinishedTasks > 0) { 
            await this.#finished.wait()
        }
    }
} 