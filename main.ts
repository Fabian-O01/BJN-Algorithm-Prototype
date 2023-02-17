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
        let node = new Node(label);
        this.nodes.push(node);
        return node;
    }

    addEdge(from: Node, to: Node, label: string): Edge{
        let edge = new Edge(from, to, label);
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
        this.positions.push(startPosition);
        this.startEnergyBudget = startEnergyBudget
    }

    addPosition(position: Position){
        this.positions.push(position);
        if (position.isDefenderPosition){
            this.defenderPositions.push(position);
        }
        return position;
    }

    addMove(move: Move){
        this.moves.push(move);
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
    let sup = parts.pop()!;
    parts.forEach(function(part){
        part.forEach(function(e_i, i){
            sup[i] = Math.max(sup[i], e_i);
        })
    })
    return sup;
}


function computeMinimumBudgets(newAttackerWin: number[][] , budgets: number[][]){
    newAttackerWin.push(budgets.pop()!);
    budgets.forEach(function(budget){
        newAttackerWin.forEach(function(minBudget){
            if (budget.every(function(e_n, i){return e_n >= minBudget[i]})) {return;}
            if (budget.every(function(e_n, i){return e_n <= minBudget[i]})){
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
            attackerWin.set(pos, [Array(6).fill(0)]);
        }
    })

    // ln 4
    while (todo.length > 0){
        //ln 5 and 6
        let g = todo.pop()!;
        let newAttackerWin: number[][] = [];
        // ln 7
        if (!g.isDefenderPosition){
            // ln 8
            let minToFind: number[][] = [...attackerWin.get(g)!];
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
            if (g.defenderStuck()){
                game.moves.forEach(function(move){
                    if (move.to == g){
                        todo.push(move.from);
                    }
                })
                continue;
            }
            // ln 10
            let defenderPost: Position[] = [];
            let options = new Map<Position, number[][]>();
            // ln 10 and 11
            game.moves.forEach(function(move){
                if (move.from == g){
                    defenderPost.push(move.to)
                    attackerWin.get(move.to)!.forEach(function(energyLevel){
                        if (!options.has(move.to)){
                            options.set(move.to, []);
                        }
                        options.get(move.to)!.push(inverseUpdate(energyLevel, move.update));
                    })
                }
            })
            // ln 12
            // comparing cardinality should also be correct and more efficient
            if (defenderPost.every(function(gdash){ return options.has(gdash)})){
                // ln 13
                let optionsArray: number[][][] = [];
                for (let strats of options.values()){
                    optionsArray.push(strats);
                }
                let minToFind: number[][] = []
                if (optionsArray.length == 1){
                    minToFind.push(...optionsArray[0]);
                }
                optionsArray.forEach((gdashValues) => {
                    optionsArray.forEach((otherGdashValues) => {
                        if (gdashValues == otherGdashValues){
                            return;
                        }
            	        else{
                            gdashValues.forEach((energyLevel) =>{
                                otherGdashValues.forEach((otherEnergyLevel) => {
                                    let sup: number[] = [];
                                    for (let k = 0; k<6; k++){
                                        sup[k] = Math.max(energyLevel[k], otherEnergyLevel[k]);
                                    }
                                    minToFind.push(sup);
                                })
                            })
                        }
                    })
                })
                computeMinimumBudgets(newAttackerWin, minToFind);
            }
        }
        //ln 16
        // duplicate elements shouldn't exist
        if (!(newAttackerWin.length == attackerWin.get(g)?.length &&
            newAttackerWin.every(function(energyLevel){
                return attackerWin.get(g)?.some(function(otherEnergylevel){
                    return energyLevel.every(function(e_i, i){
                        return e_i == otherEnergylevel[i]
                    })
                })
            })
        )) {
            // ln 17
            attackerWin.set(g, newAttackerWin);
            // ln 18
            game.moves.forEach(function(move){
                if (move.to == g){
                    todo.push(move.from);
                }
            })
        }
    }
    // ln 19 and 20
    return attackerWin;
}


function main(){
    // graph from figure 4
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

    // game graph from Figure 7
    // positions
    let game = new Game(new Position(s, false, [sdash], undefined, undefined), Array(6).fill(Infinity));
    let pos1 = game.addPosition(new Position(div, false, [sdash], undefined, undefined));
    let pos2 = game.addPosition(new Position(div, true, [sdash], [], undefined));
    let pos3 = game.addPosition(new Position(div, false, undefined, undefined, sdash));
    let pos4 = game.addPosition(new Position(sdash, false, [div], undefined, undefined));
    let pos5 = game.addPosition(new Position(div, false, [], undefined, undefined));
    let pos6 = game.addPosition(new Position(div, true, [], [], undefined));
    let pos7 = game.addPosition(new Position(sdash, true, [div], [], undefined));
    let pos8 = game.addPosition(new Position(sdash, false, undefined, undefined, div));
    let pos9 = game.addPosition(new Position(sdash, true, [s, div], [], undefined));
    let pos10 = game.addPosition(new Position(sdash, false, [s, div], undefined, undefined));
    let pos11 = game.addPosition(new Position(sdash, true, [div], [s], undefined));
    let pos12 = game.addPosition(new Position(sdash, false, [s], undefined, undefined));
    // error in paper?
    let pos13 = game.addPosition(new Position(sdash, true, [s], [], undefined));
    // error in paper?
    let pos14 = game.addPosition(new Position(sdash, false, undefined, undefined, s));
    let pos15 = game.addPosition(new Position(s, false, undefined, undefined, sdash));
    let pos16 = game.addPosition(new Position(s, true, [sdash], [], undefined));
    let pos17 = game.addPosition(new Position(div, false, [div], undefined, undefined));

    // updates for moves
    let observation = [-1,0,0,0,0,0];
    let challenge = [0,-1,0,0,0,0];
    let revival = [[1,3],0,0,0,0,0];
    let answer = [0,0,0,[3,4],0,0];
    let posDecision = [[1,4],0,0,0,0,0];
    let negDecision = [[1,5],0,0,0,0,-1];

    // moves
    game.addMove(new Move(game.startPosition, pos1, observation));
    game.addMove(new Move(pos1, pos2, challenge));
    game.addMove(new Move(pos2, pos3, answer));
    game.addMove(new Move(pos3, pos1, posDecision));
    game.addMove(new Move(pos3, pos4, negDecision));
    game.addMove(new Move(pos4, pos5, observation));
    game.addMove(new Move(pos5, pos6, challenge));
    game.addMove(new Move(pos4, pos7, challenge));
    game.addMove(new Move(pos7, pos8, answer));
    game.addMove(new Move(pos8, pos4, posDecision));
    game.addMove(new Move(pos8, pos1, negDecision));
    game.addMove(new Move(game.startPosition, pos16, challenge));
    game.addMove(new Move(pos16, pos15, answer));
    game.addMove(new Move(pos15, game.startPosition, posDecision));
    game.addMove(new Move(pos15, pos12, negDecision));
    game.addMove(new Move(pos12, pos17, observation));
    game.addMove(new Move(pos12, pos13, challenge));
    game.addMove(new Move(pos13, pos14, answer));
    game.addMove(new Move(pos14, game.startPosition, negDecision));
    game.addMove(new Move(pos12, pos10, observation));
    game.addMove(new Move(pos10, pos17, observation));
    game.addMove(new Move(pos10, pos11, challenge));
    game.addMove(new Move(pos11, pos12, revival));
    game.addMove(new Move(pos11, pos8, answer));
    game.addMove(new Move(pos10, pos9, challenge));
    game.addMove(new Move(pos9, pos14, answer));
    game.addMove(new Move(pos9, pos8, answer));
    game.addMove(new Move(game.startPosition, pos17, observation));
    game.addMove(new Move(pos14, pos12, posDecision));

    computeWinningBudgets(game)
}

main();
export{}