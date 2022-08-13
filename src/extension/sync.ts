import * as deasync from 'deasync';

export function syncPromise(promise) {
    return deasync((callback) => {
        promise
            .then(res => callback(res, null))
            .catch(err => callback(null, err))
    })();
}