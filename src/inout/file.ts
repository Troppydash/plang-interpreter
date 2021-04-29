import { replaceForAll } from "../extension";

export interface PlFile {
    filename: string;
    content: string;
}

function cleanupFile(content: string): string {
    content = replaceForAll(content, '\r\n', '\n');
    content = replaceForAll(content, '\r', '\n');
    content = replaceForAll(content, '\t', '    ');
    return content;
}

export function NewPlFile(filename: string, content: string) {
    // clean up content line ending
    content = cleanupFile(content);

    return {
        filename, content
    }
}
