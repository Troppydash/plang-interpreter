export function MaskedEval( src, ctx = {} ) {
    ctx = new Proxy( ctx, {
        has: () => true
    } )
    let func = (new Function( "with(this) { " + src + "}" ));
    func.call( ctx );
}
