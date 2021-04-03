const prompt = require( 'prompt-sync' )();

export function print( message ) {
    console.log( message );
}

export function input( message ) {
    return prompt(message);
}

