export function isws( c ) {
    return c === ' ' || c === '\t';
}

export function isnum( c ) {
    return c >= '0' && c <= '9';
}

export function isalpha( c ) {
    return (c >= 'A' && c <= 'Z') ||
        (c >= 'a' && c <= 'z');
}

export function isalphanum(c) {
    return isalpha(c) && isnum(c);
}

export function tonum( c: string ): number {
    return (c as any) - ('0' as any);
}
