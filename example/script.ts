// this file is no longer affected by reloads
// whole program will need to be restarted for changes to take effect
// this is important for shared imported files, where you may need to check if a class is the same
// if the import cache is cleared, the same class will have a different internal memory ref
// this means even though 2 files have the same* class, they are not equal to each other.

// this does not change mutations
// your program can still modify the values, and it will be synced across all other imports due to sharing the same memory ref.
export const useCache = true

export const value = 0
