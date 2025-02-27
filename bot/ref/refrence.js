// this file is a refrence for the data structure used for modules:

modulesBuffer = {
    someClass : {
        "command 1" : someFunc1,
        "command 2" : someFunc2,
        "command 3" : someFunc3,
    }
}


modules = {
    "module 1": {
        class: [SomeClass], // array of classes stored here to call onLoad and unLoad
        commands: [
            "command 1",
            "command 2",
            "command 3",

            // begin subcommand 
            {
                "prefix": "some string",
                "onCommandNotFound" : true,
                "onDefaultCommand" : false,
                "check" : [],
                "commands": [
                    "command 1",
                    "command 2",
                    "command 3"
                ]
            }
            // end subcomamand
        ]
    },

    "module with parent command": {
        class: [SomeClass],
        commands: [
            
            // begin subcommand 
            {
                "prefix": "some string",
                "onCommandNotFound" : false,
                "onDefaultCommand" : true,
                "check" : [ "CheckName" ],
                "commands": [
                    "command 1",
                    "command 2",
                    "command 3"
                ]
            }
            // end subcomamand
        ]
    }
}

commands = { // commands collection
    "command 1": { cls, SomeFunc }, // commands
    "command 2": { cls, SomeOtherFunc },
    "command 3": { cls, AnotherFunc },

    "some command prefix": { // NestedCommandObj
        "onCommandNotFound" : SomeErrorHandlingFunc,
        "onDefaultCommand" : SomeDefaultCommand,
        "check" : {
            "CheckName" : FunctionToCall // when removing, can just remove from here
        },
        "commands" : { // commands collection
            "command 1": { cls, SomeFunctionWithPrefix },
            "command 2": { cls, SomeOtherFuncWithPrefix },
            "command 3": { cls, AnotherFuncWithPrefix }
        }
    }
}


eventBuffer = { 
    "event name" : [ func1, func2, func3 ]
}

events = { 
    "file1" : { 
        "event 1" : [ func1, func2, func3 ],
        "event 2" : [ func1, func2, func3 ]
    },
    "file2" : {
        "event1" : [ func1 ],
        "event3" : [ func5 ]
    }
}

// check if function already exists using method name, 
// this will be used to refresh the function
intervalBuffer = { 
    "func name" : func,
    "func2 name" : func2
}

intervals = { 
    "file1" : { 
        // file can load 2 classes, the function names have the possibility of being the same, use className:funcName
        "func name" : intervalHandlerClass
    }
}