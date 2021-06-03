export function isws(c) {
    return c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f';
}

export function isblank(c) {
    return c === ' ' || c === '\t';
}

export function isnum(c) {
    return c >= '0' && c <= '9';
}

export function isalpha(c) {
    return (c >= 'A' && c <= 'Z') ||
        (c >= 'a' && c <= 'z');
}

export function isalphanum(c) {
    return isalpha(c) || isnum(c);
}

export function iscap(c) {
    return c >= 'A' && c <= 'Z';
}

export function tonum(c: string): number {
    return (c as any) - ('0' as any);
}

export function isvariablefirst(c) {
    return isalpha(c) || c === '_' || c === '@' || c === '$';
}

export function isvariablerest(c) {
    return isalphanum(c) || c == '?' || c == '_' || c == '!';
}
