class Node{
    label: string;
    adj: Node[];

    constructor(label: string){
        this.label = label;
        this.adj = [];
    }
}

class Edge{
    from: Node;
    to: Node;
    label: string;

    constructor(from: Node, to: Node, label: string){
        this.from = from;
        this.to = to;
        this.label = label;
    }
}

class Graph{
    nodes: Node[];
    edges: Edge[];

    constructor(){
        this.nodes = [];
        this.edges = [];
    }

    addNode(label: string): Node{
        const node = new Node(label);
        this.nodes.push(node);
        return node;
    }

    addEdge(from: Node, to: Node, label: string): Edge{
        const edge = new Edge(from, to, label);
        from.adj.push(to);
        this.edges.push(edge);
        return edge;
    }
}


class Position{
    p: Node;
    qSet?: Node[]
    qStarSet?: Node[]
    q?: Node;
    isDefenderPosition: boolean

    constructor(p:Node, isDefenderPosition: boolean, qSet?:Node[], qStarSet?:Node[], q?:Node){
        this.p = p;
        this.qSet = qSet || undefined;
        this.qStarSet = qStarSet || undefined;
        this.q = q || undefined;
        this.isDefenderPosition = isDefenderPosition;
    }

    defenderStuck() {
        if(!this.isDefenderPosition) {
            throw new Error("Not a defender position.");
        }
        return (this.qSet?.length == 0 && this.qStarSet?.length == 0 ? true : false)
    }
}


class Move{
    from: Position;
    to: Position;
    update: (number | number[])[];

    constructor(from: Position, to: Position, update: (number | number[])[]){
        this.from = from;
        this.to = to;
        this.update = update
    }
}


class Game{
    positions: Position[];
    defenderPositions: Position[];
    moves: Move[];
    startPosition: Position;
    startEnergyBudget: number[];

    constructor(startPosition: Position, startEnergyBudget: number[]) {
        this.positions = [];
        this.defenderPositions = [];
        this.moves = [];
        this.startPosition = startPosition
        this.startEnergyBudget = startEnergyBudget
    }
}


function inverseUpdate(energyLevel: number[], update: (number | number[])[]){
    let parts: number[][] = [[...energyLevel]];
    update.forEach(function(u_i, i){
        //relative updates
        if (typeof(u_i) == "number"){
            parts[0][i] -= u_i;
        }
        // minimum selection updates (index starts a one)
        else{
            let part = Array(6).fill(0);
            part[u_i[0]-1] = energyLevel[i];
            part[u_i[1]-1] = energyLevel[i];
            parts.push(part);
        }
    })
    let sup = parts.pop() || [];
    parts.forEach(function(part){
        part.forEach(function(e_i, i){
            sup[i] = Math.max(sup[i], e_i);
        })
    })
    return sup;
}


function computeMinimumBudgets(newAttackerWin: number[][] , budgets: number[][]){
    newAttackerWin.push(budgets[0]);
    budgets.forEach(function(budget){
        newAttackerWin.forEach(function(minBudget){
            if (budget.every(function(e_n, i){e_n >= minBudget[i]})) {return;}
            if (budget.every(function(e_n, i){e_n <= minBudget[i]})){
                newAttackerWin.splice(newAttackerWin.indexOf(minBudget), 1);
                newAttackerWin.push(budget);
                return;
            }
            newAttackerWin.push(budget);
        })
    });
}


function computeWinningBudgets(game: Game){
    // ln 2
    let attackerWin = new Map<Position, number[][]>();
    game.positions.forEach(function(pos){
        attackerWin.set(pos, []);
    })
    // ln 3
    let todo: Position[] = [];
    game.defenderPositions.forEach(function(pos){
        if(pos.defenderStuck()){
            todo.push(pos);
        }
    })

    // ln 4
    while (todo.length > 0){
        //ln 5 and 6
        let g = todo.pop();
        let newAttackerWin: number[][] = []
        // ln 7
        if (!g!.isDefenderPosition){
            // ln 8
            //let newAttackerWin: number[][] = []
            let minToFind: number[][] = attackerWin.get(g!) || [];
            game.moves.forEach(function(move){
                if (move.from == g){
                    attackerWin.get(move.to)?.forEach(function(edash){
                        minToFind.push(inverseUpdate(edash, move.update));
                    })
                }
            })
            computeMinimumBudgets(newAttackerWin, minToFind);
        }
        // ln 9
        else{
            // ln 10
            let defenderPost: Position[] = [];
            let options = new Map<Position, number[][]>();
            // ln 10 and 11
            game.moves.forEach(function(move){
                if (move.from == g){
                    defenderPost.push(move.to)
                    attackerWin.get(move.to)?.forEach(function(energyLevel){
                        if (!options.has(move.to)){
                            options.set(move.to, []);
                        }
                        options.get(move.to)!.push(inverseUpdate(energyLevel, move.update));
                    })
                }
            })
            // ln 12
            // comparing cardinality should also be correct and more efficient
            if (defenderPost.every(function(gdash){ options.has(gdash)})){
                let optionValues: number[][] = [];
                for (let option of options.values()){
                    optionValues.push(...option);
                }
                newAttackerWin.push(optionValues.pop() || []);
                optionValues.forEach(function(energyLevel){
                    energyLevel.forEach(function(e_i, i){
                        newAttackerWin[0][i] = Math.max(newAttackerWin[0][i], e_i);
                    })
                })
            }
            //ln 16
            // duplicate elements?
            if (!(newAttackerWin.length == attackerWin.get(g!)?.length &&
                newAttackerWin.every(function(energyLevel){
                    attackerWin.get(g!)?.some(function(otherEnergylevel){
                        energyLevel.every(function(e_i, i){
                            e_i == otherEnergylevel[i]
                        })
                    })
                })
            )) {
                // ln 17
                attackerWin.set(g!, newAttackerWin);
                // ln 18
                game.moves.forEach(function(move){
                    if (move.to == g){
                        todo.push(move.from);
                    }
                })
            }
        }
    }
    // ln 19 and 20
    return attackerWin;
}


function main(){
    //P1
    let graph = new Graph();
    let s = graph.addNode("S");
    let sdash = graph.addNode("S'");
    let div = graph.addNode("Div");
    graph.addEdge(s, s, "tau");
    graph.addEdge(s, div, "en");
    graph.addEdge(s, div, "tau");
    graph.addEdge(sdash, sdash, "tau");
    graph.addEdge(sdash, div, "en");
    graph.addEdge(div, div, "tau");
    let pos = new Position(s, false, [sdash], undefined, undefined);
}

main();
export{}