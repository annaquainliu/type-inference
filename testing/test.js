const {Constraint, And, Equal, Type, Tycon, Trivial, Parser, Forall, Conapp, Tyvar, Substitution, Environments} = require("../nml");

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
console.log(p.interpret("(define hello (bee poo) 3)").toString() == "hello : (forall ['a 'b] ('a 'b -> int))");
console.log(p.interpret("(val-rec hello (bee poo) 3)").toString() == "hello : (forall ['a 'b] ('a 'b -> int))");
console.log(p.interpret("(+ 3 4)").toString() == "7 : int");
console.log(p.interpret("+").toString() == "<function> : (int int -> int)");
console.log(p.interpret("(* 3 4)").toString() == "12 : int");
console.log(p.interpret("(/ 3 4)").toString() == "0 : int");
console.log(p.interpret("(- 3 4)").toString() == "-1 : int");
console.log(p.interpret("=").toString() == "<function> : (forall ['a] ('a 'a -> bool))");
console.log(p.interpret("(= 3 4)").toString() == "#f : bool");
console.log(p.interpret("(= 4 4)").toString() == "#t : bool");
console.log(p.interpret("(= '345 '345)").toString() == "#t : bool");
console.log(p.interpret("(= '() '())").toString() == "#t : bool");
console.log(p.interpret("(= '() '(2 3 5))").toString() == "#f : bool");
console.log(p.interpret("(= #t #f)").toString() == "#f : bool");
console.log(p.interpret("(= #t #t)").toString() == "#t : bool");
console.log(p.interpret("(= (= 'a 'a) #t)").toString() == "#t : bool");
console.log(p.interpret("(= (* 2 2) (* 4 1))").toString() == "#t : bool");
console.log(p.interpret("(> (* 2 2) (* 4 1))").toString() == "#f : bool");
console.log(p.interpret("(> (* 2 5) (* 4 1))").toString() == "#t : bool");
console.log(p.interpret("(< (* 2 5) (* 4 1))").toString() == "#f : bool");
console.log(p.interpret("(< (* 2 2) (* 4 1))").toString() == "#f : bool");
let code = "(define recursion (hi) (if (= hi 0) hi (recursion (- hi 1))))"
console.log(p.interpret(code).toString() == "recursion : (int -> int)");
console.log(p.interpret("(recursion 1)").toString() == "0 : int")
console.log(p.interpret("(val-rec mama (moo) (if (> moo 0) (mama (- moo 1)) moo))").toString() == "mama : (int -> int)")
console.log(p.interpret("(mama 2)").toString() == "0 : int")
console.log(p.interpret("car").toString() == "<function> : (forall ['a] ((list 'a) -> 'a))")
console.log(p.interpret("cdr").toString() == "<function> : (forall ['a] ((list 'a) -> (list 'a)))")
console.log(p.interpret("(car '(1 2 3))").toString() == "1 : int")
console.log(p.interpret("(cdr '(1 2 3))").toString() == "(2 3) : (list int)")
console.log(p.interpret("(cdr '(1))").toString() == "() : (list int)")
console.log(p.interpret("(car '(1))").toString() == "1 : int");
console.log(p.interpret("(mod 9 3)").toString() == "0 : int");

// closure test
console.log(p.interpret("(val hi 3)").toString());
console.log(p.interpret("(val poo (lambda () hi))").toString());
console.log(p.interpret("(val hi 5)").toString());
console.log(p.interpret("(poo)").toString() == "3 : int");

console.log(p.interpret("(null? '())").toString() == "#t : bool");
console.log(p.interpret("(null? '(1 2 3))").toString() == "#f : bool");
console.log(p.interpret("(fst '(1 2))").toString() == "1 : int");
console.log(p.interpret("(snd '(1 2))").toString() == "2 : int");

console.log(p.interpret("(cons 3 '())").toString());
console.log(p.interpret("(cons 3 '(2 4 5))").toString());
console.log(p.interpret("(foldr (lambda (x acc) (+ x acc)) 0 '(1 2 3 4))").toString() == "10 : int");
console.log(p.interpret("(foldl (lambda (x acc) (+ x acc)) 0 '(1 2 3 4))").toString() == "10 : int");
console.log(p.interpret("(exists? (lambda (x) (= 0 (mod x 2))) '(1 2 5 7))").toString())
console.log(p.interpret("(begin)").toString() == "() : unit")
console.log(p.interpret("(or #t #t)").toString() == "#t : bool")
console.log(p.interpret("(or #t #f)").toString() == "#t : bool")
console.log(p.interpret("(or (= 45 34) (= 34 34))").toString() == "#t : bool")
console.log(p.interpret("(and (= 45 34) (= 34 34))").toString() == "#f : bool")
console.log(p.interpret("(and (= 45 45) (= 34 34))").toString() == "#t : bool")

console.log(p.interpret("(letrec ([listOrdered? (lambda (xs op?) (if (or (null? xs) (null? (cdr xs))) #t (and (op? (car xs) (car (cdr xs))) (listOrdered? (cdr xs) op?))))][call (lambda () (listOrdered? '(1 2 4 90) <))]) (call))").toString() == "#t : bool")
console.log(p.interpret("(lambda (xs) (foldl (lambda (a b) (if (> a b) a b)) (car xs) xs)").toString() == "<function> : ((list int) -> int)");
