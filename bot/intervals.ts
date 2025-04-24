export type UtcTime = {
    hours: number;
    minutes: number;
    seconds?: number;
};

export class IntervalHandler {
    lastRefresh = Date.now();
    abortController = new ReusableAbortController()
    private interval!: number
    private utcTime?: UtcTime;


    constructor(private cls: Class, public func: IntervalFunction, interval: number | string, private globals: Globals) {
        this.reload(func, interval)
    }

    reload(func: IntervalFunction, interval: number | string) {
        this.abortController.abortAndReset()
        this.func = func

        if (typeof interval === 'number') {
            return this.schedule(interval)
        }

        const parts = interval.split(':').map(Number)

        this.utcTime = {
            hours: parts[0],
            minutes: parts[1],
            seconds: parts[2] ?? 0,
        }

        this.scheduleNextUtcExecution();
    }

    stop() {
        this.abortController.abortAndReset()
    }

    private schedule(interval: number) {
        this.interval = interval

        const delay = (this.lastRefresh + this.interval) - Date.now()

        setAbortableTimeout(() => {
            this.lastRefresh = Date.now()
            this.execute()

            setAbortableInterval(() => {
                this.lastRefresh = Date.now()
                this.execute()
            }, this.interval, this.abortController.signal)

        }, delay, this.abortController.signal);
    }

    private scheduleNextUtcExecution() {
        const nextExecutionTime = this.calculateNextUtcExecutionTime();
        const delay = nextExecutionTime.getTime() - Date.now();

        setAbortableTimeout(() => {
            this.lastRefresh = Date.now();
            this.execute();
            // Schedule the next day's execution
            this.scheduleNextUtcExecution();
        }, delay, this.abortController.signal);
    }

    private calculateNextUtcExecutionTime(): Date {
        if (!this.utcTime) {
            throw new Error("UTC time is not defined");
        }

        const now = new Date();
        const targetTime = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                this.utcTime.hours,
                this.utcTime.minutes,
                this.utcTime.seconds || 0
            )
        );

        // If the time has already passed today, schedule for tomorrow
        if (targetTime.getTime() <= now.getTime()) {
            targetTime.setUTCDate(targetTime.getUTCDate() + 1);
        }

        return targetTime;
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

function setAbortableTimeout(callback: (args: void) => void, delayInMilliseconds: number, signal: AbortSignal) {
    const eventController = new AbortController()
    signal?.addEventListener("abort", handleAbort, { signal: eventController.signal });

    var internalTimer = setTimeout(internalCallback, delayInMilliseconds);

    function internalCallback() {
        eventController.abort()
        callback();
    }

    function handleAbort() {
        eventController.abort()
        clearTimeout(internalTimer);
    }
}

function setAbortableInterval(callback: (args: void) => void, delayInMilliseconds: number, signal: AbortSignal) {
    const eventController = new AbortController()
    signal?.addEventListener("abort", handleAbort, { signal: eventController.signal });

    var internalInterval = setInterval(callback, delayInMilliseconds);

    function handleAbort() {
        eventController.abort()
        clearInterval(internalInterval);
    }
}
