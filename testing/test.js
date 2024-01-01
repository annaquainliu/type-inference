const {Constraint, And, Equal, Type, Tycon, Trivial, Parser, Forall, Conapp, Tyvar, Substitution} = require("../nml");

// let c = [new Equal(Tycon.boolty, Tycon.boolty), new Trivial(), new Equal(Tycon.intty, Tycon.boolty)];
// let bigC = Constraint.conjoin(c);
// console.log(bigC);

let p = new Parser();
// let exp = p.tokenInput("'(1 5 3 4 )");

// let exp = p.tokenInput("(begin #t 4 5 )")
// console.log(exp);

// let exp = p.tokenInput("(let ([x 4]) 3)")
// console.log(exp);

// let exp = p.tokenInput("(if #t 4 5)");
// console.log(exp);

// let exp = p.tokenInput("(lambda (x y z) #t)");
// console.log(exp);

// let exp = p.tokenInput("(letrec ([x (lambda (xsd) #t)][y (lambda (b) 1)]) #t)");
// console.log(exp.bindings["x"]);

// let exp = p.tokenInput("(let* ([x (lambda (y) 'ewr)]) x)")
// console.log(exp.eval({}, {}));

// let list = Type.listtype(new Tyvar());
// list = list.tysubst(new Substitution({"'t0" : Tycon.intty}));
// console.log(list);

// let bundle = p.interpret("'(23 7 4 5)");
// console.log(bundle.toString());

// let bundle = p.interpret("'()");
// console.log(bundle.toString());
// console.log(p.interpret("'dsfds").toString());
// console.log(p.interpret("#f").toString());
// console.log(p.interpret("345").toString());
// console.log(p.interpret("'(1 2 45)").toString());
console.log(p.interpret("(if #t '() '(12 3))").toString());
try {
    console.log(p.interpret("(if #t '(#f) '(12 3))").toString());
}
catch(e) {}
console.log(p.tokenInput("(begin ((lambda (x) 3) 3))"));
