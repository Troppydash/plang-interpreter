export interface PlFileInfo {
    row: number; // zero indexed row of word
    col: number; // zero indexed end of word
    length: number; // size of word
    filename: string; // file that the word is in
}

export function NewEmptyFileInfo(filename: string): PlFileInfo {
    return {
        row: 0,
        col: 0,
        length: 0,
        filename
    };
}

export function NewFileInfo(row: number, col: number, length: number, filename: string) {
    return {
        row,
        col,
        length,
        filename
    };
}
