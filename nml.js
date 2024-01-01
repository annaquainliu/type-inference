// page 405 : Expression evaluations
// page 421 : Type Inference Rules

function main() {
    // page 404 : nml expressions
    const input = document.getElementById("code");
    const interpretButton = document.getElementById("interpret")
    interpretButton.addEventListener("click", () => {
        let parser = new Parser();
        parser.interpret(input.value);
    });
}

// main();

class Parser {
    queue = [];
    keywords = ["let", "let*", "letrec", "val-rec", "if", "begin", "lambda"];
    interpret(value) {
        let def = this.tokenInput(value);
        return def.eval({}, {});
    }

    tokenInput(input) {
        input = input.toLowerCase();
        input = input.replaceAll("[", "(");
        input = input.replaceAll("]", ")");
        this.queue = [];
        let str = "";
        for (let i = 0; i < input.length; i++) {
            if (input[i] == "(" || input[i] == ")" || input[i] == " ") {
                if (str != "") {
                    this.queue.push(str);
                }
                if (input[i] != " ") {
                    this.queue.push(input[i]);
                }
                str = ""
            }
            else {
                str += input[i];
            }
        }
        if (this.queue[this.queue.length - 1] != str && str != "" && str != " ") {
            this.queue.push(str);
        }
        this.queue = this.queue.reverse();
        return this.tokenDefinition(this.queue.pop());
    }

    tokenDefinition(def) {
        if (def == "val") {
            return new Val(this.queue.pop(), this.tokenize(this.queue.pop()));
        }
        else if (def == "val-rec") {
            return new ValRec(this.queue.pop(), this.tokenize(this.queue.pop()));
        }
        else if (def == "define") {
            return new Define(this.queue.pop(), this.tokenize(this.queue.pop()));
        }   
        else {
            return new Val("it", this.tokenize(def));
        }
    }

    /**
     * Tokenizes code written by user
     * 
     * @param {String} exp 
     * @returns {Expression} 
     */
    tokenize(exp) {
        if (exp == "(") {
            let item = this.queue.pop();
            if (this.keywords.includes(item)) {
                return this.tokenize(item);
            }
            let fun = this.tokenize(item);
            let args = [];
            item = this.queue.pop();
            while (item != ")") {
                args.push(this.tokenize(item));
                item = this.queue.pop();
            }
            return new Apply(fun, args);
        }
        else if (exp == "if") {
            return new If(this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()));
        }
        else if (exp == "begin") {
            let item = this.queue.pop();
            let arr = []
            while (item != ")") {
                arr.push(this.tokenize(item));
                item = this.queue.pop();
            }
            return new Begin(arr);
        }
        else if (exp == "let") {
            return new Let(this.tokenLet());
        }
        else if (exp == "let*") {
            return new LetStar(this.tokenLet());
        }
        else if (exp == "letrec") {
            return new Letrec(this.tokenLet());
        }
        else if (exp == "lambda") {
            return this.tokenLambda();
        }
        else if (exp == "'") { // must be a list
            this.queue.pop();
            return this.tokenPair();
        }
        else if (exp == "#t" || exp == "#f") {
            return new Bool(exp);
        }
        else if (exp[0] == "'") {
            return new Sym(exp);
        }
        else if (/^-?\d+$/.test(exp)) { 
            return new Num(exp);
        } 
        return new Var(exp);
    }
   
    tokenPair() {
        let item = this.queue.pop();
        if (item == ")") {
            return new Nil();
        }
        return new Pair(this.tokenListLiterals(item), this.tokenPair());
    }

    tokenListLiterals(exp) {
        if (exp == "#t" || exp == "#f") {
            return new Bool(exp);
        }
        else if (/^-?\d+$/.test(exp)) {
            return new Num(exp);
        }
        else if (exp == "(") {
            return this.tokenPair();
        }
        return new Sym(exp);
    }

    //  [')', 'x', ')', ')', '3', 'x', 'let']
    tokenLet() {
        this.queue.pop(); // for (
        let bindings = this.tokenLetBindings();
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for last closing )
        return {"bindings": bindings, "exp" : exp};
    }

    tokenLetBindings() {
        if (this.queue[this.queue.length - 1] == ")") {
            this.queue.pop(); // for )
            return {};
        }
        this.queue.pop(); // for (
        let name = this.queue.pop();
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for closing )
        let obj = {};
        obj[name] = exp;
        return Object.assign(this.tokenLetBindings(), obj);
    }

    tokenLambda() {
        let params = [];
        this.queue.pop(); // opening (
        let item = this.queue.pop();
        while (item != ")") {
            params.push(item);
            item = this.queue.pop();
        }
        let exp = this.tokenize(this.queue.pop());
        this.queue.pop(); // for ending )
        return new Lambda(params, exp);
    }

}

///////////////////////////
//
//      CONSTRAINT SOLVING
//
//

// thetas!
class Substitution {

    static idsubst = new Substitution({});

    /**
     * mapsTo : creates a substitution with the type variable name and type
     * @param {String} name : type variable name
     * @param {Type} tau : type
     * @returns {Substitution}
     */
    static mapsTo(name, tau) {
        let map = {};
        map[name] = tau;
        return new Substitution(map);
    }

    /**
     * compose : Combine both substitutions
     * @param {Substitution} theta1 
     * @param {Substitution} theta2 
     * @returns {Substitution} this
     */
    compose(theta2) {
        let keys = Object.keys(theta2.mapping);
        for (let key of keys) {
            this.mapping[key] = theta2.mapping[key];
        }
        return this;
    }

    /**
     * 
     * @param {Map<String, Type>} mapping
     */
    constructor(mapping) {
        this.mapping = mapping;
    }

    toString() {
        let str = "(";
        let keys = Object.keys(this.mapping);
        for (let key of keys) {
            str += key + " |--> " + this.mapping[key].typeString + ", "
        }
        str = str.substring(0, str.length - 2);
        str += ")"
        return str;
    }
}

// abstract class
/**
 * 'a ~ s /\ 'int ~ bool
 * 
 * {a |--> int}
 */
class Constraint {

    /**
     * @returns {Substitution}
     */
    solve() {}

    /**
     * Turns constraint into string, readable format
     * @returns {String}
     */
    toString() {}

     /**
     * Substitutes a substitution into the constraint
     * @param {Substitution} sub 
     * @returns {Constraint} : returns edited constraint that is solved
     */
    consubst(sub) { }

    /**
     * Conjoins this constraint with all of the constraints in cs
     * @param {Array<Constraint>} cs
     * @returns {Constraint}
     */
    conjoin(cs) {
        if (cs.length == 0) {
            return new And(this, new Trivial());
        }
        return new And(this, cs.pop().conjoin(cs));
    }
    
    /**
     * Conjoins all of the constraints in cs
     * @param {Array<Constraint>} cs
     */
    static conjoin(cs) {
        if (cs.length == 0) {
            return new Trivial();
        }
        return cs.pop().conjoin(cs);
    }
}


class Trivial extends Constraint {

    solve() {
        return Substitution.idsubst;
    }

    toString() {
        return "T";
    }
 
    consubst(sub) {return this;}

}

class And extends Constraint {

    /**
     * /\ constraint 
     * @param {Constraint} c1 
     * @param {Constraint} c2 
     */
    constructor(c1, c2) {
        super();
        this.c1 = c1;
        this.c2 = c2;
    }

    toString() {
        return this.c1.toString() + " /\\ " + this.c2.toString();
    }

    solve() {
        let theta1 = this.c1.solve();
        let theta2 = this.c2.consubst(theta1).solve();
        return theta1.compose(theta2);
    }

    consubst(sub) { 
        this.c1.consubst(sub);
        this.c2.consubst(sub);
        return this;
    }
}

class Equal extends Constraint {

    /**
     * ~ constraint 
     * @param {Type} tau1
     * @param {Type} tau2 
     */
    constructor(tau1, tau2) {
        super();
        this.tau1 = tau1;
        this.tau2 = tau2;
    }

    toString() {
        return this.tau1.typeString + " ~ " + this.tau2.typeString;
    }

    solve() {
        return this.tau1.solve(this.tau2);
    }

    /**
     * Constitutes a theta into the constraint
     * @param {Substitution} sub 
     */
    consubst(sub) {
        this.tau1 = this.tau1.tysubst(sub);
        this.tau2 = this.tau2.tysubst(sub);
        return this;
    }
}

/**
 * 
 * 
 *  TYPES
 * 
 */
// type interface
class Type {

    constructor() {}

    static listtype(tau) {
        return new Conapp(new Tycon("list"), [tau]);
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     */
    freetyvars() {}

    /**
     * Solves any type ~ any type equality
     * @param {Type} tau 
     * @returns {Substitution}
     */
    solve(tau) { }
     /**
     * Solves tycon ~ tycon equality
     * @param {Tycon} tycon 
     * @returns {Substitution}
     */
     solveTycon(tycon) {}
 
     /**
      * Solves tycon ~ conapp equality
      * @param {Conapp} conapp 
      * @returns {Substitution}
      */
     solveConapp(conapp) {}
 
     /**
      * solves tycon ~ tyvar equality
      * @param {Tyvar} tyvar 
      * @returns {Substitution}
      */
     solveTyvar(tyvar) {}

     /**
      * Substitutes a substitution into a type
      * @param {Substitution} theta 
      * @returns {Type}
      */
     tysubst(theta) {}

     generalize(set) {
        let ftvars = this.freetyvars();
        let diff = [];
        for (let ftvar of ftvars) {
            if (!set.includes(ftvar)) {
                diff.push(ftvar);
            }
        }
        return new Forall(diff, this);
     }
}

class Tycon extends Type {
    
    static boolty = new Tycon("bool")
    static intty = new Tycon("int")
    static symty = new Tycon("sym")
    static unitty = new Tycon("unit")

    constructor(name) {
        super();
        this.name = name;
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     */
    freetyvars() {
        return [];
    }

    get typeString() {
        return this.name;
    }

    /**
     * @returns {Substitution}
     * @returns {Substitution}
     * 
     * tycon ~ any tau 
     */
    solve(tau) {
        return tau.solveTycon(this);
    }

    /**
     * Solves tycon ~ tycon equality
     * @param {Tycon} tycon 
     * @returns {Substitution}
     */
    solveTycon(tycon) {
        if (tycon.typeString == this.typeString) {
            return Substitution.idsubst;
        }
        throw new Error(tycon.typeString + " cannot equal " + this.typeString);
    }

    /**
     * Solves tycon ~ conapp equality
     * @param {Conapp} conapp 
     * @returns {Substitution}
     */
    solveConapp(conapp) {
        throw new Error(conapp.typeString + " cannot equal " + this.typeString);
    }

    /**
     * solves tycon ~ tyvar equality
     * @param {Tyvar} tyvar 
     * @returns {Substitution}
     */
    solveTyvar(tyvar) {
        let map = {};
        map[tyvar.typeString] = this;
        return new Substitution(map);
    }
    
    tysubst(sub) {
        return this;
    }
}

class Tyvar extends Type {
    static tCounter = 0;
    count;

    constructor() {
        super();
        this.count = Tyvar.tCounter;
        Tyvar.tCounter++;
    }

    get typeString() {
        return "'t" + this.count;
    }

    static reset() {
        tCounter = 0;
    }
    
    /**
     * @returns {Array<Tyvar>} Array of free type variables
     * @returns {Substitution}
     */
    freetyvars() {
        return [this];
    }

    /**
     * @returns {Substitution}
     */
    solve(tau) {
        return tau.solveTyvar(this);
    }

    /**
     * Solves tyvar ~ tycon equality
     * @param {Tycon} tycon 
     */
    solveTycon(tycon) {
        return tycon.solveTyvar(this);
    }

    /**
     * Solves tyvar ~ conapp equality
     * 
     * @param {Conapp} conapp 
     */
    solveConapp(conapp) {
        if (conapp.freetyvars().includes(this)) {
            throw new Error(this.typeString + "occurs in " + conapp.typeString);
        }
        let map = {};
        map[this.typeString] = conapp;
        return new Substitution(map);
    }

    /**
     * solves tyvar ~ tyvar equality
     * @param {Tyvar} tyvar 
     */
    solveTyvar(tyvar) {
        let map = {};
        map[this.typeString] = tyvar;
        return new Substitution(map);
    }

    tysubst(sub) {
        let type = sub.mapping[this.typeString];
        if (type == null) {
            return this;
        }
        return type;
    }
}

class Conapp extends Type {

    /**
     * 
     * @param {Tycon} tycon 
     * @param {Array<Type>} types 
     */
    constructor (tycon, types) {
        super();
        this.tycon = tycon;
        this.types = types;
    }

    get typeString() {
        let str = "(" + this.tycon.typeString;
        for (let i = 0; i < this.types.length; i++) {
            str += " " + this.types[i].typeString;
        }
        str += ")";
        return str;
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     */
    freetyvars() {
        let vars = [];
        for (let type of this.types) {
            vars = vars.concat(type.freetyvars());
        }
        return vars;
    }

    /**
     * @returns {Substitution}
     */
    solve(tau) {
        return tau.solveConapp(this);
    }

    /**
     * Solves conapp ~ tycon equality
     * @param {Tycon} tycon 
     */
    solveTycon(tycon) {
        throw new Error(tycon.typeString + " cannot equal " + this.typeString);
    }

    /**
     * Solves conapp ~ conapp equality
     * 
     * @param {Conapp} conapp 
     */
    solveConapp(conapp) {
        if (conapp.types.length != this.types.length) {
            throw new Error(this.typeString + " ~ " + conapp.typeString + " have different length types array");
        }
        let bigConstraint = new Equal(this.tycon, conapp.tycon);
        for (let i = 0; i < conapp.types.length; i++) {
            bigConstraint = new And(new Equal(conapp.types[i], this.types[i]), bigConstraint);
        }
        return bigConstraint.solve();
    }

    /**
     * solves conapp ~ tyvar equality
     * @param {Tyvar} tyvar 
     */
    solveTyvar(tyvar) {
        return tyvar.solveConapp(this);
    }

    tysubst(sub) {
        let newTypes = [];
        for (let type of this.types) {
            newTypes.push(type.tysubst(sub));
        }
        return new Conapp(this.tycon.tysubst(sub), newTypes);
    }

}

class Forall extends Type {
    /**
     * Forall datatype constructor
     * @param {Array<Tyvar>} tyvars 
     * @param {Type} tau 
     */
    constructor(tyvars, tau) {
        super();
        this.tyvars = tyvars;
        this.tau = tau;
    }

    get typeString() {
        if (this.tyvars.length == 0) {
            return this.tau.typeString;
        }
        let str = "(forall [";
        for (let i = 0; i < this.tyvars.length; i++) {
            str += this.tyvars[i].typeString + " ";
        }
        str = str.slice(0, -1);
        str += (this.tyvars.length == 0 ? "" : "] ") + this.tau.typeString + ")";
        return str;
    }

    /**
     * @returns {Array<Tyvar>} Array of free type variables
     *
     */
    freetyvars() {
        let generalized = this.tyvars;
        let tyvars = this.tau.freetyvars();
        let diff = [];
        for (let tyvar of tyvars) {
            if (!generalized.includes(tyvar)) {
                diff.push(tyvar);
            }
        }
        return diff;
    }

}

class Funty extends Conapp {

    /**
     * 
     * @param {Array<Type>} taus : Parameter types
     * @param {Type} tau : Return type
     */
    constructor(taus, tau) {
        super(new Tycon("function"), [new Conapp(new Tycon("arguments"), taus), tau]);
        this.taus = taus;
        this.tau = tau;
    }

    get typeString() {
        let str = "("
        for (let i = 0; i < this.taus.length; i++) {
            str += this.taus[i].typeString + " ";
        }
        str += "-> " + this.tau.typeString + ")";
        return str;
    }
}

class Environments {

    static freetyvars(Gamma) {
        let freevars = [];
        let taus = Object.values(Gamma);
        for (let tau of taus) {
            freevars = freevars.concat(tau.freetyvars());
        }
        return freevars;
    }

    static copy(environment) {
        return JSON.parse(JSON.stringify(environment));
    }
}

/**
 * 
 * 
 * EXPRESSIONS
 * 
 * 
 */

// Expression Interface
class Expression {

    constructor() {}

    /**
     * Evaluates the expression
     * @param {Map<String, Expression>} Rho : Mapping of names to values
     * @returns {ExpEvalBundle}
     */
    eval(Rho) {}

    /**
     * Only type checks the expression, without evaluation
     * @param {Map<String, Type>} Gamma 
     * @returns {TypeBundle} 
     */
    typeCheck(Gamma) {}
}

class TypeBundle {

    /**
     * @param {Type} tau 
     * @param {Constraint} constraint 
     */
    constructor(tau, constraint) {
        this.tau = tau;
        this.constraint = constraint;
    }
}

class ExpEvalBundle {

    /**
     * @param {Object} val
     * @param {Expression} exp : Can either be a literal or lambda
     */
    constructor(val,  exp) {
        this.val = val;
        this.exp = exp;
    }
}

class Apply extends Expression {
    exp; // function var or lambda
    args;
    /**
     * @param {Expression} exp 
     * @param {Array<Expression>} args 
     */
    constructor(exp, args) {
        super();
        this.exp = exp;
        this.args = args;
    }

    eval(Rho) {
        let lambdaBundle = this.exp.eval(Rho); 
        if (!lambdaBundle.exp instanceof Lambda) {
            throw new Error("Cannot apply a non-function value.");
        }
        let extendedClosure = lambdaBundle.exp.closure;
        let paramNames = lambdaBundle.exp.params;
        if (this.args.length != paramNames.length) {
            throw new Error("Mistmatch amount of arguments and parameters");
        }
        for (let i in this.args) {
            extendedClosure[paramNames[i]] = this.args[i].eval(Rho)
        }
        let result = lambdaBundle.exp.body.eval(extendedClosure);
        return result;
    }

    typeCheck(Gamma) {

    }
}

// abstract class
class Literal extends Expression {

    value; // string
    constraint; // Constraint
    type; // Type

    // private constructor, not meant to be instantiated
    constructor() {
        super();
        this.constraint = new Trivial();;
    }
    // inherited methods for all subclasses
    eval(Rho) {
        return new ExpEvalBundle(this.value, this);
    }

    typeCheck(Gamma) {
        return new TypeBundle(this.type, this.constraint);
    }
}

class Sym extends Literal {
    constructor(value) {
        super();
        this.value = value.substring(1);
        this.type = Tycon.symty;
    }
}

class Num extends Literal {

    constructor(int) {
        super();
        this.value = parseInt(int)
        this.type = Tycon.intty;
    }

}

class Bool extends Literal {
    constructor(bool) {
        super();
        this.value = bool;
        this.type = Tycon.boolty;
    }

}

/** EMPTY LSIT */
class Nil extends Literal {

    constructor() {
        super();
        this.value = "()";
        this.list = [];
        this.type = Type.listtype(new Tyvar());
    }
     
}

/** FOR LISTS */
class Pair extends Literal {

    eval(Rho) {
        return new ExpEvalBundle(this.value, this);
    }

    typeCheck(Gamma) {
        let fst = this.val1.typeCheck(Gamma);
        let snd = this.val2.typeCheck(Gamma);
        let bigConstraint = new And(new And(fst.constraint, snd.constraint), new Equal(Type.listtype(fst.tau), snd.tau))
        return new TypeBundle(snd.tau, bigConstraint);
    }
    /**
     * 
     * @param {Literal} val1 : expected to be type of element in list
     * @param {Pair} val2 : expected to be a listtype
     */
    constructor(val1, val2) {
        super();
        this.val1 = val1;
        this.val2 = val2;
        this.list = [val1].concat(val2.list);
        let str = "(";
        for (let i = 0; i < this.list.length; i++) {
            str += this.list[i].value + " ";
        }
        str = str.slice(0, -1);
        str += ")";
        this.value = str;
        this.type = val2.type; // dummy type 
    }
   
}

class If extends Expression {

    // all fields are of type Expression
    condition;
    trueCase; 
    falseCase;

    constructor(c, t, f) {
        super();
        this.condition = c;
        this.trueCase = t;
        this.falseCase = f;
    }

    /**
     * @returns {ExpEvalBundle}
     */
    eval(Rho) {
        let results = [this.condition.eval(Rho), this.trueCase.eval(Rho), this.falseCase.eval(Rho)];
        let index = results[0].val == "#t" ? 1 : 2;
        return new ExpEvalBundle(results[index].val, results[index].exp);
    }

    typeCheck(Gamma) {
        let results = [this.condition.typeCheck(Gamma), 
                        this.trueCase.typeCheck(Gamma), 
                        this.falseCase.typeCheck(Gamma)];
        let cs = [new Equal(results[0].tau, Tycon.boolty), new Equal(results[1].tau, results[2].tau)];
        for (let i = 0; i < results.length; i++) {
            cs.push(results[i].constraint);
        }
        let bigC = Constraint.conjoin(cs);
        return new TypeBundle(results[1].tau, bigC);
    }
}

class Var extends Expression {
    name;
    constructor(name) {
        super();
        this.name = name;
    }

    eval(Rho) {
        if (Rho[this.name] == null) {
            throw new Error(this.name + " is not in Rho.");
        }
        let value = Rho[this.name];
        return new ExpEvalBundle(value.value, value);
    }

    typeCheck(Gamma) {
        let type_scheme = Gamma[this.name];
        let tyvars = []
        for (let tyvar of type_scheme.tyvars) {
            tyvars.push(new Tyvar());
        }
        let newType = new Forall(tyvars, type_scheme.tau);
        return new TypeBundle(newType, new Trivial());
    }
}

class Begin extends Expression {

    es = [];
    /**
     * 
     * @param {Array<Expression>} es 
     */
    constructor(es) {
        super();
        this.es = es;
    }

    eval(Rho) {

    }
}

class Lambda extends Expression {

    params;
    body;
    value;
    closure;
    /**
     * @param {Array<String>} params 
     * @param {Expression} exp 
     */
    constructor(params, exp) {
        super();
        this.params = params;
        this.body = exp;
        this.value = "<function>";
        this.closure = {};
    }

    eval(Rho) {
        this.closure = Environments.copy(Rho);
        return new ExpEvalBundle(this.value, this);
    }

    typeCheck(Gamma) {
        let newGamma = Environments.copy(Gamma);
        let tyvars = []
        for (let param of this.params) {
            let tyvar = new Tyvar();
            newGamma[param] = new Forall([], tyvar);
            tyvars.push(tyvar);
        }
        let body = this.body.typeCheck(newGamma);
        return new TypeBundle(new Funty(tyvars, body.tau), body.constraint);
    }
}

class Let extends Expression {

    bindings;
    exp;

    /**
     * @param {Map<String, Object>} info
     */
    constructor(info) {
        super();
        this.bindings = info["bindings"];
        this.exp = info["exp"];
    }
}

class Letrec extends Let {

}

class LetStar extends Let {
    
}

// abstract class
class Definition {
    exp;
    name;

    /**
     * @param {String} name
     * @param {Expression} exp 
     */
    constructor(name, exp) {
        if (!exp instanceof Expression) {
            throw new Error(name + " is not assigned an expression!");
        }
        this.exp = exp;
        this.name = name;
    }

    eval(Gamma, Rho) {}

}

class DefEvalBundle {

    /**
     * 
     * @param {String} value 
     * @param {Type} tau 
     */
    constructor(value, tau) {
        this.value = value;
        this.tau = tau;
    }

    toString() {
        return this.value + " : " + this.tau.typeString;
    }
}

// function types
class Define extends Definition {

}

// val
class Val extends Definition {

    eval(Gamma, Rho) {
        let value = this.exp.eval(Rho);
        let type = this.exp.typeCheck(Gamma);
        let theta = type.constraint.solve();
        let newTau = type.tau.tysubst(theta);
        let sigma = newTau.generalize(Environments.freetyvars(Gamma));
        Gamma[this.name] = sigma;
        Rho[this.name] = value.exp;
        return new DefEvalBundle(value.val, sigma);
    }
}

class ValRec extends Definition {

}

module.exports = {Constraint : Constraint, And : And, Equal : Equal, Type : Type, Tycon : Tycon, Trivial : Trivial,
                  Parser: Parser, Forall : Forall, Conapp : Conapp, Tyvar : Tyvar, Substitution : Substitution};
