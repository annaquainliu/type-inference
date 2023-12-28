// page 405 : Expression evaluations
// page 421 : Type Inference Rules

Gamma = {}
Rho = {}

function main() {
    // page 404 : nml expressions
    const input = document.getElementById("code");
    const interpretButton = document.getElementById("interpret")
    interpretButton.addEventListener("click", () => {
        parser(input.value)
    });
    
}

function parser(input) {
    input = input.replaceAll("[", "(")
    input = input.replaceAll("]", ")")
    input = input.split("(").join(" ").split(" ");
    input = input.filter(word => word != "");
    for (let i = 0; i < input.length; i++) {
        let word = input[i];
        if (word.includes(")")) {
            let brackets = word.split("");
            input = input.slice(0, i).concat(brackets).concat(input.slice(i + 1, input.length));
        }
    }
    console.log(input)
    
}


function interpret() {

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
     * @param {Subtitution} theta1 
     * @param {Substitution} theta2 
     * @returns {Substitution} self
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
}

// abstract class
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
        console.log(theta1);
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
        let keys = Object.keys(sub.mapping);
        for (let key of keys) {
            if (this.tau1.typeString == key) {
                this.tau1 = sub.mapping[key];
            }
            if (this.tau2.typeString == key) {
                this.tau2 = sub.mapping[key];
            }
        }
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
        return Substitution(map);
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
     * @param {Conapp} conapp 
     */
    solveConapp(conapp) {
        if (conapp.types.length != this.types.length) {
            throw new Error(this.typeString + " ~ " + conapp.typeString + " have different length types array");
        }
        let bigConstraint = new Equal(this.tycon, conapp.tycon);
        for (let i = 0; i < conapp.types.length; i++) {
            bigConstraint = new And(bigConstraint, new Equal(conapp.types[i], this.types[i]));
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

let tyvars = [new Tyvar(),new Tyvar() ]
let bigC = new And(new Equal(tyvars[0], Tycon.intty), new Equal(tyvars[1], new Funty([tyvars[0]], tyvars[0])));
let sub = bigC.solve();
console.log(sub);

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
     * @returns {ExpEvalBundle}
     */
    eval() {}
}

class ExpEvalBundle {
    /**
     * 
     * @param {Value} val 
     * @param {Type} tau 
     * @param {Constraint} constraint 
     */
    constructor(val, tau, constraint) {
        this.val = val;
        this.tau = tau;
        this.constraint = constraint;
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

    static makeLiteral(val) {
        if (val == "#t" || val == "#f") {
            return BoolV(val);
        }
        else if (val[0] == "'(") {

        }
        return Num(val);
    }

    // inherited methods for all subclasses
    eval() {
        return new ExpEvalBundle(this.value, this.type, this.constraint);
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

class BoolV extends Literal {
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
        let tyvar = new Tyvar();
        this.type = new Forall([tyvar], Type.listtype(tyvar))
    }
     
}

/** FOR LISTS */
class Pair extends Literal {
    

    eval() {
        let fstPackage = this.val1.eval();
        let sndPackage = this.val2.eval();
        let bigConstraint = new And(new Equal(Type.listtype(fstPackage.tau), sndPackage.tau), new And(fstPackage.constraint, sndPackage.constraint))
        return new ExpEvalBundle(this.value, sndPackage.tau, bigConstraint);
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
