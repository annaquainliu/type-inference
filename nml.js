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

class Literal extends Expression {

    value;
    constraint;

    constructor() {
        this.constraint = Constraint.trivial;
    }

    static makeLiteral(val) {
        if (val == "#t" || val == "#f") {
            return BoolV(val);
        }
        return Num(val);
    }

    get type() {}

    eval() {
        return this.value;
    }
}

class Sym extends Literal {
    get type() {
        return "sym"
    }
    constructor(value) {
        super();
        this.value = value;
    }
}

class Num extends Literal {
    get type() {
        return "int"
    }
    constructor(int) {
        super();
        this.value = parseInt(int)
    }

}

class BoolV extends Literal {
    get type() {
        return "bool"
    }
    constructor(bool) {
        super();
        this.value = bool;
    }

}

/** EMPTY LSIT */
class Nil extends Literal {

    value = "'()"
    get type() {
        return 
    }
}

/** FOR LISTS */
class Pair extends Literal {

    val1;
    val2;
    get type() {

    }

    eval() {

    }
    /**
     * 
     * @param {Literal} val1 
     * @param {Literal} val2 
     */
    constructor(val1, val2) {
        this.val1 = val1;
        this.val2 = val2;

    }
   
}

/**
 * 
 * TYPES
 * 
 * 
 */
// type interface
class Type {
    typeString;
    constructor(name) {
        this.typeString = name;
    }
}

class Tycon extends Type {
    
    static boolty = Tycon("bool")
    static intty = Tycon("int")
    static symty = Tycon("sym")
    static unitty = Tycon("unit")

    constructor(name) {
        super(name);
    }
}

class Tyvar extends Type {
    static tCounter = -1;

    constuctor() {
        tCounter++;
        super("'t" + tCounter);
    }

    static reset() {
        tCounter = 0;
    }
}

class Conapp extends Type {

    /**
     * 
     * @param {Tycon} tycon 
     * @param {Array<Type>} types 
     */
    constructor (tycon, types) {
        this.tycon = tycon;
        this.types = types;
        str = "(" + this.tycon.typeString;
        for (let i = 0; i < types.length; i++) {
            str += " " + types[i].typeString;
        }
        super(str)
    }

}

class Forall extends Type {


    /**
     * Forall datatype constructor
     * @param {Array<Tyvar>} tyvars 
     * @param {Type} tau 
     */
    constructor(tyvars, tau) {
        this.tyvars = tyvars;
        this.tau = tau;
        str = "(forall [";
        for (let i = 0; i < tyvars.length; i++) {
            str += tyvars[i].typeString + " ";
        }
        str = str.slice(0, -1);
        str += "] " + tau.typeString;
    }
}

class Funty extends Type {

    /**
     * 
     * @param {Array<Type>} taus : Parameter types
     * @param {Type} tau : Return type
     */
    constructor(taus, tau) {
        this.taus = taus;
        this.tau = tau;
        str = "("
        for (let i = 0; i < taus.length; i++) {
            str += taus[i].typeString + " ";
        }
        str += "-> " + tau + ")";
    }
}

///////////////////////////
//
//      CONSTRAINT SOLVING
//
//
class Constraint {
    static trivial = "T"
}
