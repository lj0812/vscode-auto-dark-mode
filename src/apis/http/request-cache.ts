/* eslint-disable @typescript-eslint/no-explicit-any */
class RequestCache {
    private cache: Map<string, Promise<any>> = new Map();

    public add(key: string, promise: Promise<any>) {
        this.cache.set(key, promise);
    }

    public get(key: string) {
        return this.cache.get(key);
    }

    public remove(key: string) {
        this.cache.delete(key);
    }

    public clear() {
        this.cache.clear();
    }

    public has(key: string) {
        return this.cache.has(key);
    }

    public getCacheKey(url: string, params: unknown) {
        return `${url}?${JSON.stringify(params)}`;
    }
}

export default new RequestCache();
