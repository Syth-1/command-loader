import type { ModuleLoader } from "./bot/module_loader"
import { BaseContext } from "./bot/process_command"

export class Context extends BaseContext {
    moduleLoader: ModuleLoader

    constructor(moduleLoader : ModuleLoader) {
        super()
        this.moduleLoader = moduleLoader
    }
} 