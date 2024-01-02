const {Constraint, And, Equal, Type, Tycon, Trivial, Parser, Forall, Conapp, Tyvar, Substitution} = require("../nml");

// let c = [new Equal(Tycon.boolty, Tycon.boolty), new Trivial(), new Equal(Tycon.intty, Tycon.boolty)];
// let bigC = Constraint.conjoin(c);
// console.log(bigC);

let p = new Parser();
// let exp = p.tokenInput("'(1 5 3 4 )");

// let exp = p.tokenInput("(begin #t 4 5 )")
// console.log(exp);

// let exp = p.tokenInput("(let ([x 4]) 3)")
// console.log(exp.exp.bindings);

// let exp = p.tokenInput("(if #t 4 5)");
// console.log(exp);

// let exp = p.tokenInput("(lambda (x y z) #t)");
// console.log(exp);

// let exp = p.tokenInput("(letrec ([x (lambda (xsd) #t)][y (lambda (b) 1)]) #t)");
// console.log(exp.exp.bindings);

// let exp = p.tokenInput("(let* ([x (lambda (y) 'ewr)]) x)")
// console.log(exp);

// let list = Type.listtype(new Tyvar());
// list = list.tysubst(new Substitution({"'t0" : Tycon.intty}));
// console.log(list);

// let exp = p.tokenInput("'(1 2 3 4)")
// console.log(exp);

// let exp = p.tokenInput("'((1 2) (3 4))")
// console.log(exp);

// let bundle = p.interpret("'(23 7 4 5)");
// console.log(bundle.toString());

// let bundle = p.interpret("'()");
// console.log(bundle.toString());
// console.log(p.interpret("'dsfds").toString());
// console.log(p.interpret("#f").toString());
// console.log(p.interpret("345").toString());
// console.log(p.interpret("'(1 2 45)").toString());
// console.log(p.interpret("'((1 2) (3 4))").toString());
// console.log(p.interpret("(if #t '() '(12 3))").toString());
// console.log(p.interpret("'((1 2) (3 asds))").toString());
// try {
//     console.log(p.interpret("(if #t '(#f) '(12 3))").toString());
// }
// catch(e) {}
// console.log(p.interpret("(lambda (x) x)").toString());
// console.log(p.interpret("((lambda (x) x) 3)").toString());
// console.log(p.interpret("(begin ((lambda (x) 3) 3))").toString());
// console.log(p.interpret("(begin (lambda (x) 90) 3)").toString());
console.log(p.interpret("(let ([x 45][y 'fgd]) y)").toString())
console.log(p.interpret("(let ([x 45][x 'fgd]) x)").toString())
console.log(p.interpret("(let ([x 45]) x)").toString())
console.log(p.interpret("(let ([x (if #t '(34 56) '())]) x)").toString())
console.log(p.interpret("(let ([x (if #t '(34 56) '())][boobie #t]) boobie)").toString())
console.log(p.interpret("(let ([x (begin 34 53)][boobie #t]) x)").toString())
console.log(p.interpret("(let ([x (begin '())][boobie (lambda (x y) x)]) boobie)").toString())
console.log(p.interpret("(letrec ([x (lambda (y) y)]) (x 7))").toString())

/**
-> (val hello 3) 
3 : int
-> (val hi (lambda () hello))
hi : ( -> int)
-> (val hello 4)
4 : int
-> (hi)
3 : int
 */