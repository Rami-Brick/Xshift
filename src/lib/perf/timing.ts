export async function timeAsync<T>(label: string, work: () => T): Promise<Awaited<T>> {
  const start = performance.now();

  try {
    return (await work()) as Awaited<T>;
  } finally {
    if (process.env.NODE_ENV === 'development') {
      const elapsed = Math.round(performance.now() - start);
      console.info(`[perf] ${label}: ${elapsed}ms`);
    }
  }
}
