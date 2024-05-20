export default class InputStream {

    private pos = 0;
    private input;

    constructor(input: string) {
        this.input = input;
    }

    peek(depth: number = 1) {
        return (depth == 1) ? this.input.charAt(this.pos) : this.input.slice(this.pos, this.pos + depth);
    }

    next(depth: number = 1) {
        const result = this.peek(depth);
        this.pos += depth;
        return result;
    }

    /**
     * Match the regex to the input starting from the current position. 
     * Do not advance the cursor.
     * @param regex Regex to test the input against.
     * @returns The match of the regex.
     */
    peek_match(pattern: RegExp|string) {
        let stickyRegex = create_sticky_regexp(pattern);
        stickyRegex.lastIndex = this.pos;
        return stickyRegex.exec(this.input)?.[0];
    }

    /**
     * Match the regex to the input starting from the current position.
     * Advance the cursor by the length of the match.
     * @param regex Regex to test the input against.
     * @returns The match of the regex.
     */
    read_match(regex: RegExp|string) {
        const match = this.peek_match(regex);
        if(match) this.pos += match.length;
        return match;
    }

    eof() {
        return this.peek() == "";
    }

    croak(msg: string) {
        throw new Error(`${msg} (at pos. ${this.pos})`);
    }
}

//Create a Regex with the "y" flag from a string or another RegExp (preserve flags).
function create_sticky_regexp(pattern: string|RegExp) {
    if(typeof pattern === "string") return new RegExp(pattern, "y");
    else if(pattern.sticky) return pattern;
    else return new RegExp(pattern.source, pattern.flags + "y");
}