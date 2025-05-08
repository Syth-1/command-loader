import { CommandProcessor } from '@/process_command'
import { getModuleFiles } from '@/file'
import { Context } from '@/test-context';
import { expect, test } from "bun:test";
import Future from '@/utils/future';
import { withTimeout } from '@/test-utils';
import { Globals } from './globals';

const prefix = ''
const moduleFolder = 'modules' // folder where command files are located


async function main() {

    const commandProcessor = new CommandProcessor(
        Context, // pass in Context class here, this is the class that will be instanced for every command
        Globals 
    )

    const loadingFilesFuture = new Future<boolean>

    await commandProcessor.moduleLoader.scheduleEvent(
        "load", 
        await getModuleFiles(__dirname, moduleFolder), 
        error => {
            if (error.length > 0)
                throw error
            else
                loadingFilesFuture.resolve(true)
        }
    )
    
    // wait for files to load!
    await withTimeout(loadingFilesFuture.promise, 100, 
        'took too long loading files!'
    )
    
    // check if load occured correctly!
    if (commandProcessor.globals.load === false)
        throw Error("unexpected behaviour: load did not run during loading!")
    else if (commandProcessor.globals.unload == true) 
        throw Error("unexpected behaviour: unload ran during load!")


    commandProcessor.globals.load = false; 
    commandProcessor.globals.unload = false; 

    const reloadFilesFuture = new Future<boolean>
    
    await commandProcessor.moduleLoader.scheduleEvent(
        "reload", 
        await getModuleFiles(__dirname, moduleFolder), 
        error => {
            if (error.length > 0)
                throw error
            else
                reloadFilesFuture.resolve(true)
        }
    )

    // wait for files to reload!
    await withTimeout(reloadFilesFuture.promise, 100, 
        'took too long reloading files!'
    )


    return {
        'load'   : commandProcessor.globals.load,
        'unload' : commandProcessor.globals.unload
    }
}

test('Runs Load Events', async () => {
    const val = await main()

    expect(val.load).toBe(true)
    expect(val.unload).toBe(true)
});