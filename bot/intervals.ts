

export class IntervalHandler {
    lastRefresh = Date.now();
    abortController = new ReusableAbortController()


    constructor(private cls : Class, public func : IntervalFunction, private interval : number, private globals : Globals) {
        func(globals)
        this.reload(func, interval)
    }

    reload(func : IntervalFunction, interval : number) { 
        this.interval = interval
        this.abortController.abortAndReset()
        this.func = func

        const delay = (Date.now() + this.interval) - this.lastRefresh

        setAbortableTimeout(() => {
            this.lastRefresh = Date.now()
             this.func(this.globals)

            setAbortableInterval(() => { 
                this.lastRefresh = Date.now()
                this.func(this.globals)
            }, this.interval, this.abortController.signal)

        }, delay, this.abortController.signal);
    }

    stop() { 
        this.abortController.abortAndReset()
    }

    private execute() { 
        this.globals.commandProcessor.tryExecuteFunction(
            this.cls, 
            this.func,
            this.globals
        )
    }
}

export class ReusableAbortController {
	private controller = new AbortController();
	get signal(): AbortSignal {
		return this.controller.signal;
	}

	abortAndReset(reason?: any): void {
		this.controller.abort(reason);
		this.controller = new AbortController();
	}
}

function setAbortableTimeout( callback: (args: void) => void, delayInMilliseconds : number, signal : AbortSignal ) {
    const eventController = new AbortController()
    signal?.addEventListener( "abort", handleAbort, { signal : eventController.signal } );

    var internalTimer = setTimeout( internalCallback, delayInMilliseconds );

    function internalCallback() {
        eventController.abort()
        callback();
    }

    function handleAbort() {
        eventController.abort()
        clearTimeout( internalTimer );
    }
}

function setAbortableInterval( callback: (args: void) => void, delayInMilliseconds : number, signal : AbortSignal ) {
    const eventController = new AbortController()
    signal?.addEventListener( "abort", handleAbort, { signal: eventController.signal } );

    var internalInterval = setInterval( callback, delayInMilliseconds );

    function handleAbort() {
        eventController.abort()
        clearInterval( internalInterval );
    }
}
