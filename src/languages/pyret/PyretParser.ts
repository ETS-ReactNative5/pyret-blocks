import * as TOK from "./pyret-lang/pyret-tokenizer.js";
import * as P from "./pyret-lang/pyret-parser.js";
import * as TR from "./pyret-lang/translate-parse-tree.js";
import {
  AST,
  ASTNode
} from '../../ast';
import {
  Literal, 
} from '../../nodes';
import {Binop,
  ABlank,
  Bind,
  Construct,
  Func,
  Sekwence as Sequence,
  Var,
  Assign,
  Let,
  FunctionApp,
  Tuple,
  Check,
  CheckTest,
} from "./ast.js";

interface Position {
  line: number;
  ch: number;
}

class Range {
  from: Position;
  to: Position;
  constructor(from: Position, to: Position) {
    this.from = from;
    this.to = to;
  }
}

function startOf(srcloc: { startRow: number; startCol: number; }) {
  return {
    "line": srcloc.startRow - 1,
    "ch":   srcloc.startCol
  };
}

function endOf(srcloc: { endRow: number; endCol: number; }) {
  return {
    "line": srcloc.endRow - 1,
    "ch":   srcloc.endCol
  };
}

const opLookup = {
  "+":   "op+",
  "-":   "op-",
  "*":   "op*",
  "/":   "op/",
  "$":   "op$",
  "^":   "op^",
  "<":   "op<",
  "<=":  "op<=",
  ">":   "op>",
  ">=":  "op>=",
  "==":  "op==",
  "=~":  "op=~",
  "<=>": "op<=>",
  "<>":  "op<>",
  "and": "opand",
  "or":  "opor",
  // TODO: check ops
  "is": (loc, _node) => new Literal(loc.from, loc.to, 'is', 'check-op'),
};

// TODO: all of these are preliminary for testing
const nodeTypes = {
  "s-program": function(_pos: Range, _prov: any, _provTy: any, _impt: any, body: { exprs: any; }) {
    let rootNodes = body.exprs;
    return new AST(rootNodes);
  },
  "s-name": function(pos: Range, str: string) {
    return new Literal(
      pos.from,
      pos.to,
      str,
      'symbol',
      {'aria-label': `${str}, a name`});
  },
  "s-id": function(pos: Range, str: string) {
    return new Literal(
      pos.from,
      pos.to,
      str,
      'symbol',
      {'aria-label': `${str}, an identifier`});
  },
  "s-num": function(pos: Range, x: string) {
    return new Literal(
      pos.from,
      pos.to,
      x,
      'number',
      {'aria-label': `${x}, a number`});
  },
  "s-block": function(pos: Range, stmts: [any]) {
    return new Sequence(
      pos.from,
      pos.to,
      stmts,
      'block');
  },
  "s-op": function(pos: Range, _opPos: any, op: { substr: (arg0: number) => any; }, left: any, right: any) {
    let name = op.substr(2);
    return new Binop(
      pos.from,
      pos.to,
      name,
      left,
      right,
      {'aria-label': `${left} ${name} ${right}`});
  },
  "s-bind": function(pos: Range, _shadows: any, id: any, ann: any) {
    // TODO: ignoring shadowing for now.
    return new Bind(
      pos.from,
      pos.to,
      id,
      ann);
  },
  "s-fun": function(pos: Range, name: any, _params: any, args: any, ann: any, doc: any, body: any, _checkLoc: any, _check: any, _blodky: any) {
    // TODO: ignoring params, check, blocky
    return new Func(
      pos.from,
      pos.to,
      name,
      args,
      ann,
      doc,
      body,
      {'aria-label': `${name}, a function with ${args} with ${body}`});
  },
  // Annotations
  "a-blank": function() {
    return new ABlank(undefined, undefined);
  },
  "a-name": function(pos: Range, str: any) {
    return new Literal(
      pos.from,
      pos.to,
      str,
      'symbol',
      // make sure that this matches the pedagogy used in classroom:
      // "variable", "identifier", "name", ...; other languages
      {'aria-label': `${str}, an identifier`});
  },
  "s-let": function(pos: Range, id: any, rhs: any, _rec: boolean) {
    console.log(arguments);
    let options = {};
    options['aria-label'] = `${id} set to ${rhs}`;
    return new Let(
      pos.from,
      pos.to,
      id,
      rhs,
      options
    );
  },
  "s-bool": function(pos: Range, value: boolean) {
    let ret = new Literal(
      pos.from,
      pos.to,
      value,
      'boolean',
      {'aria-label': `${value}, a boolean`});
    console.log(ret);
    return ret;
  },
  "s-str": function(pos: Range, value: string) {
    console.log(arguments);
    return new Literal(
      pos.from,
      pos.to,
      "\"" + value + "\"",
      'string',
      {'aria-label': `${value}, a string`}
    );
  },
  "s-construct": function (pos: Range, modifier: any, constructor: any, values: any[]) {
    console.log(arguments);
    return new Construct(
      pos.from, pos.to, modifier, constructor, values, { 'aria-label': `${constructor} with values ${values}` }
    );
  },
  "s-app": function(pos: Range, fun: any, args: any[]) {
    console.log(arguments);
    return new FunctionApp(
      pos.from, pos.to, fun, args, {'aria-label': `${fun} applied to ${args}`}, 
    );
  },
  "s-tuple": function(pos: Range, fields: any[]) {
    console.log(arguments);
    return new Tuple(
      pos.from, pos.to, fields, {'aria-label': `tuple with ${fields}`}, 
    );
  },
  "s-check": function(pos: Range, name: string | undefined, body: any, keyword_check: boolean) {
    return new Check(
      pos.from, pos.to, name, body, keyword_check, { 'aria-label': ((name != undefined)? `${name} `: "") + `checking ${body}`}
    );
  },
  "s-check-test": function(pos: Range, check_op: any, refinement: any | undefined, lhs: any, rhs: any | undefined) {
    console.log(arguments);
    return new CheckTest(
      pos.from, pos.to, check_op, refinement, lhs, rhs, {'aria-label': `${check_op} ${lhs} ${rhs}`}
    );
  },
  's-include': function(pos: Range) {
    console.log(arguments);
    return new Literal(
      pos.from, pos.to, 'test', 'string', {'aria-label': 'include'}
    )
  },
  's-const-import': function(pos: Range) {
    console.log(arguments);
    return new Literal(
      pos.from, pos.to, 'test', 'string', {'aria-label': 'const import'}
    )
  },
  's-bracket': function(pos: Range, base: any, index: any) {
    console.log(arguments);
    return new Literal(
      pos.from, pos.to, 'test', 'string', {'aria-label': `bracket`}
    )
  },
  's-dot': function(pos: Range, base: any, method: string) {
    console.log(arguments);
    return new Literal(
      pos.from, pos.to, base.toString() + "." + method , 'method', {'aria-label': `${method} on data ${base}`}
    )
  },
}

function makeNode(nodeType: string) {
  const args = Array.prototype.slice.call(arguments, 1);
  const constructor = nodeTypes[nodeType];
  if (constructor === undefined) {
    console.log("Warning: node type", nodeType, "NYI");
    return;
  } else {
    return constructor.apply(this, args);
  }
}

function makeSrcloc(_fileName: any, srcloc: any) {
  return new Range(startOf(srcloc), endOf(srcloc));
}

function combineSrcloc(_fileName: any, startPos: any, endPos: any) {
  return new Range(startOf(startPos), endOf(endPos));
}

function translateParseTree(parseTree: any, fileName: string) {
  function NYI(msg: string) {
    return function() {
      console.log(msg, "not yet implemented");
    }
  }
  const constructors = {
    "makeNode": makeNode,
    "opLookup": opLookup,
    "makeLink": function(a: any, b: any[]) {
      b.unshift(a);
      return b;
    },
    "makeEmpty": function() {
      return new Array();
    },
    "makeString": function(str: any) {
      return str;
    },
    "makeNumberFromString": function(str: string) {
      // TODO: error handling
      return parseFloat(str);
    },
    "makeBoolean": function(bool: any) {
      return bool;
    },
    "makeNone": function() {
      return null;
    },
    "makeSome": function(value: any) {
      return value;
    },
    "getRecordFields": NYI("getRecordFields"),
    "makeSrcloc": makeSrcloc,
    "combineSrcloc": combineSrcloc,
    "detectAndComplainAboutOperatorWhitespace": function(_kids: any, _fileName: any) {
      return;
    }
  };
  return TR.translate(parseTree, fileName, constructors);
}

export class PyretParser {
  // TODO: Proper error handling.
  //       See `pyret-lang/src/js/trove/parse-pyret.js`.
  parse(text: string) {
    // Tokenize
    const tokenizer = TOK.Tokenizer;
    tokenizer.tokenizeFrom(text);
    // Parse
    console.log("@going to parse");
    const parsed = P.PyretGrammar.parse(tokenizer);
    if (parsed) {
      console.log("@valid parse");
      // Count parse trees
      const countParses = P.PyretGrammar.countAllParses(parsed);
      if (countParses === 1) {
        console.log("@exactly one valid parse", parsed);
        // Construct parse tree
        const parseTree = P.PyretGrammar.constructUniqueParse(parsed);
        console.log("@reconstructed unique parse");
        // Translate parse tree to AST
        const ast = translateParseTree(parseTree, "<editor>.arr");
        return ast;
      } else {
        throw "Multiple parses";
      }
    } else {
      console.log("Invalid parse");
      // really, curTok does exist, but ts isn't smart enough to detect
      console.log("Next token is " + (tokenizer as any).curTok.toRepr(true)
                  + " at " + (tokenizer as any).curTok.pos.toString(true));
    }
  }

  getExceptionMessage(error: any) {
    return error;
  }
}

module.exports = PyretParser;

function testRun() {
  const data = `
  fun foo(x :: Number):
  x + 3
  end
  `
  const parser = new PyretParser();
  const ast = parser.parse(data);
  console.log("\nBlocky AST:\n");
  console.log(ast.toString());
  console.log("\nBlocky AST (JS view):\n");
  console.log(ast);
}
