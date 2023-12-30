const {Constraint, And, Equal, Type, Tycon, Trivial, Parser} = require("../nml");

// let c = [new Equal(Tycon.boolty, Tycon.boolty), new Trivial(), new Equal(Tycon.intty, Tycon.boolty)];
// let bigC = Constraint.conjoin(c);
// console.log(bigC);

let p = new Parser();
let exp = p.tokenInput("'(1 5 3 4)");
let bundle = exp.eval();
console.log(bundle.constraint.toString());
