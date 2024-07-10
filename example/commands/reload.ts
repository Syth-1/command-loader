import { Commands } from "@/bot/commands"
import { StringTransformer } from "@/bot/transformer"
import { Context, getModuleFiles, moduleFolder } from "@/context"
import path from 'path'

export class Reload { 
    @Commands.command('reload', new StringTransformer(true))
    async reload(ctx : Context, file : string) {

        if (file === "all") {
            return reloadAll(ctx)
        }

        file = file.replace(' ', '-') + ".ts"
        
        console.log(`reloading module: ${file}`)

        ctx.moduleLoader.scheduleEvent(
            'reload',
            `@/${path.join(moduleFolder, file)}`,
            (err) => reloadCallback(ctx, file, err)
        )
    }
}

async function reloadAll(ctx : Context) { 
    console.log("reloading all modules!")

    ctx.moduleLoader.purgeImportCache()

    const files = await getModuleFiles()

    const removeFiles = Object.keys(ctx.moduleLoader.moduleCommandTree).filter(x => files.indexOf(x) === -1)
    const reloadFiles = files.filter(x => ctx.moduleLoader.moduleCommandTree.hasOwnProperty(x))
    const addFiles = files.filter(x => !(ctx.moduleLoader.moduleCommandTree.hasOwnProperty(x)))

    const errors : Array<Error> = []

    await ctx.moduleLoader.scheduleEvent(
        'unload',
        removeFiles,
        (err) => errors.push(...err)
    )

    await ctx.moduleLoader.scheduleEvent(
        'reload',
        [...reloadFiles, ...addFiles],
        (err) => reloadCallback(ctx, 'all', [...errors, ...err])
    )
}

function reloadCallback(ctx : Context, file : string, errors : Array<Error>) {
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