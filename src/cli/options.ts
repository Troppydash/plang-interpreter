export const CLI_PREFIX = "--"; // unchanged cli argument prefix


// run: what mode to run
// op: options
export const CLI_FLAGS = [
    "run-demo",
    "run-repl",
    "run-compiler",
    "run-emitter",
    "run-highlighter",
    "help",
    "mode-release",
    "mode-debug",
    "view-problems"
] as const;

export function MatchPrefix(raw: string): string | null {
    if (!raw.startsWith(CLI_PREFIX)) {
        return null;
    }
    return raw.substring(CLI_PREFIX.length);
}

export function MatchFlag(flag: string): boolean {
    return CLI_FLAGS.includes(flag as any);
}

export const CLI_OPTIONS = [
    "lib"
] as const;

export function MatchOption(text: string): boolean {
    return CLI_OPTIONS.includes(text as any);
}
