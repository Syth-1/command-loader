export const EventNames = {
    preCheck  : "preCheck",
    error     : "onError",
    onMessage : "onMessage",
    onCommand : "onCommand",
    onExecute : "onExecute",
    onLoad    : "onLoad",
    onUnload  : "onUnload",
} as const

export type EventRequiresCTX = typeof EventNames.preCheck | typeof EventNames.onMessage | typeof EventNames.onCommand | typeof EventNames.onExecute
export type EventRequiresGlobal = Exclude<(typeof EventNames)[keyof typeof EventNames], EventRequiresCTX | typeof EventNames.error>