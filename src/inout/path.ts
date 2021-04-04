export interface Paths {
    cliPath: string; // dir to the current commandline location
    exePath: string; // dir to the interpreter exe
    rootPath: string; // dir to the root plang file
}

export type PathType = keyof Paths;
