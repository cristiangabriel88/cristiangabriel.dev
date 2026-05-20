'use strict';
// Toolkit for the JSX migration (rec 3.1).
//   toJsx(code)      createElement -> JSX   (used once, to generate src/*.jsx)
//   toCreate(code)   JSX -> createElement   (the actual build transform)
//   normalize(code)  canonical form for behavioral equivalence checks
// All transforms are hermetic (configFile/babelrc disabled) so they don't pick
// up babel.config.json and double-apply.
const babel = require('@babel/core');

const REACT_PRESET = ['@babel/preset-react', {
  runtime: 'classic',
  pragma: 'React.createElement',
  pragmaFrag: 'React.Fragment',
  development: false,
}];

const BASE = { configFile: false, babelrc: false, compact: false, retainLines: false };

// createElement(...) -> <jsx/>
function toJsx(code) {
  return babel.transformSync(code, {
    ...BASE,
    comments: true,
    plugins: ['babel-plugin-transform-react-createelement-to-jsx'],
  }).code;
}

// <jsx/> -> React.createElement(...)  (this is what `npm run build` runs)
function toCreate(code) {
  return babel.transformSync(code, {
    ...BASE,
    comments: true,
    presets: [REACT_PRESET],
  }).code;
}

// Canonicalize createElement code so two inputs that mean the same thing emit
// byte-identical strings. Used only to PROVE behavioral equivalence. Folds away
// the differences React doesn't care about: quote style, object shorthand,
// unicode escaping, and a trailing `null` props arg (createElement('br', null)
// === createElement('br')).
function canonPlugin({ types: t }) {
  const isCreate = (c) =>
    t.isMemberExpression(c) &&
    t.isIdentifier(c.object, { name: 'React' }) &&
    t.isIdentifier(c.property, { name: 'createElement' });
  return {
    visitor: {
      'StringLiteral|NumericLiteral|BooleanLiteral|BigIntLiteral'(path) {
        delete path.node.extra; // canonical quotes / number / unicode form
      },
      ObjectProperty(path) {
        path.node.shorthand = false; // {page} -> page: page
        // Object keys are always strings: {o:x}, {"o":x}, {0:x}, {"0":x} are all
        // equivalent. Canonicalize to a single form for the comparison.
        const k = path.node.key;
        if (!path.node.computed) {
          if (t.isNumericLiteral(k)) {
            path.node.key = t.stringLiteral(String(k.value)); // {0:x} -> {"0":x}
          } else if (t.isStringLiteral(k) && /^[A-Za-z_$][\w$]*$/.test(k.value)) {
            path.node.key = t.identifier(k.value); // {"o":x} -> {o:x}
          }
        }
      },
      CallExpression(path) {
        if (!isCreate(path.node.callee)) return;
        const args = path.node.arguments;
        // Merge adjacent string children: createElement(t, p, "©", " ") renders
        // the same displayed text as createElement(t, p, "© "). Prettier's JSX
        // whitespace handling splits these; fold them back for the comparison.
        for (let i = args.length - 1; i >= 3; i--) {
          if (t.isStringLiteral(args[i]) && t.isStringLiteral(args[i - 1])) {
            args[i - 1] = t.stringLiteral(args[i - 1].value + args[i].value);
            args.splice(i, 1);
          }
        }
        // createElement(type, null) -> createElement(type)
        if (args.length === 2 && t.isNullLiteral(args[1])) args.pop();
      },
    },
  };
}

function normalize(code) {
  return babel.transformSync(code, {
    ...BASE,
    comments: false,
    plugins: [canonPlugin],
    generatorOpts: { jsescOption: { minimal: true } },
  }).code;
}

module.exports = { toJsx, toCreate, normalize };
