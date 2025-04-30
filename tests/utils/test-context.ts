import { BaseContext } from "../../bot/process_command"
import Future from "../../bot/utils/future"

export class Context extends BaseContext {
    future : InstanceType<typeof Future>

    constructor (future : InstanceType<typeof Future>) {
        super()
        this.future = future
    }
}