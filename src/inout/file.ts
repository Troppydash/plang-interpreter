export interface PlFile {
    filename: string;
    content: string;
}

export function CleanupLineEndings(content: string): string {
    content = content.replace('\r\n', '\n');
    content = content.replace('\r', '\n');
    return content;
}

export function NewPlFile(filename: string, content: string) {
    // clean up content line ending
    content = CleanupLineEndings(content);

    return {
        filename, content
    }
}
