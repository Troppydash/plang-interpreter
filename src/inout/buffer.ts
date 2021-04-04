const MAXBUFFER = 5;

export class PlBuffer {
    private buffer: string[];
    private readonly limit: number;

    constructor(limit: number = MAXBUFFER) {
        this.limit = limit;
        this.buffer = []
    }

    push(item: string): boolean {
        this.buffer.push(item);
        return this.buffer.length > this.limit;
    }

    isEmpty() {
        return this.buffer.length === 0;
    }

    empty() {
        const out = this.buffer;
        this.buffer = [];
        return out;
    }
}
