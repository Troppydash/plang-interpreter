/**
 * Gets a list of ts enum keys
 * @param e The enum
 */
export function tsEnumKeys(e: any): string[] {
    // https://stackoverflow.com/questions/18111657/how-to-get-names-of-enum-entries
    const out = [];
    for (const mem in e) {
        if (parseInt(mem, 10) >= 0) {
            out.push(e[mem]);
        }
    }
    return out;
}
