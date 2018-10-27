/**
 * Expose `Option`.
 */
export default class Option {
    required: number
    optional: number
    bool: boolean
    flags: string[]
    long?: string
    short?: string

    /**
     * Initialize a new `Option` instance.
     *
     * @param {String} _flags
     * @param {String} description
     * @param {Autocomplete} autocomplete
     * @return {Option}
     * @api public
     */
    constructor(_flags: string, public description: string = '', public autocomplete) {
        this.required     = ~_flags.indexOf('<')
        this.optional     = ~_flags.indexOf('[')
        this.bool         = !~_flags.indexOf('-no-')
        this.autocomplete = autocomplete

        this.flags = _flags.split(/[ ,|]+/)
        if (this.flags.length > 1 && !/^[[<]/.test(this.flags[1])) {
            this.assignFlag(this.flags.shift())
        }
        this.assignFlag(this.flags.shift())
    }

    /**
     * Return option name.
     *
     * @return {String}
     * @api private
     */

    name() {
        if (this.long !== undefined) {
            return this.long
                .replace('--', '')
                .replace('no-', '')
        }
        return this.short
            .replace('-', '')
    }

    /**
     * Check if `arg` matches the short or long flag.
     *
     * @param {String} arg
     * @return {Boolean}
     * @api private
     */

    is(arg) {
        return (arg === this.short || arg === this.long)
    }

    /**
     * Assigned flag to either long or short.
     *
     * @param {String} flag
     * @api private
     */

    assignFlag(flag) {
        if (flag.startsWith('--')) {
            this.long = flag
        } else {
            this.short = flag
        }
    }
}
