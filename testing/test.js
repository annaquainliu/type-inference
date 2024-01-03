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
console.log(p.interpret("(lambda (x) x)").toString() == "<function> : (forall ['a] ('a -> 'a))");
console.log(p.interpret("((lambda (x) x) 3)").toString() == "3 : int");
console.log(p.interpret("(begin ((lambda (x) 3) 3))").toString() == "3 : int");
console.log(p.interpret("(begin (lambda (x) 90) 3)").toString() == "3 : int");
console.log(p.interpret("(let ([x 45][y 'fgd]) y)").toString() == "fgd : sym")
console.log(p.interpret("(let ([x 45][x 'fgd]) x)").toString() == "fgd : sym")
console.log(p.interpret("(let ([x 45]) x)").toString() == "45 : int")
console.log(p.interpret("(let ([x (if #t '(34 56) '())]) x)").toString() == "(34 56) : (list int)")
console.log(p.interpret("(let ([x (if #t '(34 56) '())][boobie #t]) boobie)").toString()  == "#t : bool")
console.log(p.interpret("(let ([x (begin 34 53)][boobie #t]) x)").toString() == "53 : int")
console.log(p.interpret("(let ([x (begin '())][boobie (lambda (x y) x)]) boobie)").toString() == "<function> : (forall ['a 'b] ('a 'b -> 'a))")
console.log(p.interpret("(letrec ([x (lambda (y) y)]) (x 7))").toString() == "7 : int")
console.log(p.interpret("(let* ([x 34][y x]) y)").toString() == "34 : int");
console.log(p.interpret("(let* ([x 34][y x][z y]) z)").toString() == "34 : int");
console.log(p.interpret("(let* ([x 34][y x][z y][l 4][p l]) p)").toString() == "4 : int");
console.log(p.interpret("(val hello 3)").toString() == "3 : int");
console.log(p.interpret("(val hello '())").toString() == "() : (forall ['a] (list 'a))");
console.log(p.interpret("(define hello (bee poo) 3)").toString() == "<function> : (forall ['a 'b] ('a 'b -> int))");
console.log(p.interpret("(val-rec hello (bee poo) 3)").toString() == "<function> : (forall ['a 'b] ('a 'b -> int))");
console.log(p.interpret("(+ 3 4)").toString() == "7 : int");
console.log(p.interpret("+").toString() == "<function> : (int int -> int)");
