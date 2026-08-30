import { StreamLanguage } from "@codemirror/language";

interface EnvState {
  afterEq: boolean;
}

/** KEY=value highlighting for .env, .env.local, *.env */
export const dotenv = StreamLanguage.define<EnvState>({
  name: "dotenv",
  startState: () => ({ afterEq: false }),
  token(stream, state) {
    if (stream.sol()) state.afterEq = false;
    if (stream.eatSpace()) return null;

    if (!state.afterEq) {
      if (stream.match(/#.*/)) return "comment";
      if (stream.match(/export\b/)) return "keyword";
      if (stream.match(/[A-Za-z_][A-Za-z0-9_.]*/)) return "def";
      if (stream.eat("=")) {
        state.afterEq = true;
        return "operator";
      }
      stream.next();
      return null;
    }

    if (stream.match(/#.*/)) return "comment";
    if (stream.match(/"(?:[^"\\]|\\.)*"/) || stream.match(/'(?:[^'\\]|\\.)*'/)) {
      return "string";
    }
    if (stream.match(/\$\{[^}\s]+\}/) || stream.match(/\$[A-Za-z_][A-Za-z0-9_]*/)) {
      return "variableName";
    }
    if (stream.match(/true|false|null/i)) return "atom";
    if (stream.match(/-?\d+(?:\.\d+)?/)) return "number";
    if (stream.match(/[^#\s]+/)) return "string";
    stream.next();
    return "string";
  },
});
