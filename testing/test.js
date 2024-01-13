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
// console.log(p.interpret("(lambda (x) x)").toString() == "<function> : (forall ['a] ('a -> 'a))");
// console.log(p.interpret("((lambda (x) x) 3)").toString() == "3 : int");
// console.log(p.interpret("(begin ((lambda (x) 3) 3))").toString() == "3 : int");
// console.log(p.interpret("(begin (lambda (x) 90) 3)").toString() == "3 : int");
// console.log(p.interpret("(let ([x 45][y 'fgd]) y)").toString() == "fgd : sym")
// console.log(p.interpret("(let ([x 45][x 'fgd]) x)").toString() == "fgd : sym")
// console.log(p.interpret("(let ([x 45]) x)").toString() == "45 : int")
// console.log(p.interpret("(let ([x (if #t '(34 56) '())]) x)").toString() == "(34 56) : (list int)")
// console.log(p.interpret("(let ([x (if #t '(34 56) '())][boobie #t]) boobie)").toString()  == "#t : bool")
// console.log(p.interpret("(let ([x (begin 34 53)][boobie #t]) x)").toString() == "53 : int")
// console.log(p.interpret("(let ([x (begin '())][boobie (lambda (x y) x)]) boobie)").toString() == "<function> : (forall ['a 'b] ('a 'b -> 'a))")
// console.log(p.interpret("(letrec ([x (lambda (y) y)]) (x 7))").toString() == "7 : int")
// console.log(p.interpret("(let* ([x 34][y x]) y)").toString() == "34 : int");
// console.log(p.interpret("(let* ([x 34][y x][z y]) z)").toString() == "34 : int");
// console.log(p.interpret("(let* ([x 34][y x][z y][l 4][p l]) p)").toString() == "4 : int");
// console.log(p.interpret("(val hello 3)").toString() == "3 : int");
// console.log(p.interpret("(val hello '())").toString() == "() : (forall ['a] (list 'a))");
// console.log(p.interpret("(define hello (bee poo) 3)").toString() == "hello : (forall ['a 'b] ('a 'b -> int))");
// console.log(p.interpret("(val-rec hello (bee poo) 3)").toString() == "hello : (forall ['a 'b] ('a 'b -> int))");
// console.log(p.interpret("(+ 3 4)").toString() == "7 : int");
// console.log(p.interpret("+").toString() == "<function> : (int int -> int)");
// console.log(p.interpret("(* 3 4)").toString() == "12 : int");
// console.log(p.interpret("(/ 3 4)").toString() == "0 : int");
// console.log(p.interpret("(- 3 4)").toString() == "-1 : int");
// console.log(p.interpret("=").toString() == "<function> : (forall ['a] ('a 'a -> bool))");
// console.log(p.interpret("(= 3 4)").toString() == "#f : bool");
// console.log(p.interpret("(= 4 4)").toString() == "#t : bool");
// console.log(p.interpret("(= '345 '345)").toString() == "#t : bool");
// console.log(p.interpret("(= '() '())").toString() == "#t : bool");
// console.log(p.interpret("(= '() '(2 3 5))").toString() == "#f : bool");
// console.log(p.interpret("(= #t #f)").toString() == "#f : bool");
// console.log(p.interpret("(= #t #t)").toString() == "#t : bool");
// console.log(p.interpret("(= (= 'a 'a) #t)").toString() == "#t : bool");
// console.log(p.interpret("(= (* 2 2) (* 4 1))").toString() == "#t : bool");
// console.log(p.interpret("(> (* 2 2) (* 4 1))").toString() == "#f : bool");
// console.log(p.interpret("(> (* 2 5) (* 4 1))").toString() == "#t : bool");
// console.log(p.interpret("(< (* 2 5) (* 4 1))").toString() == "#f : bool");
// console.log(p.interpret("(< (* 2 2) (* 4 1))").toString() == "#f : bool");
// let code = "(define recursion (hi) (if (= hi 0) hi (recursion (- hi 1))))"
// console.log(p.interpret(code).toString() == "recursion : (int -> int)");
// console.log(p.interpret("(recursion 1)").toString() == "0 : int")
// console.log(p.interpret("(val-rec mama (moo) (if (> moo 0) (mama (- moo 1)) moo))").toString() == "mama : (int -> int)")
// console.log(p.interpret("(mama 2)").toString() == "0 : int")
// console.log(p.interpret("car").toString() == "<function> : (forall ['a] ((list 'a) -> 'a))")
// console.log(p.interpret("cdr").toString() == "<function> : (forall ['a] ((list 'a) -> (list 'a)))")
// console.log(p.interpret("(car '(1 2 3))").toString() == "1 : int")
// console.log(p.interpret("(cdr '(1 2 3))").toString() == "(2 3) : (list int)")
// console.log(p.interpret("(cdr '(1))").toString() == "() : (list int)")
// console.log(p.interpret("(car '(1))").toString() == "1 : int");
// console.log(p.interpret("(mod 9 3)").toString() == "0 : int");

// // closure test
// console.log(p.interpret("(val hi 3)").toString());
// console.log(p.interpret("(val poo (lambda () hi))").toString());
// console.log(p.interpret("(val hi 5)").toString());
// console.log(p.interpret("(poo)").toString() == "3 : int");

// console.log(p.interpret("(null? '())").toString() == "#t : bool");
// console.log(p.interpret("(null? '(1 2 3))").toString() == "#f : bool");
// // console.log(p.interpret("(fst '(1 2))").toString() == "1 : int");
// // console.log(p.interpret("(snd '(1 2))").toString() == "2 : int");

// console.log(p.interpret("(cons 3 '())").toString());
// console.log(p.interpret("(cons 3 '(2 4 5))").toString());
// console.log(p.interpret("(foldr (lambda (x acc) (+ x acc)) 0 '(1 2 3 4))").toString() == "10 : int");
// console.log(p.interpret("(foldl (lambda (x acc) (+ x acc)) 0 '(1 2 3 4))").toString() == "10 : int");
// console.log(p.interpret("(exists? (lambda (x) (= 0 (mod x 2))) '(1 2 5 7))").toString())
// console.log(p.interpret("(begin)").toString() == "() : unit")
// console.log(p.interpret("(or #t #t)").toString() == "#t : bool")
// console.log(p.interpret("(or #t #f)").toString() == "#t : bool")
// console.log(p.interpret("(or (= 45 34) (= 34 34))").toString() == "#t : bool")
// console.log(p.interpret("(and (= 45 34) (= 34 34))").toString() == "#f : bool")
// console.log(p.interpret("(and (= 45 45) (= 34 34))").toString() == "#t : bool")

// console.log(p.interpret("(letrec ([listOrdered? (lambda (xs op?) (if (or (null? xs) (null? (cdr xs))) #t (and (op? (car xs) (car (cdr xs))) (listOrdered? (cdr xs) op?))))][call (lambda () (listOrdered? '(1 2 4 90) <))]) (call))").toString() == "#t : bool")
// console.log(p.interpret("(lambda (xs) (foldl (lambda (a b) (if (> a b) a b)) (car xs) xs)").toString() == "<function> : ((list int) -> int)");
// console.log(p.interpret("(pair 3 4)").toString() == "(3 . 4) : (pair int int)");
// console.log(p.interpret("pair").toString() == "<function> : (forall ['a 'b] ('a 'b -> (pair 'a 'b)))");
// console.log(p.interpret("snd").toString() == "<function> : (forall ['a 'b] ((pair 'a 'b) -> 'b))");
// console.log(p.interpret("fst").toString() == "<function> : (forall ['a 'b] ((pair 'a 'b) -> 'a))");
// console.log(p.interpret("(fst (pair 3 4))").toString() == "3 : int");
// console.log(p.interpret("(snd (pair 3 4))").toString() == "4 : int");
// console.log(p.interpret("(snd (if #t (pair 3 4) (pair 5 6)))").toString() == "4 : int");
// console.log(p.interpret("(define has-predecessor-in? (node graph) (if (null? graph) #f (if (= node (snd (car graph))) #t (has-predecessor-in? node (cdr graph)))))").toString() == "has-predecessor-in? : (forall ['a 'b] ('a (list (pair 'b 'a)) -> bool))")
// console.log(p.interpret("(define node-without-predecessors (graph) (letrec ((nwop-in-edges (lambda (edges) (if (null? edges) '() (if (has-predecessor-in? (fst (car edges)) graph) (nwop-in-edges (cdr edges)) (list1 (fst (car edges)))))))) (nwop-in-edges graph)))").toString() == "node-without-predecessors : (forall ['a] ((list (pair 'a 'a)) -> (list 'a)))")
// console.log(p.interpret("(define appears-in? (node graph) (if (null? graph) #f (if (or (= node (fst (car graph))) (= node (snd (car graph)))) #t (appears-in? node (cdr graph)))))").toString() == "appears-in? : (forall ['a] ('a (list (pair 'a 'a)) -> bool))")
// console.log(p.interpret("(define successors (node graph) (letrec ((nodesucc (lambda (graph) (if (null? graph) '() (if (= node (fst (car graph))) (cons (snd (car graph)) (nodesucc (cdr graph))) (nodesucc (cdr graph))))))) (nodesucc graph)))").toString() == "successors : (forall ['a 'b] ('a (list (pair 'a 'b)) -> (list 'b)))");
// console.log(p.interpret("(define remove-node (node graph) (letrec ((rem (lambda (graph) (if (null? graph) '() (if (or (= node (fst (car graph))) (= node (snd (car graph)))) (rem (cdr graph)) (cons (car graph) (rem (cdr graph)))))))) (rem graph)))").toString() == "remove-node : (forall ['a] ('a (list (pair 'a 'a)) -> (list (pair 'a 'a))))")
// console.log(p.interpret("(define member? (x ps) (if (null? ps) #f (if (= x (car ps)) #t (member? x (cdr ps)))))").toString() == "member? : (forall ['a] ('a (list 'a) -> bool))");
// console.log(p.interpret("(define find-a-cycle (graph) (letrec ((visit (lambda (node visited) (if (member? node visited) (cons node '()) (let ((partial-cycle (visit-list (successors node graph) (cons node visited)))) (if (null? partial-cycle) '() (cons node (cons '-> partial-cycle))))))) (visit-list (lambda (nodes visited) (if (null? nodes) '() (let ((partial-cycle (visit (car nodes) visited))) (if (not (null? partial-cycle)) partial-cycle (visit-list (cdr nodes) visited))))))) (if (null? graph) '() (let ((maybe-cycle (visit (fst (car graph)) '()))) (if (not (null? maybe-cycle)) maybe-cycle (find-a-cycle (cdr graph)))))))").toString() == "find-a-cycle : ((list (pair sym sym)) -> (list sym))")
// console.log(p.interpret("(define tsort (graph) (letrec ((aux (lambda  (graph lost-successors answer) (if (null? lost-successors) (if (null? graph) (revapp answer '()) (let ((node (node-without-predecessors graph))) (if (not (null? node)) (let ((node (car node))) (aux (remove-node node graph) (successors node graph) (cons node answer))) (cons 'The-graph-has-a-cycle: (find-a-cycle graph))))) (aux graph (cdr lost-successors) (if (appears-in? (car lost-successors) graph) answer (cons (car lost-successors) answer))))))) (aux graph '() '())))").toString() == "tsort : ((list (pair sym sym)) -> (list sym))")
// console.log(p.interpret("(define graph-of-edge-list (list) (if (null? list) '() (cons (pair (caar list) (car (cdar list))) (graph-of-edge-list (cdr list)))))").toString() == "graph-of-edge-list : (forall ['a] ((list (list 'a)) -> (list (pair 'a 'a))))")
// console.log(p.interpret("(tsort (graph-of-edge-list '((a b) (b c) (b e) (d e))))").toString() == "(a b c d e) : (list sym)");
// p.getSteps("3");
// p.getSteps("#t");
// p.getSteps("(val x 3)")
p.getSteps("(define hello (sad) sad)")