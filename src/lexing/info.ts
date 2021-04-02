export interface PlFileInfo {
    row: number;
    col: number;
    length: number;
    filename: string;
}

export function EmptyFileInfo(filename: string): PlFileInfo {
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
