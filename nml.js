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
    expKeywords = ["let", "let*", "letrec", "if", "begin", "lambda"];
    defineKeywords = ["val", "define", "val-rec"];

    constructor() {
        Environments.reset();
        Environments.initEnvs();
        let predefs = Environments.predefs();
        for (let predef of predefs) {
            this.interpret(predef);
        }
    }

    interpret(value) {
        let def = this.tokenInput(value);
        return def.eval(Environments.Gamma, Environments.Rho);
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
        if (this.queue.length >= 2 && this.defineKeywords.includes(this.queue[this.queue.length - 2])) {
            this.queue.pop();
            return this.tokenDefinition(this.queue.pop());
        }
        return new Val("it", this.tokenize(this.queue.pop()));
    }

    tokenDefinition(def) {
        if (def == "val") {
            return new Val(this.queue.pop(), this.tokenize(this.queue.pop()));
        }
        else if (def == "val-rec") {
            return new ValRec(this.queue.pop(), this.tokenLambda());
        }
        else if (def == "define") {
            return new Define(this.queue.pop(), this.tokenLambda());
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
            if (this.expKeywords.includes(item)) {
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
            let exp = new If(this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()), this.tokenize(this.queue.pop()));
            this.queue.pop();
            return exp;
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
        return new List(this.tokenListLiterals(item), this.tokenPair());
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
        let item = this.queue.pop();
        let bindings = [];
        while (item != ")") {
            let name = this.queue.pop();
            let exp = this.tokenize(this.queue.pop());
            bindings.push([name, exp]);
            this.queue.pop(); // for opening )
            item = this.queue.pop();
        }
        return bindings;
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
     * 
     fun compose (theta2, theta1) =
        let val domain  = union (dom theta2, dom theta1)
            val replace = tysubst theta2 o varsubst theta1
        in  mkEnv (domain, map replace domain)
        end
     * @param {Substitution} theta1 
     * @param {Substitution} theta2 
     * @returns {Substitution} this
     */
    compose(theta2) {
        let domain = Object.keys(this.mapping);
        let snd = Object.keys(theta2.mapping);
        for (let name of snd) {
            if (!domain.includes(name)) {
                domain.push(name);
            }
        }
        let mapping = {};
        for (let name of domain) {
            let tau = this.mapping[name];
            if (tau == null) {
                tau = new Tyvar(name);
            }
            mapping[name] = tau.tysubst(theta2)
        }
        return new Substitution(mapping);
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

    /**
     * @returns {Array<Tyvar>} 
     */
    freetyvars() {}
}


class Trivial extends Constraint {

    solve() {
        return Substitution.idsubst;
    }

    toString() {
        return "T";
    }
 
    consubst(sub) {return this;}

    freetyvars() {return [];}

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

    freetyvars() {
        return Tyvar.union(c1.freetyvars(), c2.freetyvars());
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

    freetyvars() {
        return Tyvar.union(this.tau1.freetyvars(), this.tau2.freetyvars());
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

    static pairtype(tau1, tau2) {
        return new Conapp(new Tycon("pair"), [tau1, tau2]);
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

     /**
      * Returns whether tyvars includes tyvar
      * @param {Array<Tyvar>} tyvars 
      * @param {Tyvar} tyvar 
      * @returns {Boolean}
      */
     static includes(tyvars, tyvar) {
        for (let ty of tyvars) {
            if (ty.typeString == tyvar.typeString) {
                return true;
            }
        }
        return false;
     }

     generalize(set) {
        let ftvars = this.freetyvars();
        let diff = [];
        for (let ftvar of ftvars) {
            if (!Type.includes(set, ftvar) && !Type.includes(diff, ftvar)) {
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

    constructor(name) {
        super();
        if (name == "" || name == undefined) {
            this.count = Tyvar.tCounter;
            this.typeString = "'t" + this.count;
            Tyvar.tCounter++;
        }
        else {
            this.typeString = name;
        }
    }

    static reset() {
        tCounter = 0;
    }

    /**
     * Returns the union of fst and snd
     * @param {Array<Tyvar>} fst 
     * @param {Array<Tyvar>} snd 
     * @returns {Array<Tyvar>}
     */
    static union(fst, snd) {
        let array = fst;
        for (let tyvar of snd) {
            if (!Type.includes(array, tyvar)) {
                array.push(tyvar);
            }
        }
        return array;
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
        if (Type.includes(conapp.freetyvars(), this)) {
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
        map[tyvar.typeString] = this;
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
            if (!Tycon.includes(generalized, tyvar)) {
                diff.push(tyvar);
            }
        }
        return diff;
    }

    tysubst(sub) {
        return this.tau.tysubst(sub);
    }

    solve(tau) {
        return this.tau.solve(tau);
    }

    alphabetasize() {
        let freetyvars = this.tyvars;
        let sub = {};
        for (let i = 0; i < freetyvars.length; i++) {
            let alpha = new Tyvar("'" + String.fromCharCode(i + 97));
            sub[freetyvars[i].typeString] = alpha;
            freetyvars[i] = alpha;
        }
        this.tau = this.tysubst(new Substitution(sub));

        return this;
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

    tysubst(sub) {
        let subTau = super.tysubst(sub);
        return new Funty(subTau.types[0].types, subTau.types[1]);
    }
}

class Environments {

    static Gamma = {};
    static Rho = {};

    static reset() {
        Environments.Gamma = {};
        Environments.Rho = {};
    }

    static initEnvs() {
        let arithTau = new Funty([Tycon.intty, Tycon.intty], Tycon.intty);
        let compareTau = new Funty([new Tyvar("a"), new Tyvar("a")], Tycon.boolty);
        let binaryParams = ["fst", "snd"];
        Environments.makeFunction("+", binaryParams, arithTau, 
                    rho => {
                        let result = new Num(rho["fst"].value + rho["snd"].value);
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("-", binaryParams, arithTau,
                    rho => {
                        let result = new Num(rho["fst"].value - rho["snd"].value);
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("/", binaryParams, arithTau,
                    rho => {
                        let result = new Num(rho["fst"].value / rho["snd"].value);
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("*", binaryParams, arithTau,
                    rho => {
                        let result = new Num(rho["fst"].value * rho["snd"].value);
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction("=", binaryParams, compareTau,
                    rho => {
                        let result = new Bool(rho["fst"].equal(rho["snd"]))
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.boolty, new Trivial()));
        Environments.makeFunction("mod", binaryParams, arithTau,
                    rho => {
                        let result = new Num(rho["fst"].value % rho["snd"].value)
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.intty, new Trivial()));
        Environments.makeFunction(">", binaryParams, new Funty([Tycon.intty, Tycon.intty], Tycon.boolty),
                    rho => {
                        let result = new Bool(rho["fst"].value > rho["snd"].value)
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.boolty, new Trivial()));
        Environments.makeFunction("<", binaryParams, new Funty([Tycon.intty, Tycon.intty], Tycon.boolty),
                    rho => {
                        let result = new Bool(rho["fst"].value < rho["snd"].value)
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Tycon.boolty, new Trivial()));
        Environments.makeFunction("car", ["list"], new Funty([Type.listtype(new Tyvar("a"))], new Tyvar("a")),
                    rho => {
                        if (rho["list"] instanceof Nil) {
                            throw new Error("Runtime error: car applied to empty list.");
                        }
                        return new ExpEvalBundle(rho["list"].val1.value, rho["list"].val1);
                    },
                    gamma => new TypeBundle(gamma["list"].tau.val1.type, new Trivial()))
        Environments.makeFunction("cdr", ["list"], new Funty([Type.listtype(new Tyvar("a"))], Type.listtype(new Tyvar("a"))),
                    rho => {
                        if (rho["list"] instanceof Nil) {
                            throw new Error("Runtime error: cdr applied to empty list.");
                        }
                        return new ExpEvalBundle(rho["list"].val2.value, rho["list"].val2);
                    },
                    gamma => new TypeBundle(gamma["list"].tau, new Trivial()))
        Environments.makeFunction("cons", ["item", "list"], new Funty([new Tyvar("a"), Type.listtype(new Tyvar("a"))], Type.listtype(new Tyvar("a"))),
                    rho => {
                        let newList = new List(rho["item"], rho["list"]);
                        return new ExpEvalBundle(newList.value, newList);
                    },
                    gamma => new TypeBundle(Type.listtype(gamma["item"].tau), new Equal(Type.listtype(gamma["item"].tau), gamma["list"].tau)))
        Environments.makeFunction("or", binaryParams, new Funty([Tycon.boolty, Tycon.boolty], Tycon.boolty), 
                    rho => {
                        let result = new Bool(rho["fst"].boolean || rho["snd"].boolean);
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Type.boolty, new Trivial()));
        Environments.makeFunction("and", binaryParams, new Funty([Tycon.boolty, Tycon.boolty], Tycon.boolty),
                    rho => {
                        let result = new Bool(rho["fst"].boolean && rho["snd"].boolean);
                        return new ExpEvalBundle(result.value, result);
                    },
                    gamma => new TypeBundle(Type.boolty, new Trivial()));
        Environments.makeFunction("pair", binaryParams, new Funty([new Tyvar("a"), new Tyvar("b")], Type.pairtype(new Tyvar("a"), new Tyvar("b"))), 
                    rho => {
                        let pair = new Pair(rho["fst"], rho["snd"]);
                        return new ExpEvalBundle(pair.value, pair);
                    },
                    gamma => new TypeBundle(Type.pairtype(gamma["fst"].tau, gamma["snd"].tau), new Trivial()))
        Environments.makeFunction("fst", ["pair"], new Funty([Tycon.pairtype(new Tyvar("a"), new Tyvar("b"))], new Tyvar("a")), 
                    rho => {
                        let fst = rho["pair"].val1;
                        return new ExpEvalBundle(fst.value, fst);
                    },
                    gamma => new TypeBundle(gamma["pair"].tau.types[0], new Trivial()));
        Environments.makeFunction("snd", ["pair"], new Funty([Tycon.pairtype(new Tyvar("a"), new Tyvar("b"))], new Tyvar("b")), 
                    rho => {
                        let snd = rho["pair"].val2;
                        return new ExpEvalBundle(snd.value, snd);
                    },
                    gamma => new TypeBundle(gamma["pair"].tau.types[1], new Trivial()));
    }

    static predefs() {
        return [
            "(define null? (xs) (= xs '()))",
            "(define foldl (f acc xs) (if (null? xs) acc (foldl f (f (car xs) acc) (cdr xs))))",
            "(define foldr (f acc xs) (if (null? xs) acc (f (car xs) (foldr f acc (cdr xs)))))",
            "(define exists? (p? xs) (if (null? xs) #f (if (p? (car xs)) #t (exists? p? (cdr xs)))))",
            "(define list1 (item) (cons item '()))"
        ]
    }

    static makeFunction(name, params, type, evalFun, typeFun) {
        let exp = new Expression();
        exp.eval = evalFun;
        exp.typeCheck = typeFun;
        let lambda = new Lambda(params, exp);
        Environments.Rho[name] = lambda;
        Environments.Gamma[name] = type.generalize([]);
    }

    static freetyvars(Gamma) {
        let freevars = [];
        let taus = Object.values(Gamma);
        for (let tau of taus) {
            freevars = freevars.concat(tau.freetyvars());
        }
        return freevars;
    }

    static copy(environment) {
        let newEnv = {};
        let names = Object.keys(environment);
        for (let name of names) {
            newEnv[name] = environment[name];
        }
        return newEnv;
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

    equal(snd) {
        throw new Error("Compared expressions for equality.");
    }
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
        let extendedClosure = Environments.copy(lambdaBundle.exp.closure);
        let paramNames = lambdaBundle.exp.params;
        if (this.args.length != paramNames.length) {
            throw new Error("Mistmatch amount of arguments and parameters");
        }
        for (let i in this.args) {
            extendedClosure[paramNames[i]] = this.args[i].eval(Rho).exp
        }
        let result = lambdaBundle.exp.body.eval(extendedClosure);
        return result;
    }

    /*
        ty (APPLY (f, actuals)) = 
             (case typesof (f :: actuals, Gamma)
                of ([], _) => raise InternalError "pattern match"
                 | (funty :: actualtypes, c) =>
                      let val rettype = freshtyvar ()
                      in  (rettype, c /\ (funty ~ funtype (actualtypes, rettype)
                                                                              ))
                      end)
    */
    typeCheck(Gamma) {
        let funtyAndC = this.exp.typeCheck(Gamma);
        let taus = [funtyAndC.tau];
        let constraints = [funtyAndC.constraint];
        for (let arg of this.args) {
            let tyC = arg.typeCheck(Gamma);
            taus.push(tyC.tau);
            constraints.push(tyC.constraint);
        }
        let tyvar = new Tyvar();
        let funty = new Funty(taus.slice(1), tyvar);
        constraints.push(new Equal(taus[0], funty));
        let bigC = Constraint.conjoin(constraints);
        return new TypeBundle(tyvar, bigC);
    }
}

// abstract class
class Literal extends Expression {

    value;
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

    /**
     * @param {Literal} snd 
     */
    equal(snd) {
        return this.value == snd.value;
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
        let result = int;
        if (int instanceof String) {
            result = parseInt(int);
        }
        this.value = Math.floor(result);
        this.type = Tycon.intty;
    }

}

class Bool extends Literal {
    /**
     * 
     * @param {String or Boolean} bool 
     */
    constructor(bool) {
        super();
        // bool is of type boolean
        if (bool == true || bool == false) {
            this.value = bool ? "#t" : "#f";
            this.boolean = bool;
        }
        else {
            this.value = bool;
            this.boolean = bool == "#t"
        }
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
class List extends Literal {

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
     * @param {List} val2 : expected to be a listtype
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

class Pair extends Literal {

    /**
     * @param {Literal} val1 
     * @param {Literal} val2 
     */
    constructor(val1, val2) {
        super();
        this.val1 = val1;
        this.val2 = val2;
        this.value = "(" + val1.value + " . " + val2.value + ")";
        this.type = Tycon.pairtype(this.val1.type, this.val2.type); // dummy type
    }

    typeCheck(Gamma) {
        let tau1 = this.val1.typeCheck(Gamma);
        let tau2 = this.val2.typeCheck(Gamma);
        return new TypeBundle(Tycon.pairtype(tau1.tau, tau2.tau), new And(tau1.constraint, tau2.constraint));
    }
}

class Unit extends Literal {

    constructor() {
        super();
        this.value = "()";
        this.type = Tycon.unitty;
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
        let condition = this.condition.eval(Rho);
        let result = condition.val == "#t" ? this.trueCase.eval(Rho) : this.falseCase.eval(Rho);
        return result;
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
        let sub = {};
        for (let tyvar of type_scheme.tyvars) {
            let newTyvar = new Tyvar();
            sub[tyvar.typeString] = newTyvar;
        }
        let newType = type_scheme.tau.tysubst(new Substitution(sub));
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
        let unit = new Unit();
        let lastResult = new ExpEvalBundle(unit.value, unit);
        for (let e of this.es) {
            lastResult = e.eval(Rho);
        }
        return lastResult;
    }

    typeCheck(Gamma) {
        let lastTau = Tycon.unitty;
        let constraints = [];
        for (let e of this.es) {
            let tauBundle = e.typeCheck(Gamma);
            lastTau = tauBundle.tau;
            constraints.push(tauBundle.constraint);
        }
        let bigC = Constraint.conjoin(constraints);
        return new TypeBundle(lastTau, bigC);
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
    /**
     * Evaluate all expressions in the bindings
     * Evaluate let body in extended rho environment
     * Return the evaluation of the body
     * @param {Map<String, Expression>} Rho 
     */
    eval(Rho) {
        let newRho = Environments.copy(Rho);
        for (let entry of this.bindings) {
            newRho[entry[0]] = entry[1].eval(Rho).exp;
        }
        return this.exp.eval(newRho);
    }

    typeCheck(Gamma) {
        let types = [];
        let constraints = [];
        let names = this.bindings.map(entry => entry[0]);
        for (let entry of this.bindings) {
            let typeBundle = entry[1].typeCheck(Gamma);
            types.push(typeBundle.tau);
            constraints.push(typeBundle.constraint);
        }
        let c = Constraint.conjoin(constraints);
        return this.solveRestWithC(c, Gamma, types, names);
    }

    solveRestWithC(c, Gamma, types, names) {
        let theta = c.solve();
        let domTheta = Object.keys(theta);
        let freetyvars = Environments.freetyvars(Gamma);
        let inter = [];
        for (let freetyvar of freetyvars) {
            if (domTheta.includes(freetyvar.typeString)) {
                inter.push(freetyvar);
            }
        }
        let alphaConstraints = [];
        for (let alpha of inter) {
            alphaConstraints.push(new Equal(alpha, alpha.tysubst(theta)));
        }
        let cPrime = Constraint.conjoin(alphaConstraints);
        let constraintfreetyvars = cPrime.freetyvars();
        let union = Tyvar.union(constraintfreetyvars, freetyvars);
        let sigmas = [];
        for (let tau of types) {
            let sigma = tau.tysubst(theta).generalize(union);
            sigmas.push(sigma)
        }
        let extendedGamma = Environments.copy(Gamma);
        for (let i in names) {
            extendedGamma[names[i]] = sigmas[i];
        }
        let tauBundle = this.exp.typeCheck(extendedGamma);
        return new TypeBundle(tauBundle.tau, new And(tauBundle.constraint, cPrime));
    }
}

class Letrec extends Let {

    eval(Rho) {
        //parsing
        let exps = this.bindings.map(entry => entry[1]);
        for (let exp in exps) {
            if (!exp instanceof Lambda) {
                throw new Error("Expression bound in letrec binding is not a lambda.");
            }
        }
        let newRho = Environments.copy(Rho);
        for (let entry of this.bindings) {
            newRho[entry[0]] = entry[1].eval({}).exp;
        }
        for (let entry of this.bindings) {
            newRho[entry[0]].closure = newRho;
        }
        return this.exp.eval(newRho);
    }

    typeCheck(Gamma) {
        let tyvars = []; // distinct and fresh type variables
        let names = this.bindings.map(entry => entry[0]);
        let exps = this.bindings.map(entry => entry[1]);
        let gammaPrime = Environments.copy(Gamma);
        for (let name of names) {
            let tyvar = new Tyvar();
            tyvars.push(tyvar);
            gammaPrime[name] = new Forall([], tyvar);
        }
        let taus = [];
        let constraints = [];
        for (let exp of exps) {
            let tauAndC = exp.typeCheck(gammaPrime);
            taus.push(tauAndC.tau);
            constraints.push(tauAndC.constraint);
        }
        for (let i in taus) {
            constraints.push(new Equal(taus[i], tyvars[i]));
        }
        let constraint = Constraint.conjoin(constraints);
        let final = this.solveRestWithC(constraint, Gamma, taus, names);
        return final;
    }
}

class LetStar extends Let {
    
    eval(Rho) {
        let newRho = Environments.copy(Rho);
        for (let entry of this.bindings) {
            newRho[entry[0]] = entry[1].eval(newRho).exp;
        }
        return this.exp.eval(newRho);
    }

    typeCheck(Gamma) {
        if (this.bindings.length == 0) {
            return this.exp.typeCheck(Gamma);
        }
        let newLet = new Let({"bindings" : [this.bindings[0]], 
                              "exp" : new LetStar({"bindings" : this.bindings.slice(1), "exp" : this.exp})});
        return newLet.typeCheck(Gamma);
    }
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
        this.tau = tau.alphabetasize();
    }

    toString() {
        return this.value + " : " + this.tau.typeString;
    }
}

// function types
class Define extends Definition {

    eval(Gamma, Rho) {
        return new ValRec(this.name, this.exp).eval(Gamma, Rho);
    }   
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
        let name = value.val;
        if (this.name != "it" && value.exp instanceof Lambda) {
            name = this.name;
        }
        return new DefEvalBundle(name, sigma);
    }
}

class ValRec extends Definition {

    constructor(name, exp) {
        super(name, exp);
        if (!exp instanceof Lambda) {
            throw new Error("val-rec/define not given a lambda expression!");
        }
    }

    /**
     * 
     *
        let val alpha    = freshtyvar ()
            val Gamma'   = bindtyscheme (x, FORALL ([],
                                            alpha), Gamma)
            val (tau, c) = typeof (e, Gamma')
            val theta    = solve (c /\ alpha ~ tau)
            val sigma    = generalize (tysubst theta alpha,
                                    freetyvarsGamma Gamma)
        in  (bindtyscheme (x, sigma, Gamma),
                                    typeSchemeString sigma)
        end
     */
    eval(Gamma, Rho) {
        // evaluation
        let lambda = this.exp.eval({});
        Rho[this.name] = lambda.exp;
        lambda.exp.closure = Rho;
        
        //type inference
        let alpha = new Tyvar();
        let gammaPrime = Environments.copy(Gamma);
        gammaPrime[this.name] = new Forall([], alpha);
        let type = this.exp.typeCheck(gammaPrime);
        let constraint = new And(type.constraint, new Equal(alpha, type.tau));
        let theta = constraint.solve();
        let subbedTau = alpha.tysubst(theta);
        let sigma = subbedTau.generalize(Environments.freetyvars(Gamma));
        Gamma[this.name] = sigma;
        return new DefEvalBundle(this.name, sigma);
    }
}
 
module.exports = {Constraint : Constraint, And : And, Equal : Equal, Type : Type, Tycon : Tycon, Trivial : Trivial,
                  Parser: Parser, Forall : Forall, Conapp : Conapp, Tyvar : Tyvar, Substitution : Substitution,
                  Environments : Environments};
