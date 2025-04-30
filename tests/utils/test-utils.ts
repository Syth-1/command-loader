export function withTimeout<T>(promise: Promise<T>, ms: number, message: string = 'Timeout exceeded'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

export function join(...args : Array<string>) { 
  return args.join(' ')
}

