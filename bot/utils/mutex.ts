export class Mutex {
  private mutex = Promise.resolve();

  lock(): Promise<() => void> {
    const lastMutex = this.mutex;
    return new Promise((resolve) => {
      this.mutex = lastMutex.then(() => new Promise(resolve));
    });
  }
}

export function withMutex(mutex: Mutex) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const release = await mutex.lock();
      try {
        return await original.apply(this, args);
      } catch (err) {
        console.log(err)
        // Rethrow the same error up the chain
        throw err;
      } finally {
        // Always release lock, even if an error occurred
        release();
      }
    };

    return descriptor;
  };
}
