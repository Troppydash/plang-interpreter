import {Inout} from "../inout";
import * as path from "path";
import * as fs from 'fs';
import * as cp from 'child_process';

export function UpdateSelf(version: string) {
    const dir = path.dirname(Inout().paths.exePath);
    const exe = process.platform === 'win32' ? 'tdu.exe' : 'tdu';
    const updater = path.join(dir, exe);

    if (!fs.existsSync(updater)) {
        Inout().print(`Unable to find updater executable, is "${exe}" in the directory?`);
        return 0;
    }

    let file = path.basename(process.argv[0]);
    if (process.platform === 'win32' && !file.endsWith('.exe')) {
        file += '.exe';
    }

    const args = [
        'update',
        'troppydash/plang-interpreter',
        version,
        '-n', file
    ];

    Inout().print(`Calling updater with version: ${version}`);
    const yes = Inout().input("Proceed? [y/n] ");
    if (yes === null || yes.toLowerCase() !== 'y') {
        Inout().print('Update cancelled, exiting');
        return 0;
    }

    Inout().print(`Spawning updater, this program will now exit`);
    const child = cp.spawn(
        updater,
        args,
        {
            detached: true,
            shell: true,
        }
    );
    child.unref();

    return 0;
}
