import { BaseGlobals, CommandProcessor } from '@/process_command'
import { getModuleFiles } from '@/file'
import { Context } from '@/test-context';
import { expect, test } from "bun:test";
import Future from '@/future';
import { withTimeout } from '@/test-utils';

const prefix = ''
const moduleFolder = 'modules' // folder where command files are located

async function main() {

    const commandProcessor = new CommandProcessor(
        Context, // pass in Context class here, this is the class that will be instanced for every command
        BaseGlobals 
    )

    const loadingFilesFuture = new Future<boolean>

    const errors = await commandProcessor.moduleLoader.loadModule(
        await getModuleFiles(__dirname, moduleFolder), 
    )

    if (errors.length > 0)
        throw AggregateError(errors)
    else 
        loadingFilesFuture.resolve(true)

    
    // wait for files to load!
    await withTimeout(loadingFilesFuture.promise, 100, 
        'took too long loading files!'
    )

    const command = "test"
    const future = new Future()

    commandProcessor.processCommands(prefix, command, future)

    return await withTimeout(future.promise, 100,
        "command did not run in time!"
    )
}

test('Function Binding', async () => {
    const val = await main()

    expect(val).toBe(true);
});