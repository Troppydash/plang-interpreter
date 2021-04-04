import { replaceForAll } from "../extension";

export interface PlFile {
    filename: string;
    content: string;
}

export function CleanupLineEndings(content: string): string {
    content = replaceForAll(content, '\r\n', '\n');
    content = replaceForAll(content, '\r', '\n');
    return content;
}

export function NewPlFile(filename: string, content: string) {
    // clean up content line ending
    content = CleanupLineEndings(content);

    return {
        filename, content
    }
}
