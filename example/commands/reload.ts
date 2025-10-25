import { Commands } from "@/bot/commands"
import { StringTransformer } from "@/bot/transformer"
import { Context, getModuleFiles, moduleFolder } from "@/context"
import path from 'path'

// this class is an example of how to implament reloading functionality
// reloading functionality is built in, however the implamentation details of how you chose to do so is upto you
// import cache will be cleared when ever you reload, be mindful of using static types, hence why to use globals!

// this can be a further issue if you do typeof checks, as the import cache is removed, a class refrence may not equal
// to the same class, hence a typeof check will fail, even tho in reality they maybe the same class.

// one getaround which is not ideal but works is using the class.name, to check if the names match

export class Reload { 
    @Commands.command('reload', new StringTransformer(true))
    async reload(ctx : Context, file : string) {

        if (file === "all") {
            return reloadAll(ctx)
        }

        file = file.replace(' ', '-') + ".ts"
        
        console.log(`reloading module: ${file}`)

        const error = await ctx.globals.moduleLoader.reloadModule(
            `@/${path.join(moduleFolder, file)}`,
        )
        
        reloadResult(ctx, file, error)
    }
}

async function reloadAll(ctx : Context) { 
    console.log("reloading all modules!")

    const files = await getModuleFiles()

    const removeFiles = Object.keys(ctx.globals.moduleLoader.moduleCommandTree).filter(x => files.indexOf(x) === -1)
    const reloadFiles = files.filter(x => ctx.globals.moduleLoader.moduleCommandTree.hasOwnProperty(x))
    const addFiles = files.filter(x => !(ctx.globals.moduleLoader.moduleCommandTree.hasOwnProperty(x)))

    const errors = await ctx.globals.moduleLoader.handleReload({
        addFiles, 
        removeFiles, 
        reloadFiles
    })

    reloadResult(ctx, 'all', errors)
}

function reloadResult(ctx : Context, file : string, errors : Array<Error>) {
    const fileDescription = file === 'all' ? 'all modules' : `module: ${file}`

    if (errors.length === 0) {
        console.log('Successfully reloaded ' + fileDescription)
        return
    } 

    let errorMessage = `An error occured while reloading ${fileDescription}, here are the error messages:`

    for (const [i, err] of errors.entries()) {
        errorMessage += `\n${i + 1}) ${err.message}`
    }

    console.log(errorMessage)
}