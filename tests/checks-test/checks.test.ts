import { BaseGlobals, CommandProcessor } from '@/process_command'
import { getModuleFiles } from '@/file'
import { Context, type TestVals } from '@/context';
import { expect, test } from "bun:test";
import Future from '@/utils/future';
import { join, withTimeout } from '@/test-utils';

const prefix = ''
const moduleFolder = 'modules' // folder where command files are located

async function main() {

    const commandProcessor = new CommandProcessor(
        Context, // pass in Context class here, this is the class that will be instanced for every command
        BaseGlobals 
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

    // test global listeners!

    // TODO do we need futures?
    const listenerFuture = new Future()

    const listenerTestVal : TestVals = { 
        runs: 0
    }

    const textDict = {
        "foo" : "Message",
        "bar" : "Command",
        "foobar" : "Execute",
        "foo bar" : "all"
    }

    const textKeys = Object.keys(textDict) as Array<keyof typeof textDict> 

    for (const [index, text] of textKeys.entries()) { 
        await commandProcessor.processCommands(
            prefix, 
            join("listener", text), 
            listenerFuture, 
            listenerTestVal
        )

        if (listenerTestVal.runs < index + 1) { 
            throw Error(`did not run listener ${textDict[text]}`)
        } else if (listenerTestVal.runs > index + 1) { 
            throw Error(`listener ${textDict[text]} ran, did not stop!`)
        }

        listenerTestVal.runs = 0

        if (index + 1 !== textKeys.length) { 
            if (listenerFuture.done()) { 
                throw Error(`listener ${textDict[text]} failed`)
            }
        }
    }

    if (!listenerFuture.done()) throw Error("listener failed to pass!")


    // test local events!

    const future = new Future()

    const commands = [
        "command",
        "execute"
    ]

    let runCount = 0

    const testVals : TestVals = { 
        runs: 0
    }

    for (const command of commands) { 
        await commandProcessor.processCommands(prefix, join(command, 'foo bar'), future, testVals)
        
        if (future.done()) return false

        if (testVals.runs === runCount) throw Error(`Didnt run '${command}' check!`)

        runCount = testVals.runs
    }

    commandProcessor.processCommands(prefix, join("all", "hello world"), future, testVals)

    return await withTimeout(future.promise, 100,
        "command did not run in time!"
    )
}

test('check Command', async () => {
    const val = await main()

    expect(val).toBe(true);
});