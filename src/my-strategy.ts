// ['log', 'warn'].forEach(function(method) {
//     var old = console[method];
//     console[method] = function() {
//       var stack = (new Error()).stack.split(/\n/);
//       // Chrome includes a single "Error" line, FF doesn't.
//       if (stack[0].indexOf('Error') === 0) {
//         stack = stack.slice(1);
//       }
//       var args = [].slice.apply(arguments).concat([stack[1].trim()]);
//       return old.apply(console, args);
//     };
//   });

// console.log = function () { }

class PriorityQueue {
    elements: { data: any, priority: number }[]
    constructor() {
        this.elements = [];
    }
    enqueue(element: any, priority: number) {
        const obj = { data: element, priority: priority }
        for (let i = 0; i < this.elements.length; i++) {
            if (this.elements[i].priority >= obj.priority) {
                this.elements.splice(i, 0, obj);
                return
            }
        }
        this.elements.push(obj) //worst priority
    }
    dequeue() {
        if (this.elements.length === 0) {
            return 'Queue is already empty'
        }
        return this.elements.pop()
    }
    peek() {
        return this.elements[this.elements.length - 1]
    }
    isEmpty() {
        return this.elements.length === 0
    }
    printQueue() {
        var str = "Enqueue--->";
        for (var i = 0; i < this.elements.length; i++) {
            str += ` ${JSON.stringify(this.elements[i])}, `
        }
        str += "->Dequeue--->"
        console.log(str)
    }
}



function get_distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function get_distance_by_planet_idxs(planet_a_idx: number, planet_b_idx: number) {
    const planet_a = ALL_PLANETS[planet_a_idx]
    const planet_b = ALL_PLANETS[planet_b_idx]
    return get_distance(planet_a.x, planet_a.y, planet_b.x, planet_b.y)
}


function get_planet_neighbors(planet_idx: number) {
    return NEARBY_PLANETS[planet_idx].map((el) => el.planet_idx)
}


function _cost(planet_a_idx: number, planet_b_idx: number, evade_enemies: boolean) {
    const distance = get_distance_by_planet_idxs(planet_a_idx, planet_b_idx)
    if (evade_enemies && ALL_PLANETS[planet_b_idx].workerGroups.length > 0 && get_total_num_of_enemies_on_planet(planet_b_idx) > 0) {
        return distance + get_total_num_of_enemies_on_planet(planet_b_idx) * 10000
    } else {
        return distance
    }
}

function backtrace(came_from: any[], end_planet_idx: number) {
    const path = [end_planet_idx]
    if (came_from[end_planet_idx] === undefined) {
        return false
    }
    while (true) {
        const last_element = path[path.length - 1]
        const next_element = came_from[last_element]
        if (next_element !== null) {
            path.push(next_element)
        } else {
            break
        }
    }
    return path.reverse()
}

function a_star_search(start_planet_idx: number, end_planet_idx: number, only_get_distance: boolean, evade_enemies: boolean, planets_to_evade: number[]) {
    const points_to_visit = new PriorityQueue();
    points_to_visit.enqueue(start_planet_idx, 0)
    const came_from = new Array(200)
    came_from[start_planet_idx] = null;
    const cost_so_far = new Array(200)
    cost_so_far[start_planet_idx] = 0
    while (!(points_to_visit.isEmpty())) {
        const current_planet_idx = (points_to_visit.dequeue() as any).data
        if (current_planet_idx === end_planet_idx && current_planet_idx === end_planet_idx) {
            break;
        }
        let neighbors = get_planet_neighbors(current_planet_idx)
        if (planets_to_evade.length !== 0) {
            neighbors = neighbors.filter((el) => !planets_to_evade.includes(el))
        }
        for (const next_planet_idx of neighbors) {
            const new_cost = cost_so_far[current_planet_idx] + _cost(current_planet_idx, next_planet_idx, evade_enemies)
            if (came_from[next_planet_idx] === undefined || new_cost < cost_so_far[next_planet_idx]) {
                cost_so_far[next_planet_idx] = new_cost;
                const priority = new_cost + _cost(end_planet_idx, next_planet_idx, evade_enemies)
                points_to_visit.enqueue(next_planet_idx, -priority)
                came_from[next_planet_idx] = current_planet_idx
            }
        }
    }

    if (only_get_distance) {
        return cost_so_far[end_planet_idx]
    } else {
        return backtrace(came_from, end_planet_idx)
    }
}

import { Game } from "./model/game";
import { Action } from "./model/action";
import { MoveAction } from "./model/move-action";
import { BuildingAction } from "./model/building-action";
import { BuildingType } from "./model/building-type";
import { Resource } from "./model/resource";
import { Planet } from "./model/planet";
import { exit } from "process";
import { Player } from "./model/player";
import { Specialty } from "./model/specialty";
import { FlyingWorkerGroup } from "./model/flying-worker-group";


function get_building_priority(building: BuildingType | undefined) {
    if (building === undefined) {
        return -1
    }
    switch (building) {
        case BuildingType.REPLICATOR:
        case BuildingType.REPLICATOR2:
        case BuildingType.REPLICATOR3:
            return 0

        case BuildingType.CHIP_FACTORY:
            return 1
        case BuildingType.ACCUMULATOR_FACTORY:
            return 2

        case BuildingType.FARM:
            return 3
        case BuildingType.CAREER:
            return 4

        case BuildingType.QUARRY:
            return 100

        default:
            return 90
    }
}
let INITIAL_BUILDINGS: { MINES: { planet_idx: number; cur_workers: number; done?: boolean }[]; CAREER: { planet_idx: number; cur_workers: number; done?: boolean }[]; FARM: { planet_idx: number; cur_workers: number; done?: boolean }[]; FOUNDRY: { planet_idx: number; cur_workers: number; ore_sources: { [key: number]: number; }; done?: boolean }[]; FURNANCE: { planet_idx: number; cur_workers: number; sand_sources: { [key: number]: number; }; done?: boolean }[]; BIOREACTOR: { planet_idx: number; cur_workers: number; organics_sources: { [key: number]: number; }; done?: boolean }[]; CHIP_FACTORY: { planet_idx: number; cur_workers: number; metal_sources: { [key: number]: number; }; silicon_sources: { [key: number]: number; }; done?: boolean }[]; ACC_FACTORY: { planet_idx: number; cur_workers: number; metal_sources: { [key: number]: number; }; plastic_sources: { [key: number]: number; }; done?: boolean }[]; REPLICATOR: { planet_idx: number; cur_workers: number; metal_sources: { [key: number]: number; }; chip_sources: { [key: number]: number; }; acc_sources: { [key: number]: number; }; done?: boolean }[]; }
let TOTAL_BUILDINGS: { [key: string]: number; }
let BUILDING_SELF_WORKERS_NUM: { [key: string]: number; }
//@ts-ignore
INITIAL_BUILDINGS = {}
let BUILD_LIST: { planet_idx: number, needed_resources: any, action: BuildingAction }[] = []
let OUR_STARTING_PLANET_IDX: number
let OUR_ZONE: number[] = []
const ENEMY_ZONE: number[] = []

const NEARBY_PLANETS: Array<Array<{ distance: number, planet_idx: number, planet: Planet }>> = []

let ALL_PLANETS: Planet[]

let FNS_GLOBAL_ID = 0
const FLYING_NAVIGATION_SYSTEM = new Map<number, {
    intent: string,
    departure_tick: number
    next_arrival_tick: number,
    from_planet: number,
    next_planet: number,
    destination: number,
    path: number[],
    amount: number,
    resource: Resource | null,
    evade_enemies: boolean,
    finished: boolean
}>()

function get_passing_by_flying_couriers(planet_idx: number) {
    let passing_by = 0
    for (const x of FLYING_NAVIGATION_SYSTEM.values()) {
        if (x.from_planet !== -1 && !x.finished && x.destination !== planet_idx && x.next_arrival_tick === CURRENT_TICK && x.next_planet === planet_idx) {
            passing_by += x.amount
        }
    }
    return passing_by
}

function get_how_many_foreign_workers(planet_idx: number) {
    let foreign_workers = 0
    for (const x of FLYING_NAVIGATION_SYSTEM.values()) {
        if ((x.next_planet === planet_idx && x.next_arrival_tick === CURRENT_TICK) || (x.from_planet === planet_idx && x.departure_tick === CURRENT_TICK)) {
            foreign_workers += x.amount
        }

    }
    return foreign_workers
}

function get_how_many_foreign_workers_excluding_if_our_destination(planet_idx: number) {
    let foreign_workers = 0
    for (const x of FLYING_NAVIGATION_SYSTEM.values()) {
        if (x.destination === planet_idx) { continue }
        if ((x.next_planet === planet_idx && x.next_arrival_tick === CURRENT_TICK) || (x.from_planet === planet_idx && x.departure_tick === CURRENT_TICK)) {
            foreign_workers += x.amount
        }

    }
    return foreign_workers
}



function get_how_many_flying_to_planet(planet_idx: number, intent?: string) {
    let flying_to_target = 0
    for (const x of FLYING_NAVIGATION_SYSTEM.values()) {
        if (intent) {
            if (x.intent === intent && x.destination === planet_idx && !(x.finished && x.next_arrival_tick <= CURRENT_TICK)) {
                flying_to_target += x.amount
            }
        } else {
            if (x.destination === planet_idx && !(x.finished && x.next_arrival_tick <= CURRENT_TICK)) {
                flying_to_target += x.amount
            }
        }
    }
    return flying_to_target
}


function check_if_already_flying_to_planet(planet_idx: number, intent?: string) {
    for (const x of FLYING_NAVIGATION_SYSTEM.values()) {
        if (x.destination === planet_idx) {
            if (intent) {
                if (x.intent === intent) {
                    return true
                }
            } else {
                return true
            }

        }
    }
    return false
}

function add_to_FNS(planet_a_idx: number, planet_b_idx: number, amount: number, resource: Resource | null, evade_enemies: boolean, intent: string) {
    const path = cached_a_star_search(planet_a_idx, planet_b_idx, false, evade_enemies)
    FNS_GLOBAL_ID++
    // if(FNS_GLOBAL_ID===237){
    //     exit()
    // }
    FLYING_NAVIGATION_SYSTEM.set(FNS_GLOBAL_ID, {
        intent: intent,
        departure_tick: CURRENT_TICK,
        next_arrival_tick: CURRENT_TICK,
        from_planet: -1,
        next_planet: path[0],
        path: path,
        destination: planet_b_idx,
        amount: amount,
        resource: resource,
        evade_enemies: evade_enemies,
        finished: false
    })
    path.shift() //шиза
    return FNS_GLOBAL_ID
}
const FNS_ARCHIVE = new Map<number, {
    intent: string,
    departure_tick: number,
    next_arrival_tick: number,
    from_planet: number,
    next_planet: number,
    destination: number,
    path: number[],
    amount: number,
    resource: Resource | null,
    evade_enemies: boolean,
    finished: boolean
}>()
function execute_FNS(MOVES: MoveAction[]) {
    // if (FLYING_NAVIGATION_SYSTEM.get(17)) {
    //     console.log("++++++++++++++++++++++++")
    //     console.log(FLYING_NAVIGATION_SYSTEM.get(17))
    //     console.log("++++++++++++++++++++++++")
    // }
    // if(CURRENT_TICK===144){
    //     console.log(FLYING_NAVIGATION_SYSTEM)
    //     exit()
    // }
    for (const [key, value] of FLYING_NAVIGATION_SYSTEM.entries()) {
        const flying_group = value
        if (flying_group.finished) {
            if (CURRENT_TICK >= flying_group.next_arrival_tick) {
                FNS_ARCHIVE.set(key, value)
                FLYING_NAVIGATION_SYSTEM.delete(key)
            }
            continue
        }

        if (!flying_group.finished && CURRENT_TICK > flying_group.next_arrival_tick) {
            FLYING_NAVIGATION_SYSTEM.delete(key)
            continue
        }
        // if(CURRENT_TICK===144){
        //     console.log(FLYING_NAVIGATION_SYSTEM)
        //     exit()
        // }

        if (flying_group.next_arrival_tick === CURRENT_TICK) {
            if (flying_group.from_planet === -1) {
                flying_group.from_planet = flying_group.next_planet
            }

            if (flying_group.path.length !== 0 && flying_group.amount > 0) {
                const new_path = flying_group.path
                flying_group.from_planet = flying_group.next_planet

                if (flying_group.evade_enemies && flying_group.path.length > 1) { //every time
                    flying_group.path = cached_a_star_search(flying_group.from_planet, flying_group.path[flying_group.path.length - 1], false, true)
                    flying_group.path.shift()
                }

                flying_group.next_planet = (new_path.shift() as number)

                flying_group.path = new_path
                const dist = CURRENT_TICK + get_distance_by_planet_idxs(flying_group.from_planet, flying_group.next_planet)
                flying_group.departure_tick = CURRENT_TICK
                flying_group.next_arrival_tick = dist
                MOVES.push(new MoveAction(flying_group.from_planet, flying_group.next_planet, flying_group.amount, flying_group.resource))
                // console.log(FLYING_NAVIGATION_SYSTEM)
                if (new_path.length === 0) {
                    flying_group.finished = true
                }
                FLYING_NAVIGATION_SYSTEM.set(key, flying_group)
            }
        }
    }
}


let CS_GLOBAL_ID = 0
const COURIER_SYSTEM = new Map<number, {
    from_planet_idx: number,
    to_planet_idx: number,
    amount: number,
    res: Resource | null,
    flying_id: number
}>()

function add_to_CS(from_planet_idx: number, to_planet_idx: number, amount: number, res: Resource | null) {
    CS_GLOBAL_ID++
    COURIER_SYSTEM.set(CS_GLOBAL_ID, { from_planet_idx: from_planet_idx, to_planet_idx: to_planet_idx, amount: amount, res: res, flying_id: -1 })
    return CS_GLOBAL_ID
}

let COURIER_GLOBAL_STOP = false

function execute_CS() {
    if (COURIER_GLOBAL_STOP) { return }
    for (const [key, value] of COURIER_SYSTEM.entries()) {
        const courier_group = value
        if (courier_group.flying_id === -1) {
            if (get_num_of_workers_fail_safe(courier_group.from_planet_idx) > 0) { //ALL_PLANETS[courier_group.from_planet_idx].workerGroups[0].number > courier_group.amount
                let courier_amount = 0
                const real_num_of_workers_planet = get_num_of_workers_fail_safe(courier_group.from_planet_idx) - get_passing_by_flying_couriers(courier_group.from_planet_idx)
                if (courier_group.res) {

                    let res_on_planet = (ALL_PLANETS[courier_group.from_planet_idx].resources.get(courier_group.res)) || 0

                    if (res_on_planet === 0) {
                        continue
                    }
                    courier_amount = Math.min(courier_group.amount, real_num_of_workers_planet, res_on_planet)
                    ALL_PLANETS[courier_group.from_planet_idx].resources.set(courier_group.res, res_on_planet - courier_amount)
                } else {
                    courier_amount = Math.min(courier_group.amount, real_num_of_workers_planet)
                }
                if (courier_amount <= 0) {
                    continue
                }
                // ALL_PLANETS[courier_group.from_planet_idx].workerGroups[0].number-=courier_amount
                const flying_id = add_to_FNS(courier_group.from_planet_idx, courier_group.to_planet_idx, courier_amount, courier_group.res, true, "courier")
                courier_group.flying_id = flying_id
                COURIER_SYSTEM.set(key, courier_group)
            } else {
                COURIER_SYSTEM.delete(key)
                continue
            }
        } else {
            let flying_group = FLYING_NAVIGATION_SYSTEM.get(courier_group.flying_id)
            if (flying_group === undefined) {
                flying_group = FNS_ARCHIVE.get(courier_group.flying_id)
            }
            if (flying_group === undefined) {
                COURIER_SYSTEM.delete(key)
                continue
            }
            if (flying_group?.finished && CURRENT_TICK - flying_group.next_arrival_tick > 20) {
                COURIER_SYSTEM.delete(key)
                continue
            }
            if (flying_group?.finished && CURRENT_TICK >= flying_group.next_arrival_tick) {
                if (flying_group.next_planet === courier_group.to_planet_idx) { //target_planet
                    const real_num_of_workers_planet = get_num_of_workers_fail_safe(courier_group.to_planet_idx) - get_passing_by_flying_couriers(courier_group.to_planet_idx) - BUILDING_SELF_WORKERS_NUM[courier_group.to_planet_idx]
                    const flying_id = add_to_FNS(courier_group.to_planet_idx, courier_group.from_planet_idx, Math.min(flying_group.amount, real_num_of_workers_planet), null, true, "courier_empty_back")
                    courier_group.flying_id = flying_id
                    COURIER_SYSTEM.set(key, courier_group)
                } else if (get_num_of_workers_fail_safe(courier_group.from_planet_idx) > 0 && flying_group.next_planet === courier_group.from_planet_idx) {

                    const real_num_of_workers_planet = get_num_of_workers_fail_safe(courier_group.from_planet_idx) - get_passing_by_flying_couriers(courier_group.from_planet_idx) - BUILDING_SELF_WORKERS_NUM[courier_group.from_planet_idx]
                    let courier_amount = 0
                    if (courier_group.res) {
                        let res_on_planet = (ALL_PLANETS[courier_group.from_planet_idx].resources.get(courier_group.res)) || 0
                        if (res_on_planet === 0) {
                            continue
                        }
                        courier_amount = Math.min(courier_group.amount, real_num_of_workers_planet, res_on_planet)
                        ALL_PLANETS[courier_group.from_planet_idx].resources.set(courier_group.res, res_on_planet - courier_amount)
                    } else {
                        courier_amount = Math.min(courier_group.amount, real_num_of_workers_planet)
                    }
                    if (courier_amount <= 0) {
                        continue
                    }
                    const flying_id = add_to_FNS(courier_group.from_planet_idx, courier_group.to_planet_idx, courier_amount, courier_group.res, true, "courier")
                    courier_group.flying_id = flying_id
                    COURIER_SYSTEM.set(key, courier_group)
                }
            }
        }
    }
}

function get_replicator_idx(empty_planets: number[], ore_planets: number[], organics_planets: number[], sand_planets: number[]) {
    const taken: number[] = []

    let ore_min_dist = Infinity
    let ore_center_idx = -1
    ore_main: for (const empty_planet_idx of empty_planets) {
        if (!taken.includes(empty_planet_idx)) {
            let min_dist = 0
            for (const ore_planet_idx of ore_planets) {
                min_dist += cached_a_star_search(empty_planet_idx, ore_planet_idx, true, false)
                if (min_dist >= ore_min_dist) {
                    continue ore_main
                }
            }
            ore_min_dist = min_dist
            ore_center_idx = empty_planet_idx
        }
    }

    let organics_min_dist = Infinity
    let organics_center_idx = -1
    organics_main: for (const empty_planet_idx of empty_planets) {
        if (!taken.includes(empty_planet_idx)) {
            let min_dist = 0
            for (const organics_planet_idx of organics_planets) {
                min_dist += cached_a_star_search(empty_planet_idx, organics_planet_idx, true, false)
                if (min_dist >= organics_min_dist) {
                    continue organics_main
                }
            }
            organics_min_dist = min_dist
            organics_center_idx = empty_planet_idx
        }
    }
    taken.push(organics_center_idx)


    let sand_min_dist = Infinity
    let sand_center_idx = -1
    sand_main: for (const empty_planet_idx of empty_planets) {
        if (!taken.includes(empty_planet_idx)) {
            let min_dist = 0
            for (const sand_planet_idx of sand_planets) {
                min_dist += cached_a_star_search(empty_planet_idx, sand_planet_idx, true, false)
                if (min_dist >= sand_min_dist) {
                    continue sand_main
                }
            }
            sand_min_dist = min_dist
            sand_center_idx = empty_planet_idx
        }
    }

    taken.push(sand_center_idx)

    let chip_min_dist = Infinity
    let chip_center_idx = -1
    for (const empty_planet_idx of empty_planets) {
        if (!taken.includes(empty_planet_idx)) {
            let dist = 0
            dist += cached_a_star_search(empty_planet_idx, ore_center_idx, true, false)
            if (dist >= chip_min_dist) {
                continue
            }
            dist += cached_a_star_search(empty_planet_idx, sand_center_idx, true, false)
            if (dist >= chip_min_dist) {
                continue
            }
            chip_min_dist = dist
            chip_center_idx = empty_planet_idx
        }
    }
    taken.push(chip_center_idx)


    let acc_min_dist = Infinity
    let acc_center_idx = -1
    for (const empty_planet_idx of empty_planets) {
        if (!taken.includes(empty_planet_idx)) {
            let dist = 0
            dist += cached_a_star_search(empty_planet_idx, ore_center_idx, true, false)
            if (dist >= acc_min_dist) {
                continue
            }
            dist += cached_a_star_search(empty_planet_idx, organics_center_idx, true, false)
            if (dist >= acc_min_dist) {
                continue
            }
            acc_min_dist = dist
            acc_center_idx = empty_planet_idx
        }
    }
    taken.push(acc_center_idx)

    let min_distt = Infinity
    let replicator_planet_idx = -1
    for (const empty_planet_idx of empty_planets) {
        if (!taken.includes(empty_planet_idx)) {
            let dist = 0
            dist += cached_a_star_search(empty_planet_idx, ore_center_idx, true, false) * 2
            if (dist >= min_distt) {
                continue
            }
            dist += cached_a_star_search(empty_planet_idx, chip_center_idx, true, false) * 2
            if (dist >= min_distt) {
                continue
            }
            dist += cached_a_star_search(empty_planet_idx, acc_center_idx, true, false)
            if (dist >= min_distt) {
                continue
            }
            min_distt = dist
            replicator_planet_idx = empty_planet_idx
        }
    }
    return replicator_planet_idx
}
function get_nearest_planet_to_planets_from_arr(planet_idxs: number[], used_planets: number[], nearest_to_idx: number) {
    let min_dist = Infinity
    let nearest_planet_idx = -1
    for (const planet_idx of planet_idxs) {
        if (!used_planets.includes(planet_idx)) {

            const dist = cached_a_star_search(planet_idx, nearest_to_idx, true, false)
            if (dist < min_dist) {
                min_dist = dist
                nearest_planet_idx = planet_idx
            }
        }
    }
    if (nearest_planet_idx === -1) {
        return null
    }
    used_planets.push(nearest_planet_idx)
    return nearest_planet_idx
}
function get_nearest_chip_factory_from_arr(empty_planets: number[], used_planets: number[], nearest_foundry_planet_idx: number, nearest_furnance_planet_idx: number) {
    let min_dist_chip_factory = Infinity
    let nearest_chip_factory_planet_idx = -1
    for (const empty_planet_idx of empty_planets) {
        if (!used_planets.includes(empty_planet_idx)) {
            let dist = 0
            dist += cached_a_star_search(empty_planet_idx, nearest_foundry_planet_idx, true, false)
            if (dist >= min_dist_chip_factory) {
                continue
            }
            dist += cached_a_star_search(empty_planet_idx, nearest_furnance_planet_idx, true, false)
            if (dist >= min_dist_chip_factory) {
                continue
            }
            min_dist_chip_factory = dist
            nearest_chip_factory_planet_idx = empty_planet_idx
        }
    }
    if (nearest_chip_factory_planet_idx === -1) {
        return null
    }
    used_planets.push(nearest_chip_factory_planet_idx)
    return nearest_chip_factory_planet_idx
}

function get_nearest_acc_factory_from_arr(empty_planets: number[], used_planets: number[], nearest_foundry_planet_idx: number, nearest_bioreactor_planet_idx: number) {
    let min_dist_accumulator_factory = Infinity
    let nearest_accumulator_factory_planet_idx = -1
    for (const empty_planet_idx of empty_planets) {
        if (!used_planets.includes(empty_planet_idx)) {
            let dist = 0
            dist += cached_a_star_search(empty_planet_idx, nearest_foundry_planet_idx, true, false)
            if (dist >= min_dist_accumulator_factory) {
                continue
            }
            dist += cached_a_star_search(empty_planet_idx, nearest_bioreactor_planet_idx, true, false)
            if (dist >= min_dist_accumulator_factory) {
                continue
            }
            min_dist_accumulator_factory = dist
            nearest_accumulator_factory_planet_idx = empty_planet_idx
        }
    }
    if (nearest_accumulator_factory_planet_idx === -1) {
        return null
    }
    used_planets.push(nearest_accumulator_factory_planet_idx)
    return nearest_accumulator_factory_planet_idx
}

function clear_workers_and_sources(building_arr: any[], sources: string[]) {
    for (let i = 0; i < building_arr.length; i++) {
        building_arr[i].cur_workers = 0
        if (sources.length !== 0) {
            for (const name of sources) {
                building_arr[i][name] = {}
            }
        }
    }
}

let MY_INDEX: number

let CURRENT_TICK: number
// let A_STAR_CACHE: any = [[[], []], [[], []]]

function cached_a_star_search(start_planet_idx: number, end_planet_idx: number, only_get_distance: boolean, evade_enemies: boolean) {
    return a_star_search(start_planet_idx, end_planet_idx, only_get_distance, evade_enemies, [])
}


let NUM_OF_COURIERS = 0
function calculate_best_placement(init: boolean, total_workers?: number) {
    let MINES: { planet_idx: number, cur_workers: number }[]
    let CAREER: { planet_idx: number, cur_workers: number }[]
    let FARM: { planet_idx: number, cur_workers: number }[]
    let FOUNDRY: {
        planet_idx: number,
        cur_workers: number,
        ore_sources: { [key: string]: number }
    }[]
    let FURNANCE: {
        planet_idx: number,
        cur_workers: number,
        sand_sources: { [key: string]: number }
    }[]
    let BIOREACTOR: {
        planet_idx: number,
        cur_workers: number,
        organics_sources: { [key: string]: number }
    }[]
    let CHIP_FACTORY: {
        planet_idx: number,
        cur_workers: number,
        metal_sources: { [key: string]: number },
        silicon_sources: { [key: string]: number },
    }[]
    let ACC_FACTORY: {
        planet_idx: number,
        cur_workers: number,
        metal_sources: { [key: string]: number },
        plastic_sources: { [key: string]: number },
    }[]
    let REPLICATOR: {
        planet_idx: number,
        cur_workers: number,
        metal_sources: { [key: string]: number },
        chip_sources: { [key: string]: number },
        acc_sources: { [key: string]: number },
    }[]

    /////////////////////////////////////////////init global
    const RES_STONE_PLANETS: number[] = []
    const RES_ORE_PLANETS: number[] = []
    const RES_ORGANICS_PLANETS: number[] = []
    const RES_SAND_PLANETS: number[] = []
    const RES_EMPTY_PLANETS: number[] = []
    let replicator_planet_idx: number
    let USED_PLANETS: number[]
    ////////////////////////////////////////////
    if (init) {
        for (const planet_idx of OUR_ZONE) {
            switch (ALL_PLANETS[planet_idx].harvestableResource) {
                case Resource.STONE:
                    RES_STONE_PLANETS.push(planet_idx)
                    break
                case Resource.ORE:
                    RES_ORE_PLANETS.push(planet_idx)
                    break
                case Resource.ORGANICS:
                    RES_ORGANICS_PLANETS.push(planet_idx)
                    break
                case Resource.SAND:
                    RES_SAND_PLANETS.push(planet_idx)
                    break
                case null:
                    RES_EMPTY_PLANETS.push(planet_idx)
                    break
            }
        }

        replicator_planet_idx = get_replicator_idx(RES_EMPTY_PLANETS, RES_ORE_PLANETS, RES_ORGANICS_PLANETS, RES_SAND_PLANETS)
        USED_PLANETS = [replicator_planet_idx]

        let nearest_ore_planet_idx = get_nearest_planet_to_planets_from_arr(RES_ORE_PLANETS, USED_PLANETS, replicator_planet_idx)!
        let nearest_foundry_planet_idx = get_nearest_planet_to_planets_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, nearest_ore_planet_idx!)!

        let nearest_organics_planet_idx = get_nearest_planet_to_planets_from_arr(RES_ORGANICS_PLANETS, USED_PLANETS, replicator_planet_idx)!
        let nearest_bioreactor_planet_idx = get_nearest_planet_to_planets_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, nearest_organics_planet_idx!)!


        let nearest_sand_planet_idx = get_nearest_planet_to_planets_from_arr(RES_SAND_PLANETS, USED_PLANETS, replicator_planet_idx)!
        let nearest_furnance_planet_idx = get_nearest_planet_to_planets_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, nearest_sand_planet_idx!)!


        let nearest_chip_factory_planet_idx = get_nearest_chip_factory_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, nearest_foundry_planet_idx!, nearest_furnance_planet_idx!)!
        let nearest_accumulator_factory_planet_idx = get_nearest_acc_factory_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, nearest_foundry_planet_idx!, nearest_bioreactor_planet_idx!)!

        /////////////////////////////////////////////////////
        MINES = [{ planet_idx: nearest_ore_planet_idx, cur_workers: 0 }]

        CAREER = [{ planet_idx: nearest_sand_planet_idx, cur_workers: 0 }]

        FARM = [{ planet_idx: nearest_organics_planet_idx, cur_workers: 0 }]
        /////////////////////////////////////////////////////

        FOUNDRY =
            [{
                planet_idx: nearest_foundry_planet_idx,
                cur_workers: 0,
                ore_sources: {}
            }]

        FURNANCE =
            [{
                planet_idx: nearest_furnance_planet_idx,
                cur_workers: 0,
                sand_sources: {}
            }]


        BIOREACTOR =
            [{
                planet_idx: nearest_bioreactor_planet_idx,
                cur_workers: 0,
                organics_sources: {}
            }]


        /////////////////////////////////////////////////////
        CHIP_FACTORY =
            [{
                planet_idx: nearest_chip_factory_planet_idx,
                cur_workers: 0,
                metal_sources: {},
                silicon_sources: {},
            }]


        ACC_FACTORY =
            [{
                planet_idx: nearest_accumulator_factory_planet_idx,
                cur_workers: 0,
                metal_sources: {},
                plastic_sources: {},
            }]

        /////////////////////////////////////////////////////
        REPLICATOR =
            [{
                planet_idx: replicator_planet_idx,
                cur_workers: 0,
                metal_sources: {},
                chip_sources: {},
                acc_sources: {}
            }]
    } else {
        MINES = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.MINES))
        CAREER = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.CAREER))
        FARM = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.FARM))
        FOUNDRY = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.FOUNDRY))
        FURNANCE = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.FURNANCE))
        BIOREACTOR = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.BIOREACTOR))
        CHIP_FACTORY = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.CHIP_FACTORY))
        ACC_FACTORY = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.ACC_FACTORY))
        REPLICATOR = JSON.parse(JSON.stringify(INITIAL_BUILDINGS.REPLICATOR))
    }

    let TOTAL_WORKERS_LEFT = total_workers || 1000

    const MINE_MAX_WORKERS = 100
    const FARM_MAX_WORKERS = 100
    const CAREER_MAX_WORKERS = 100

    const FOUNDRY_MAX_WORKERS = 20
    const FURNANCE_MAX_WORKERS = 20
    const BIOREACTOR_MAX_WORKERS = 20

    const CHIP_FACTORY_MAX_WORKERS = 10
    const ACC_FACTORY_MAX_WORKERS = 10

    const REPLICATOR_MAX_WORKERS = 25

    function get_ore(res: number) {
        let workers_needed = res * 2
        const used_ore_planets = []
        while (workers_needed !== 0) {
            if (MINES[MINES.length - 1].cur_workers === MINE_MAX_WORKERS) {
                if (!init) { console.log("mine"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_planet_to_planets_from_arr(RES_ORE_PLANETS, USED_PLANETS, replicator_planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                MINES.push({ planet_idx: pl_idx, cur_workers: 0 })
            }

            const _ore = MINES.find(element => element.cur_workers < MINE_MAX_WORKERS)!
            const diff = Math.min(MINE_MAX_WORKERS - _ore.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            _ore.cur_workers += diff
            used_ore_planets.push({ planet_idx: _ore.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_ore_planets
    }
    function get_sand(res: number) {
        let workers_needed = res * 2
        const used_sand_planets = []
        while (workers_needed !== 0) {
            if (CAREER[CAREER.length - 1].cur_workers === CAREER_MAX_WORKERS) {
                if (!init) { console.log("career"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_planet_to_planets_from_arr(RES_SAND_PLANETS, USED_PLANETS, replicator_planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                CAREER.push({ planet_idx: pl_idx, cur_workers: 0 })
            }

            const _sand = CAREER.find(element => element.cur_workers < CAREER_MAX_WORKERS)!
            const diff = Math.min(CAREER_MAX_WORKERS - _sand.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            _sand.cur_workers += diff
            used_sand_planets.push({ planet_idx: _sand.planet_idx, resource: Math.floor(diff / 2) })

        }
        return used_sand_planets
    }

    function get_organics(res: number) {
        let workers_needed = res * 2
        const used_organics_planets = []
        while (workers_needed !== 0) {
            if (FARM[FARM.length - 1].cur_workers === FARM_MAX_WORKERS) {
                if (!init) { console.log("farm"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_planet_to_planets_from_arr(RES_ORGANICS_PLANETS, USED_PLANETS, replicator_planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                FARM.push({ planet_idx: pl_idx, cur_workers: 0 })
            }

            const _organics = FARM.find(element => element.cur_workers < FARM_MAX_WORKERS)!
            const diff = Math.min(FARM_MAX_WORKERS - _organics.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            _organics.cur_workers += diff
            used_organics_planets.push({ planet_idx: _organics.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_organics_planets
    }

    function get_metal(res: number) {
        let workers_needed = res * 2
        const used_foundry_planets = []
        while (workers_needed !== 0) {
            if (FOUNDRY[FOUNDRY.length - 1].cur_workers === FOUNDRY_MAX_WORKERS) {
                if (!init) { console.log(FOUNDRY); console.log("fondry"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_planet_to_planets_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, MINES[MINES.length - 1].planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                FOUNDRY.push({ planet_idx: pl_idx, cur_workers: 0, ore_sources: {} })
            }

            const _foundry = FOUNDRY.find(element => element.cur_workers < FOUNDRY_MAX_WORKERS)!
            const diff = Math.min(FOUNDRY_MAX_WORKERS - _foundry.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            const ore_planets = get_ore(diff)
            if (!Array.isArray(ore_planets)) {
                return ore_planets
            }
            for (const ore_planet of ore_planets) {
                const dist_to_planet = cached_a_star_search(_foundry.planet_idx, ore_planet.planet_idx, true, false)
                const couriers = 2 * ore_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _foundry.ore_sources[ore_planet.planet_idx] = (_foundry.ore_sources[ore_planet.planet_idx] + couriers) || couriers
            }
            _foundry.cur_workers += diff
            used_foundry_planets.push({ planet_idx: _foundry.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_foundry_planets
    }

    function get_silicon(res: number) {
        let workers_needed = res * 2
        const used_furnance_planets = []
        while (workers_needed !== 0) {
            if (FURNANCE[FURNANCE.length - 1].cur_workers === FURNANCE_MAX_WORKERS) {
                if (!init) { console.log("furnance"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_planet_to_planets_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, CAREER[CAREER.length - 1].planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                FURNANCE.push({ planet_idx: pl_idx, cur_workers: 0, sand_sources: {} })
            }

            const _furnance = FURNANCE.find(element => element.cur_workers < FURNANCE_MAX_WORKERS)!
            const diff = Math.min(FURNANCE_MAX_WORKERS - _furnance.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            const sand_planets = get_sand(diff)
            if (!Array.isArray(sand_planets)) {
                return sand_planets
            }
            for (const sand_planet of sand_planets) {
                const dist_to_planet = cached_a_star_search(_furnance.planet_idx, sand_planet.planet_idx, true, false)
                const couriers = 2 * sand_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _furnance.sand_sources[sand_planet.planet_idx] = (_furnance.sand_sources[sand_planet.planet_idx] + couriers) || couriers
            }
            _furnance.cur_workers += diff
            used_furnance_planets.push({ planet_idx: _furnance.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_furnance_planets
    }

    function get_plastic(res: number) {
        let workers_needed = res * 2
        const used_bioreactor_planets = []
        while (workers_needed !== 0) {
            if (BIOREACTOR[BIOREACTOR.length - 1].cur_workers === BIOREACTOR_MAX_WORKERS) {
                if (!init) { console.log("bioreactor"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_planet_to_planets_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, BIOREACTOR[BIOREACTOR.length - 1].planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                BIOREACTOR.push({ planet_idx: pl_idx, cur_workers: 0, organics_sources: {} })
            }

            const _bioreactor = BIOREACTOR.find(element => element.cur_workers < BIOREACTOR_MAX_WORKERS)!
            const diff = Math.min(BIOREACTOR_MAX_WORKERS - _bioreactor.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            const organics_planets = get_organics(diff)
            if (!Array.isArray(organics_planets)) {
                return organics_planets
            }
            for (const organics_planet of organics_planets) {
                const dist_to_planet = cached_a_star_search(_bioreactor.planet_idx, organics_planet.planet_idx, true, false)
                const couriers = 2 * organics_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _bioreactor.organics_sources[organics_planet.planet_idx] = (_bioreactor.organics_sources[organics_planet.planet_idx] + couriers) || couriers
            }
            _bioreactor.cur_workers += diff
            used_bioreactor_planets.push({ planet_idx: _bioreactor.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_bioreactor_planets
    }


    function get_chip(res: number) {
        let workers_needed = res * 2
        const used_chip_planets = []
        while (workers_needed !== 0) {
            if (CHIP_FACTORY[CHIP_FACTORY.length - 1].cur_workers === CHIP_FACTORY_MAX_WORKERS) {
                if (!init) { console.log("chip_factory"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_chip_factory_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, FOUNDRY[FOUNDRY.length - 1].planet_idx, FURNANCE[FURNANCE.length - 1].planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                CHIP_FACTORY.push({ planet_idx: pl_idx, cur_workers: 0, metal_sources: {}, silicon_sources: {} })
            }

            const _chip_factory = CHIP_FACTORY.find(element => element.cur_workers < CHIP_FACTORY_MAX_WORKERS)!
            const diff = Math.min(CHIP_FACTORY_MAX_WORKERS - _chip_factory.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            const metal_planets = get_metal(diff)
            if (!Array.isArray(metal_planets)) {
                return metal_planets
            }
            const silicon_planets = get_silicon(diff)
            if (!Array.isArray(silicon_planets)) {
                return silicon_planets
            }
            for (const metal_planet of metal_planets) {
                const dist_to_planet = cached_a_star_search(_chip_factory.planet_idx, metal_planet.planet_idx, true, false)
                const couriers = 2 * metal_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _chip_factory.metal_sources[metal_planet.planet_idx] = (_chip_factory.metal_sources[metal_planet.planet_idx] + couriers) || couriers
            }
            for (const silicon_planet of silicon_planets) {
                const dist_to_planet = cached_a_star_search(_chip_factory.planet_idx, silicon_planet.planet_idx, true, false)
                const couriers = 2 * silicon_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _chip_factory.silicon_sources[silicon_planet.planet_idx] = (_chip_factory.silicon_sources[silicon_planet.planet_idx] + couriers) || couriers
            }
            _chip_factory.cur_workers += diff
            used_chip_planets.push({ planet_idx: _chip_factory.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_chip_planets
    }

    function get_acc(res: number) {
        let workers_needed = res * 2
        const used_acc_planets = []
        while (workers_needed !== 0) {
            if (ACC_FACTORY[ACC_FACTORY.length - 1].cur_workers === ACC_FACTORY_MAX_WORKERS) {
                if (!init) { console.log("acc_factory"); return { err: null, msg: "not_enough_planets_not_init" } }
                const pl_idx = get_nearest_acc_factory_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, FOUNDRY[FOUNDRY.length - 1].planet_idx, BIOREACTOR[BIOREACTOR.length - 1].planet_idx)
                if (pl_idx === null) {
                    return { err: null, msg: "not_enough_planets" }
                }
                ACC_FACTORY.push({ planet_idx: pl_idx, cur_workers: 0, metal_sources: {}, plastic_sources: {} })
            }

            const _acc_factory = ACC_FACTORY.find(element => element.cur_workers < ACC_FACTORY_MAX_WORKERS)!
            const diff = Math.min(ACC_FACTORY_MAX_WORKERS - _acc_factory.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            const metal_planets = get_metal(diff)
            if (!Array.isArray(metal_planets)) {
                return metal_planets
            }
            const plastic_planets = get_plastic(diff)
            if (!Array.isArray(plastic_planets)) {
                return plastic_planets
            }
            for (const metal_planet of metal_planets) {
                const dist_to_planet = cached_a_star_search(_acc_factory.planet_idx, metal_planet.planet_idx, true, false)
                const couriers = 2 * metal_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _acc_factory.metal_sources[metal_planet.planet_idx] = (_acc_factory.metal_sources[metal_planet.planet_idx] + couriers) || couriers
            }
            for (const plastic_planet of plastic_planets) {
                const dist_to_planet = cached_a_star_search(_acc_factory.planet_idx, plastic_planet.planet_idx, true, false)
                const couriers = 2 * plastic_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _acc_factory.plastic_sources[plastic_planet.planet_idx] = (_acc_factory.plastic_sources[plastic_planet.planet_idx] + couriers) || couriers
            }
            _acc_factory.cur_workers += diff
            used_acc_planets.push({ planet_idx: _acc_factory.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_acc_planets
    }

    function get_replicator(workers: number) {
        let workers_needed = workers
        // let workers_needed = res * 5
        const used_replicator_planets = []
        while (workers_needed !== 0) {
            if (REPLICATOR[REPLICATOR.length - 1].cur_workers === REPLICATOR_MAX_WORKERS) {
                if (!init) { console.log("replicator"); return { err: null, msg: "not_enough_planets_not_init" } }
                return { err: null, msg: "not_enough_planets" }
                // const pl_idx = get_nearest_acc_factory_from_arr(RES_EMPTY_PLANETS, USED_PLANETS, FOUNDRY[FOUNDRY.length - 1].planet_idx, BIOREACTOR[BIOREACTOR.length - 1].planet_idx)
                // if (pl_idx === null) {
                //     return null
                // }
                // ACC_FACTORY.push({ planet_idx: pl_idx, cur_workers: 0, metal_sources: {}, plastic_sources: {} })
            }

            const _replicator = REPLICATOR.find(element => element.cur_workers < REPLICATOR_MAX_WORKERS)!
            const diff = Math.min(REPLICATOR_MAX_WORKERS - _replicator.cur_workers, workers_needed)
            workers_needed -= diff
            TOTAL_WORKERS_LEFT -= diff
            if (TOTAL_WORKERS_LEFT <= 0) {
                return { err: null, msg: "not_enough_workers" }
            }
            const metal_planets = get_metal(Math.ceil(2 * (diff / 5)))
            if (!Array.isArray(metal_planets)) {
                return metal_planets
            }
            const chip_planets = get_chip(Math.ceil(2 * (diff / 5)))
            if (!Array.isArray(chip_planets)) {
                return chip_planets
            }
            const acc_planets = get_acc(Math.ceil(1 * (diff / 5)))
            if (!Array.isArray(acc_planets)) {
                return acc_planets
            }

            for (const metal_planet of metal_planets) {
                const dist_to_planet = cached_a_star_search(_replicator.planet_idx, metal_planet.planet_idx, true, false)
                const couriers = 2 * metal_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _replicator.metal_sources[metal_planet.planet_idx] = (_replicator.metal_sources[metal_planet.planet_idx] + couriers) || couriers
            }
            for (const chip_planet of chip_planets) {
                const dist_to_planet = cached_a_star_search(_replicator.planet_idx, chip_planet.planet_idx, true, false)
                const couriers = 2 * chip_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _replicator.chip_sources[chip_planet.planet_idx] = (_replicator.chip_sources[chip_planet.planet_idx] + couriers) || couriers
            }
            for (const acc_planet of acc_planets) {
                const dist_to_planet = cached_a_star_search(_replicator.planet_idx, acc_planet.planet_idx, true, false)
                const couriers = 2 * acc_planet.resource * dist_to_planet
                TOTAL_WORKERS_LEFT -= couriers
                if (TOTAL_WORKERS_LEFT <= 0) {
                    return { err: null, msg: "not_enough_workers" }
                }
                _replicator.acc_sources[acc_planet.planet_idx] = (_replicator.acc_sources[acc_planet.planet_idx] + couriers) || couriers
            }
            _replicator.cur_workers += diff
            used_replicator_planets.push({ planet_idx: _replicator.planet_idx, resource: Math.floor(diff / 2) })
        }
        return used_replicator_planets
    }
    if (!init) {
        clear_workers_and_sources(MINES, [])
        clear_workers_and_sources(CAREER, [])
        clear_workers_and_sources(FARM, [])

        clear_workers_and_sources(FOUNDRY, ["ore_sources"])
        clear_workers_and_sources(FURNANCE, ["sand_sources"])
        clear_workers_and_sources(BIOREACTOR, ["organics_sources"])

        clear_workers_and_sources(CHIP_FACTORY, ["metal_sources", "silicon_sources"])
        clear_workers_and_sources(ACC_FACTORY, ["metal_sources", "plastic_sources"])

        clear_workers_and_sources(REPLICATOR, ["metal_sources", "acc_sources", "chip_sources"])
    }

    console.log(TOTAL_WORKERS_LEFT)
    let best_building_plan_changed = false
    const best_building_plan: any = {}
    let error = undefined
    let max_level = (init) ? 11 : 25
    for (let i = 1; i < max_level; i++) {
        console.log(i)
        const res = get_replicator(i)
        console.log(res)
        console.log(TOTAL_WORKERS_LEFT)
        if (Array.isArray(res) && TOTAL_WORKERS_LEFT > 0) {
            best_building_plan_changed = true
            best_building_plan.MINES = JSON.parse(JSON.stringify(MINES))
            best_building_plan.CAREER = JSON.parse(JSON.stringify(CAREER))
            best_building_plan.FARM = JSON.parse(JSON.stringify(FARM))
            best_building_plan.FOUNDRY = JSON.parse(JSON.stringify(FOUNDRY))
            best_building_plan.FURNANCE = JSON.parse(JSON.stringify(FURNANCE))
            best_building_plan.BIOREACTOR = JSON.parse(JSON.stringify(BIOREACTOR))
            best_building_plan.CHIP_FACTORY = JSON.parse(JSON.stringify(CHIP_FACTORY))
            best_building_plan.ACC_FACTORY = JSON.parse(JSON.stringify(ACC_FACTORY))
            best_building_plan.REPLICATOR = JSON.parse(JSON.stringify(REPLICATOR))
            clear_workers_and_sources(MINES, [])
            clear_workers_and_sources(CAREER, [])
            clear_workers_and_sources(FARM, [])

            clear_workers_and_sources(FOUNDRY, ["ore_sources"])
            clear_workers_and_sources(FURNANCE, ["sand_sources"])
            clear_workers_and_sources(BIOREACTOR, ["organics_sources"])

            clear_workers_and_sources(CHIP_FACTORY, ["metal_sources", "silicon_sources"])
            clear_workers_and_sources(ACC_FACTORY, ["metal_sources", "plastic_sources"])

            clear_workers_and_sources(REPLICATOR, ["metal_sources", "acc_sources", "chip_sources"])
        } else {
            if (!Array.isArray(res)) {
                error = res
            }
            break
        }
        TOTAL_WORKERS_LEFT = total_workers || 1000
    }
    if (best_building_plan_changed === false && total_workers) {
        const real_workers_num = total_workers
        // console.log(real_workers_num)
        ///////////////////////////
        TOTAL_WORKERS_LEFT = 1000
        get_replicator(1)
        ///////////////////////////
        let x = 0
        for (const planet of MINES) {
            x += planet.cur_workers
        }
        for (const planet of CAREER) {
            x += planet.cur_workers
        }
        for (const planet of FARM) {
            x += planet.cur_workers
        }
        for (const planet of FOUNDRY) {
            x += planet.cur_workers
            for (const [key, value] of Object.entries(planet.ore_sources)) {
                x += value
            }
        }
        for (const planet of FURNANCE) {
            x += planet.cur_workers
            for (const [key, value] of Object.entries(planet.sand_sources)) {
                x += value
            }
        }
        for (const planet of BIOREACTOR) {
            x += planet.cur_workers
            for (const [key, value] of Object.entries(planet.organics_sources)) {
                x += value
            }
        }
        for (const planet of CHIP_FACTORY) {
            x += planet.cur_workers
            for (const [key, value] of Object.entries(planet.metal_sources)) {
                x += value
            }
            for (const [key, value] of Object.entries(planet.silicon_sources)) {
                x += value
            }
        }
        for (const planet of ACC_FACTORY) {
            x += planet.cur_workers
            for (const [key, value] of Object.entries(planet.metal_sources)) {
                x += value
            }
            for (const [key, value] of Object.entries(planet.plastic_sources)) {
                x += value
            }
        }
        for (const planet of REPLICATOR) {
            x += planet.cur_workers
            for (const [key, value] of Object.entries(planet.metal_sources)) {
                x += value
            }
            for (const [key, value] of Object.entries(planet.chip_sources)) {
                x += value
            }
            for (const [key, value] of Object.entries(planet.acc_sources)) {
                x += value
            }
        }

        while (x > real_workers_num) {
            // console.log("_----------")
            // console.log(x)
            // console.log(real_workers_num)
            // console.log("_----------")
            // console.log("###############################")
            // console.log(MINES)
            // console.log(CAREER)
            // console.log(FARM)
            // console.log(FOUNDRY)
            // console.log(FURNANCE)
            // console.log(BIOREACTOR)
            // console.log(CHIP_FACTORY)
            // console.log(ACC_FACTORY)
            // console.log(REPLICATOR)
            // console.log("###############################")
            let sum_change = 0
            for (const building of REPLICATOR) {
                for (const [key, value] of Object.entries(building.acc_sources)) {
                    const new_value = Math.ceil(building.acc_sources[key] / 2)
                    const diff = value - new_value
                    building.acc_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const [key, value] of Object.entries(building.chip_sources)) {
                    const new_value = Math.ceil(building.chip_sources[key] / 2)
                    const diff = value - new_value
                    building.chip_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const [key, value] of Object.entries(building.metal_sources)) {
                    const new_value = Math.ceil(building.metal_sources[key] / 2)
                    const diff = value - new_value
                    building.metal_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }

            for (const building of ACC_FACTORY) {
                for (const [key, value] of Object.entries(building.plastic_sources)) {
                    const new_value = Math.ceil(building.plastic_sources[key] / 2)
                    const diff = value - new_value
                    building.plastic_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const [key, value] of Object.entries(building.metal_sources)) {
                    const new_value = Math.ceil(building.metal_sources[key] / 2)
                    const diff = value - new_value
                    building.metal_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }

            for (const building of CHIP_FACTORY) {
                for (const [key, value] of Object.entries(building.silicon_sources)) {
                    const new_value = Math.ceil(building.silicon_sources[key] / 2)
                    const diff = value - new_value
                    building.silicon_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const [key, value] of Object.entries(building.metal_sources)) {
                    const new_value = Math.ceil(building.metal_sources[key] / 2)
                    const diff = value - new_value
                    building.metal_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }

            for (const building of FOUNDRY) {
                for (const [key, value] of Object.entries(building.ore_sources)) {
                    const new_value = Math.ceil(building.ore_sources[key] / 2)
                    const diff = value - new_value
                    building.ore_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }

            for (const building of FURNANCE) {
                for (const [key, value] of Object.entries(building.sand_sources)) {
                    const new_value = Math.ceil(building.sand_sources[key] / 2)
                    const diff = value - new_value
                    building.sand_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }

            for (const building of BIOREACTOR) {
                for (const [key, value] of Object.entries(building.organics_sources)) {
                    const new_value = Math.ceil(building.organics_sources[key] / 2)
                    const diff = value - new_value
                    building.organics_sources[key] = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }
            if (sum_change === 0) {
                for (const building of REPLICATOR) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of ACC_FACTORY) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of CHIP_FACTORY) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of FURNANCE) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of FOUNDRY) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of BIOREACTOR) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of FARM) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of MINES) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
                for (const building of CAREER) {
                    const new_value = Math.ceil(building.cur_workers / 2)
                    const diff = building.cur_workers - new_value
                    building.cur_workers = new_value
                    sum_change += diff
                    if (x - sum_change <= real_workers_num) {
                        break
                    }
                }
            }
            if (sum_change === 0) {
                // for(const planet of FARM){
                //     if(ALL_PLANETS[planet.planet_idx].building){
                //         for
                //         add_to_FNS()
                //         return
                //     }
                // }
                TOTAL_BUILDINGS = {}
                return
            }
            x -= sum_change
        }

        best_building_plan.MINES = JSON.parse(JSON.stringify(MINES))
        best_building_plan.CAREER = JSON.parse(JSON.stringify(CAREER))
        best_building_plan.FARM = JSON.parse(JSON.stringify(FARM))
        best_building_plan.FOUNDRY = JSON.parse(JSON.stringify(FOUNDRY))
        best_building_plan.FURNANCE = JSON.parse(JSON.stringify(FURNANCE))
        best_building_plan.BIOREACTOR = JSON.parse(JSON.stringify(BIOREACTOR))
        best_building_plan.CHIP_FACTORY = JSON.parse(JSON.stringify(CHIP_FACTORY))
        best_building_plan.ACC_FACTORY = JSON.parse(JSON.stringify(ACC_FACTORY))
        best_building_plan.REPLICATOR = JSON.parse(JSON.stringify(REPLICATOR))
    }


    MINES = best_building_plan.MINES
    CAREER = best_building_plan.CAREER
    FARM = best_building_plan.FARM
    FOUNDRY = best_building_plan.FOUNDRY
    FURNANCE = best_building_plan.FURNANCE
    BIOREACTOR = best_building_plan.BIOREACTOR
    CHIP_FACTORY = best_building_plan.CHIP_FACTORY
    ACC_FACTORY = best_building_plan.ACC_FACTORY
    REPLICATOR = best_building_plan.REPLICATOR

    INITIAL_BUILDINGS.MINES = MINES
    INITIAL_BUILDINGS.CAREER = CAREER
    INITIAL_BUILDINGS.FARM = FARM

    INITIAL_BUILDINGS.FOUNDRY = FOUNDRY
    INITIAL_BUILDINGS.FURNANCE = FURNANCE
    INITIAL_BUILDINGS.BIOREACTOR = BIOREACTOR

    INITIAL_BUILDINGS.CHIP_FACTORY = CHIP_FACTORY
    INITIAL_BUILDINGS.ACC_FACTORY = ACC_FACTORY

    INITIAL_BUILDINGS.REPLICATOR = REPLICATOR

    NUM_OF_COURIERS = 0
    const building_self_workers: any = {}
    const total_buildings: { [key: number | string]: number } = {}
    for (const planet of MINES) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
    }
    for (const planet of CAREER) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
    }
    for (const planet of FARM) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
    }
    for (const planet of FOUNDRY) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
        for (const [key, value] of Object.entries(planet.ore_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
    }
    for (const planet of FURNANCE) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
        for (const [key, value] of Object.entries(planet.sand_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
    }
    for (const planet of BIOREACTOR) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
        for (const [key, value] of Object.entries(planet.organics_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
    }
    for (const planet of CHIP_FACTORY) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
        for (const [key, value] of Object.entries(planet.metal_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
        for (const [key, value] of Object.entries(planet.silicon_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
    }
    for (const planet of ACC_FACTORY) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
        for (const [key, value] of Object.entries(planet.metal_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
        for (const [key, value] of Object.entries(planet.plastic_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
    }
    for (const planet of REPLICATOR) {
        if (planet.cur_workers === 0) { continue }
        building_self_workers[planet.planet_idx] = planet.cur_workers
        total_buildings[planet.planet_idx] = planet.cur_workers
        for (const [key, value] of Object.entries(planet.metal_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
        for (const [key, value] of Object.entries(planet.chip_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
        for (const [key, value] of Object.entries(planet.acc_sources)) {
            NUM_OF_COURIERS++
            total_buildings[key] += value
        }
    }


    TOTAL_BUILDINGS = total_buildings
    BUILDING_SELF_WORKERS_NUM = building_self_workers
    for (const planet of MINES) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of CAREER) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of FARM) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of FOUNDRY) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of BIOREACTOR) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of FURNANCE) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of ACC_FACTORY) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of CHIP_FACTORY) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    for (const planet of REPLICATOR) {
        if (CURRENT_TICK > 150 && planet.cur_workers !== 0 && ALL_PLANETS[planet.planet_idx].building === null) {
            TOTAL_BUILDINGS = {}
        }
    }
    console.log(INITIAL_BUILDINGS.MINES)
    console.log(INITIAL_BUILDINGS.CAREER)
    console.log(INITIAL_BUILDINGS.FARM)
    console.log(INITIAL_BUILDINGS.FOUNDRY)
    console.log(INITIAL_BUILDINGS.FURNANCE)
    console.log(INITIAL_BUILDINGS.BIOREACTOR)
    console.log(INITIAL_BUILDINGS.CHIP_FACTORY)
    console.log(INITIAL_BUILDINGS.ACC_FACTORY)
    console.log(INITIAL_BUILDINGS.REPLICATOR)
    console.log(TOTAL_BUILDINGS)
    return error
}



function get_total_num_of_my_workers_on_planet(planet_idx: number) {
    if (ALL_PLANETS[planet_idx].workerGroups.length === 0) {
        return 0
    } else {
        let num = 0
        for (const worker_group of ALL_PLANETS[planet_idx].workerGroups) {  //maybe return negative values
            if (worker_group.playerIndex === MY_INDEX) {
                num += worker_group.number
            }
        }
        return num
    }
}

function get_total_num_of_allies_on_planet(planet_idx: number) {
    if (ALL_PLANETS[planet_idx].workerGroups.length === 0) {
        return 0
    } else {
        let num = 0
        for (const worker_group of ALL_PLANETS[planet_idx].workerGroups) {  //maybe return negative values
            if (PLAYERS[worker_group.playerIndex].teamIndex === MY_TEAM) {
                num += worker_group.number
            }
        }
        return num
    }
}

function get_total_num_of_enemies_on_planet(planet_idx: number) {
    if (ALL_PLANETS[planet_idx].workerGroups.length === 0) {
        return 0
    } else {
        let num = 0
        for (const worker_group of ALL_PLANETS[planet_idx].workerGroups) {  //maybe return negative values
            if (PLAYERS[worker_group.playerIndex].teamIndex !== MY_TEAM) {
                num += worker_group.number
            }
        }
        return num
    }
}


function get_num_of_workers_fail_safe(planet_idx: number) {
    if (ALL_PLANETS[planet_idx].workerGroups.length === 0) {
        return 0
    } else {
        for (const worker_group of ALL_PLANETS[planet_idx].workerGroups) {         //maybe should return negative values
            if (PLAYERS[worker_group.playerIndex].teamIndex !== MY_TEAM) {
                return 0
            }
        }
        for (const worker_group of ALL_PLANETS[planet_idx].workerGroups) {
            if (worker_group.playerIndex === MY_INDEX) {
                return worker_group.number
            }
        }
        return 0
    }
}
function get_planets_with_our_workers() {
    const planets = []
    for (const planet of ALL_PLANETS) {
        if (planet.workerGroups.length !== 0) {
            if (get_num_of_workers_fail_safe(planet.id) > 0) {
                planets.push(planet)
            }
        }
    }
    return planets
}

function get_planets_with_enemy_workers() {
    const planets = []
    for (const planet of ALL_PLANETS) {
        if (planet.workerGroups.length !== 0) {
            if (get_total_num_of_enemies_on_planet(planet.id) > 0) {
                planets.push(planet)
            }
        }
    }
    return planets
}


function get_missing_buildings() {
    if (Object.keys(TOTAL_BUILDINGS).length === 0) {
        return [1]
    }
    const missing_buildings = []
    for (const x of Object.keys(TOTAL_BUILDINGS)) {
        if (ALL_PLANETS[parseInt(x)].building === null) {
            missing_buildings.push(parseInt(x))
        }
    }
    return missing_buildings
}

function check_if_not_enough_workers() {
    for (const x of Object.keys(TOTAL_BUILDINGS)) {
        const num_of_workers = get_num_of_workers_fail_safe(parseInt(x))
        if (num_of_workers === 0) {
            return true
        } else {

            const real_num_of_workers_planet1 = num_of_workers - get_how_many_foreign_workers(parseInt(x)) + get_how_many_flying_to_planet(parseInt(x), "send_free_workers")
            if (real_num_of_workers_planet1 < BUILDING_SELF_WORKERS_NUM[parseInt(x)]) {
                // if (CURRENT_TICK >= 180) {
                //     console.log(x)
                //     console.log(ALL_PLANETS_ORIGINAL[parseInt(x)].workerGroups)
                //     console.log(ALL_PLANETS[parseInt(x)].workerGroups)
                //     console.log(num_of_workers)
                //     console.log(get_how_many_foreign_workers(parseInt(x)))
                //     console.log(FLYING_NAVIGATION_SYSTEM)
                //     console.log(get_how_many_flying_to_planet(parseInt(x), "send_free_workers"))
                //     console.log(BUILDING_SELF_WORKERS_NUM[parseInt(x)])
                //     exit()
                // }
                // return true
            }
        }
    }
    return false
}

function get_total_num_of_player_workers_on_planet(planet_idx: number, player_idx: number) {
    if (ALL_PLANETS[planet_idx].workerGroups.length === 0) {
        return 0
    } else {
        let num = 0
        for (const worker_group of ALL_PLANETS[planet_idx].workerGroups) {  //maybe return negative values
            if (worker_group.playerIndex === player_idx) {
                num += worker_group.number
            }
        }
        return num
    }
}

function get_total_number_of_workers_in_game(player_index: number) {
    let total_workers = 0
    for (const planet of ALL_PLANETS) {
        total_workers += get_total_num_of_player_workers_on_planet(planet.id, player_index)
    }
    for (const flying_group of FLYINGWORKERGROUPS) {
        if (flying_group.playerIndex === player_index) {
            total_workers += flying_group.number
        }
    }
    return total_workers
}

function remove_workers_from_our_wrk_group_on_planet(planet_idx: number, amount_to_remove: number) {
    main_l: for (const planet of ALL_PLANETS) {
        if (planet.id === planet_idx) {
            for (const worker_group of planet.workerGroups) {
                if (worker_group.playerIndex === MY_INDEX) {
                    worker_group.number -= amount_to_remove
                    break main_l
                }
            }
        }
    }
}

function equalize_array(sum: number, parts: number) {
    const arr = []
    let k = Math.floor(sum / parts)
    let ct = sum % parts
    let i = 1
    while (i <= parts) {
        let num
        if (i <= ct) {
            num = k + 1
        } else {
            num = k
        }
        arr[i - 1] = num
        i++
    }
    return arr
}


let left_on_starting_planet = 0
let INIT_BUILDING_DONE = false
let INIT_DONE_PLANET: number[] = []
let INIT_COURIERS: string[] = []
let TOP_ACHIEVED = false
let last_success_reorg_call = -1
let last_non_enemy_broken_placement_call = -1
let MY_TEAM = -1
let PLAYERS: Player[] = []
let PLANETS_TO_DEF: number[] = []
let SPECIALTY: Specialty
const COMBAT_FARMS: { planet_idx: number, done: boolean }[] = []
let FLYINGWORKERGROUPS: FlyingWorkerGroup[]
let TOTAL_WAR = false
let ALL_PLANETS_ORIGINAL: Planet[]
export class MyStrategy {
    async getAction(game: Game): Promise<Action> {
        // A_STAR_CACHE = [[[], []], [[], []]]
        ALL_PLANETS_ORIGINAL = JSON.parse(JSON.stringify(game.planets))
        console.time()
        PLAYERS = game.players
        FLYINGWORKERGROUPS = game.flyingWorkerGroups
        MY_INDEX = game.myIndex
        MY_TEAM = game.players[MY_INDEX].teamIndex
        CURRENT_TICK = game.currentTick
        const MOVES: MoveAction[] = []
        const BUILDS: BuildingAction[] = []
        ALL_PLANETS = game.planets

        // if (game.currentTick === 1) {
        //     exit()
        // }


        if (game.currentTick === 0) {
            let TEAM_PLANETS_IDXS = []
            const UNCLAIMED_PLANETS_IDXS = []
            const ENEMY_PLANETS_IDXS = []

            for (let i = 0; i < ALL_PLANETS.length; i++) {  //GET WORLD INFO
                const planet = ALL_PLANETS[i]
                if (planet.workerGroups.length === 0) {
                    UNCLAIMED_PLANETS_IDXS.push(i)
                } else if (game.players[planet.workerGroups[0].playerIndex].teamIndex === MY_TEAM) {
                    TEAM_PLANETS_IDXS.push(i)
                } else {
                    ENEMY_PLANETS_IDXS.push(i)
                }
            }

            OUR_STARTING_PLANET_IDX = TEAM_PLANETS_IDXS.find((planet_id) => ALL_PLANETS[planet_id].workerGroups[0].playerIndex === MY_INDEX) as number  //mda
            // OUR_PLANETS_IDXS = OUR_PLANETS_IDXS.filter((el) => el !== OUR_STARTING_PLANET_IDX)

            for (let i = 0; i < ALL_PLANETS.length; i++) {
                NEARBY_PLANETS[i] = []
                for (let j = 0; j < ALL_PLANETS.length; j++) {
                    if (i === j) {
                        continue
                    }
                    const distance = get_distance_by_planet_idxs(i, j)
                    if (distance <= game.maxTravelDistance) {
                        NEARBY_PLANETS[i].push({ distance: distance, planet_idx: j, planet: ALL_PLANETS[j] })
                    }
                }
            }

            const team_zone = new Set<number>()
            for (const team_planet_idx of TEAM_PLANETS_IDXS) {
                for (const pl of UNCLAIMED_PLANETS_IDXS) {
                    const dist1 = cached_a_star_search(team_planet_idx, pl, true, false)

                    const dist4 = cached_a_star_search(ENEMY_PLANETS_IDXS[0], pl, true, false)
                    const dist5 = cached_a_star_search(ENEMY_PLANETS_IDXS[1], pl, true, false)
                    const dist6 = cached_a_star_search(ENEMY_PLANETS_IDXS[2], pl, true, false)
                    if (dist1 <= Math.min(dist4, dist5, dist6)) {
                        team_zone.add(pl)
                    }
                }
            }

            // let _our_zone: { dist: number, idx: number }[] = []
            // for (const pl of team_zone) {
            //     const dist1 = cached_a_star_search(OUR_STARTING_PLANET_IDX, pl, true, false)
            //     _our_zone.push({ dist: dist1, idx: pl })
            // }
            // OUR_ZONE = _our_zone.sort((a, b) => a.dist - b.dist).map((el) => el.idx)
            // calculate_best_placement(true)
            // if(1==1){exit()}
            // if(1===1){exit()}
            const placements = []
            let _our_zone: { dist: number, idx: number }[] = []
            for (const pl of team_zone) {
                const dist1 = cached_a_star_search(TEAM_PLANETS_IDXS[0], pl, true, false)
                _our_zone.push({ dist: dist1, idx: pl })
            }
            OUR_ZONE = _our_zone.sort((a, b) => a.dist - b.dist).map((el) => el.idx)
            calculate_best_placement(true)
            _our_zone = []
            placements.push(
                [
                    JSON.parse(JSON.stringify(TOTAL_BUILDINGS)),
                    NUM_OF_COURIERS,
                    JSON.parse(JSON.stringify(INITIAL_BUILDINGS)),
                    JSON.parse(JSON.stringify(BUILDING_SELF_WORKERS_NUM))
                ]
            )
            NUM_OF_COURIERS = 0
            TOTAL_BUILDINGS = {}
            INITIAL_BUILDINGS = {} as any
            BUILDING_SELF_WORKERS_NUM = {}


            for (const pl of team_zone) {
                const dist1 = cached_a_star_search(TEAM_PLANETS_IDXS[1], pl, true, false)
                _our_zone.push({ dist: dist1, idx: pl })
            }
            OUR_ZONE = _our_zone.sort((a, b) => a.dist - b.dist).map((el) => el.idx)
            calculate_best_placement(true)
            // let ddist=0
            // for (const planet of Object.keys(TOTAL_BUILDINGS)) {
            //     const planet_int = parseInt(planet)
            //     const dist4 = cached_a_star_search(ENEMY_PLANETS_IDXS[0], planet_int, true, false)
            //     const dist5 = cached_a_star_search(ENEMY_PLANETS_IDXS[1], planet_int, true, false)
            //     const dist6 = cached_a_star_search(ENEMY_PLANETS_IDXS[2], planet_int, true, false)
            //     ddist += Math.min(dist4, dist5, dist6)
            // }
            // console.log(ddist)
            // for(const planet of Object.keys(TOTAL_BUILDINGS)){
            //     MOVES.push(new MoveAction(OUR_STARTING_PLANET_IDX,parseInt(planet),1,null))
            // }
            // return new Action(MOVES, BUILDS, null)

            _our_zone = []
            placements.push(
                [
                    JSON.parse(JSON.stringify(TOTAL_BUILDINGS)),
                    NUM_OF_COURIERS,
                    JSON.parse(JSON.stringify(INITIAL_BUILDINGS)),
                    JSON.parse(JSON.stringify(BUILDING_SELF_WORKERS_NUM))
                ]
            )
            NUM_OF_COURIERS = 0
            TOTAL_BUILDINGS = {}
            INITIAL_BUILDINGS = {} as any
            BUILDING_SELF_WORKERS_NUM = {}

            for (const pl of team_zone) {
                const dist1 = cached_a_star_search(TEAM_PLANETS_IDXS[2], pl, true, false)
                _our_zone.push({ dist: dist1, idx: pl })
            }
            OUR_ZONE = _our_zone.sort((a, b) => a.dist - b.dist).map((el) => el.idx)
            calculate_best_placement(true)
            // for(const planet of Object.keys(TOTAL_BUILDINGS)){
            //     MOVES.push(new MoveAction(OUR_STARTING_PLANET_IDX,parseInt(planet),1,null))
            // }
            // return new Action(MOVES, BUILDS, SPECIALTY)
            _our_zone = []
            placements.push(
                [
                    JSON.parse(JSON.stringify(TOTAL_BUILDINGS)),
                    NUM_OF_COURIERS,
                    JSON.parse(JSON.stringify(INITIAL_BUILDINGS)),
                    JSON.parse(JSON.stringify(BUILDING_SELF_WORKERS_NUM))
                ]
            )
            NUM_OF_COURIERS = 0
            TOTAL_BUILDINGS = {}
            INITIAL_BUILDINGS = {} as any
            BUILDING_SELF_WORKERS_NUM = {}

            // console.log(team_player1_distance_sum)
            // console.log(team_player2_distance_sum)
            // console.log(team_player3_distance_sum)
            const enemy_distances = []
            for (const placement of placements) {
                let dist = 0
                for (const planet of Object.keys(placement[0])) {
                    const planet_int = parseInt(planet)
                    const dist4 = cached_a_star_search(ENEMY_PLANETS_IDXS[0], planet_int, true, false)
                    const dist5 = cached_a_star_search(ENEMY_PLANETS_IDXS[1], planet_int, true, false)
                    const dist6 = cached_a_star_search(ENEMY_PLANETS_IDXS[2], planet_int, true, false)
                    dist += Math.min(dist4, dist5, dist6)
                }
                enemy_distances.push(dist)
            }

            const best_placements = []
            let max_enemy_dist = -Infinity

            for (let i = 0; i < enemy_distances.length; i++) {
                const enemy_dist = enemy_distances[i]
                if (enemy_dist >= max_enemy_dist) {
                    max_enemy_dist = enemy_dist
                    best_placements.push(i)
                }
            }


            let best_placement = null
            let nearest_player = Infinity
            let nearest_player_distance = Infinity

            let min_dist_player1 = -Math.min(
                cached_a_star_search(TEAM_PLANETS_IDXS[0], ENEMY_PLANETS_IDXS[0], true, false),
                cached_a_star_search(TEAM_PLANETS_IDXS[0], ENEMY_PLANETS_IDXS[1], true, false),
                cached_a_star_search(TEAM_PLANETS_IDXS[0], ENEMY_PLANETS_IDXS[2], true, false),
            )
            let min_dist_player2 = -Math.min(
                cached_a_star_search(TEAM_PLANETS_IDXS[1], ENEMY_PLANETS_IDXS[0], true, false),
                cached_a_star_search(TEAM_PLANETS_IDXS[1], ENEMY_PLANETS_IDXS[1], true, false),
                cached_a_star_search(TEAM_PLANETS_IDXS[1], ENEMY_PLANETS_IDXS[2], true, false),
            )
            let min_dist_player3 = -Math.min(
                cached_a_star_search(TEAM_PLANETS_IDXS[2], ENEMY_PLANETS_IDXS[0], true, false),
                cached_a_star_search(TEAM_PLANETS_IDXS[2], ENEMY_PLANETS_IDXS[1], true, false),
                cached_a_star_search(TEAM_PLANETS_IDXS[2], ENEMY_PLANETS_IDXS[2], true, false),
            )

            for (const best_placement_idx of best_placements) {
                const _best_placement = placements[best_placement_idx][0]

                let team_player1_distance_sum = 0
                team_player1_distance_sum += min_dist_player1
                for (const building of Object.keys(_best_placement)) {
                    team_player1_distance_sum += cached_a_star_search(TEAM_PLANETS_IDXS[0], parseInt(building), true, false)
                }

                let team_player2_distance_sum = 0
                team_player2_distance_sum += min_dist_player2
                for (const building of Object.keys(_best_placement)) {
                    team_player2_distance_sum += cached_a_star_search(TEAM_PLANETS_IDXS[1], parseInt(building), true, false)
                }
                let team_player3_distance_sum = 0
                team_player3_distance_sum += min_dist_player3
                for (const building of Object.keys(_best_placement)) {
                    team_player3_distance_sum += cached_a_star_search(TEAM_PLANETS_IDXS[2], parseInt(building), true, false)
                }

                let team_players_distances = [team_player1_distance_sum, team_player2_distance_sum, team_player3_distance_sum]
                console.log(team_players_distances)
                const team_min = Math.min(...team_players_distances)
                if (team_min < nearest_player_distance) {
                    nearest_player_distance = team_min
                    best_placement = placements[best_placement_idx]
                    let nearest_player_idx_in_arr = team_players_distances.findIndex((el) => el === team_min)
                    let nearest_player_planet_id = TEAM_PLANETS_IDXS[nearest_player_idx_in_arr]
                    let nearest_player_id = ALL_PLANETS[nearest_player_planet_id].workerGroups[0].playerIndex
                    nearest_player = nearest_player_id
                }
            }
            console.log(nearest_player)
            console.log(nearest_player_distance)
            console.log(`my_player_index = ${MY_INDEX}`)
            console.log(`best player index = ${nearest_player}`)
            // console.log(cached_a_star_search(OUR_STARTING_PLANET_IDX, ENEMY_PLANETS_IDXS[0], true, false))


            TOTAL_BUILDINGS = best_placement![0]
            NUM_OF_COURIERS = best_placement![1]
            INITIAL_BUILDINGS = best_placement![2]
            BUILDING_SELF_WORKERS_NUM = best_placement![3]

            if (MY_INDEX !== nearest_player && best_placement) {
                // if(1===1){exit()}
                // 77777710914355448){exit()}
                const team_planets_left = TEAM_PLANETS_IDXS.filter((el) => ALL_PLANETS[el].workerGroups[0].playerIndex !== nearest_player)
                let guard_player_idx = -1
                let battle_player_idx = -1
                let team_player1_distance_sum = 0
                for (const building of Object.keys(best_placement[0])) {
                    team_player1_distance_sum += cached_a_star_search(team_planets_left[0], parseInt(building), true, false)
                }

                let team_player2_distance_sum = 0
                for (const building of Object.keys(best_placement[0])) {
                    team_player2_distance_sum += cached_a_star_search(team_planets_left[1], parseInt(building), true, false)
                }

                if (team_player1_distance_sum < team_player2_distance_sum) {
                    guard_player_idx = ALL_PLANETS[team_planets_left[0]].workerGroups[0].playerIndex
                } else if (team_player1_distance_sum > team_player2_distance_sum) {
                    guard_player_idx = ALL_PLANETS[team_planets_left[1]].workerGroups[0].playerIndex
                } else {
                    guard_player_idx = ALL_PLANETS[team_planets_left[0]].workerGroups[0].playerIndex
                }


                if (guard_player_idx === MY_INDEX) {

                    NEARBY_PLANETS.length = 0
                    for (let i = 0; i < ALL_PLANETS.length; i++) {
                        NEARBY_PLANETS[i] = []
                        for (let j = 0; j < ALL_PLANETS.length; j++) {
                            if (i === j) {
                                continue
                            }
                            const distance = get_distance_by_planet_idxs(i, j)
                            if (distance <= game.maxTravelDistance + game.logisticsUpgrade) {
                                NEARBY_PLANETS[i].push({ distance: distance, planet_idx: j, planet: ALL_PLANETS[j] })
                            }
                        }
                    }

                    const planets_to_def = new Set<number>()
                    for (const planet_idx of Object.keys(TOTAL_BUILDINGS)) {
                        const planet_idx_int = parseInt(planet_idx)
                        if (INITIAL_BUILDINGS.REPLICATOR[0].planet_idx !== planet_idx_int) {
                            planets_to_def.add(planet_idx_int)
                        } else {
                            for (const x of get_planet_neighbors(planet_idx_int)) {
                                planets_to_def.add(x)
                            }
                        }
                    }
                    PLANETS_TO_DEF = Array.from(planets_to_def)
                    const guard_num = equalize_array(1000, PLANETS_TO_DEF.length)
                    for (let i = 0; i < PLANETS_TO_DEF.length; i++) {
                        const planet = PLANETS_TO_DEF[i]
                        add_to_FNS(OUR_STARTING_PLANET_IDX, planet, guard_num[i], null, true, "fix")
                    }


                    SPECIALTY = Specialty.LOGISTICS
                    console.log("GUARD")
                } else {
                    SPECIALTY = Specialty.COMBAT
                    const farm_planets = ALL_PLANETS.filter((el) => el.harvestableResource === Resource.ORGANICS).map((el) => el.id)
                    const farms_used_by_team = INITIAL_BUILDINGS.FARM.map((el) => el.planet_idx)
                    const farm_planets_to_capture = farm_planets.filter((el) => !farms_used_by_team.includes(el))
                    console.log(farm_planets)
                    console.log(farms_used_by_team)
                    console.log(farm_planets_to_capture)
                    let workers_left = 1000 - 50 * farm_planets_to_capture.length


                    const arr_workers = equalize_array(workers_left, farm_planets_to_capture.length)
                    for (let i = 0; i < arr_workers.length; i++) {
                        add_to_FNS(OUR_STARTING_PLANET_IDX, farm_planets_to_capture[i], arr_workers[i], null, true, "soldiers")
                    }


                    for (const farm_pl of farm_planets_to_capture) {
                        COMBAT_FARMS.push({ planet_idx: farm_pl, done: false })
                    }

                    console.log("BATTLE")
                    // exit()
                }
                // let team_players_distances = [team_player1_distance_sum, team_player2_distance_sum]
                // console.log(team_players_distances)
                // const team_min = Math.min(...team_players_distances)
                // if (team_min < nearest_player_distance) {
                //     nearest_player_distance = team_min
                //     best_placement = placements[best_placement_idx]
                //     let nearest_player_idx_in_arr = team_players_distances.findIndex((el) => el === team_min)
                //     let nearest_player_planet_id = TEAM_PLANETS_IDXS[nearest_player_idx_in_arr]
                //     let nearest_player_id = ALL_PLANETS[nearest_player_planet_id].workerGroups[0].playerIndex
                //     nearest_player = nearest_player_id
                // }


            } else if (best_placement) {
                SPECIALTY = Specialty.PRODUCTION
                // TOTAL_BUILDINGS = best_placement[0]
                // NUM_OF_COURIERS = best_placement[1]
                // INITIAL_BUILDINGS = best_placement[2]
                // BUILDING_SELF_WORKERS_NUM = best_placement[3]
                console.log(best_placement)

                left_on_starting_planet = ALL_PLANETS[OUR_STARTING_PLANET_IDX].workerGroups[0].number
                left_on_starting_planet -= (INITIAL_BUILDINGS.MINES.length + INITIAL_BUILDINGS.CAREER.length + INITIAL_BUILDINGS.FARM.length) * 50
                left_on_starting_planet -= (INITIAL_BUILDINGS.FOUNDRY.length + INITIAL_BUILDINGS.FURNANCE.length + INITIAL_BUILDINGS.BIOREACTOR.length) * 100
                left_on_starting_planet -= (INITIAL_BUILDINGS.CHIP_FACTORY.length + INITIAL_BUILDINGS.ACC_FACTORY.length) * 100
                left_on_starting_planet -= (INITIAL_BUILDINGS.REPLICATOR.length) * 200
                console.log(`left_on_starting_planet = ${left_on_starting_planet}`)
                if (left_on_starting_planet > 0) {
                    add_to_FNS(OUR_STARTING_PLANET_IDX, INITIAL_BUILDINGS.FARM[0].planet_idx, left_on_starting_planet, null, true, "just")
                }
            }
            // const frontline_planets = []
            // const avail_workers = left_on_starting_planet
            // for (const planet_idx of OUR_ZONE) {
            //     const nearby_planets = get_planet_neighbors(planet_idx)
            //     for (const near_planet of nearby_planets) {
            //         if (ENEMY_ZONE.includes(near_planet)) {
            //             frontline_planets.push(planet_idx)
            //             // MOVES.push(new MoveAction(OUR_PLANETS_IDXS[0].planet_idx, planet, 50, null))
            //             break
            //         }
            //     }
            // }
            // let k = Math.floor(avail_workers / frontline_planets.length)
            // let ct = avail_workers % frontline_planets.length
            // let i = 1
            // while (i <= frontline_planets.length) { //evenly distribute troops on frontline
            //     let num
            //     if (i <= ct) {
            //         num = k + 1
            //     } else {
            //         num = k
            //     }
            //     MOVES.push(new MoveAction(OUR_STARTING_PLANET_IDX, frontline_planets[i - 1], num, null))
            //     i++
            // }
        }
        // {
        //     for (const planet of ALL_PLANETS) {

        //     }
        // }

        if (SPECIALTY === Specialty.LOGISTICS && !TOTAL_WAR) {
            let workers_num = []
            for (const planet_id of PLANETS_TO_DEF) {
                workers_num.push(get_total_num_of_my_workers_on_planet(planet_id) - get_how_many_foreign_workers_excluding_if_our_destination(planet_id) + get_how_many_flying_to_planet(planet_id, "fix"))
            }
            // console.log(workers_num)
            const workers_sum = get_total_number_of_workers_in_game(MY_INDEX)
            // let avg = Math.round(workers_num.reduce((a, b) => a + b, 0) / workers_num.length)
            const eq_arr = equalize_array(workers_sum, workers_num.length)
            const diff_arr = []
            for (let i = 0; i < workers_num.length; i++) {
                diff_arr[i] = workers_num[i] - eq_arr[i]
            }
            let pizdec_obj: { [key: number]: number } = {}
            for (const planet of ALL_PLANETS) {
                let num = get_total_num_of_my_workers_on_planet(planet.id) - get_how_many_foreign_workers(planet.id)
                if (num > 0 && !PLANETS_TO_DEF.includes(planet.id)) {
                    pizdec_obj[diff_arr.length] = planet.id
                    diff_arr.push(num)
                }
            }

            for (let i = 0; i < diff_arr.length; i++) {
                let val = diff_arr[i]
                if (val <= 0) { continue }
                for (let j = 0; j < diff_arr.length; j++) {
                    if (i === j) { continue }
                    if (val <= 0) { break }
                    const val2 = diff_arr[j]
                    if (val2 < 0) {
                        const needed = -val2
                        const diff = Math.min(val, needed)
                        val -= diff
                        let from_planet
                        if (PLANETS_TO_DEF[i] === undefined) {
                            from_planet = pizdec_obj[i]
                        } else {
                            from_planet = PLANETS_TO_DEF[i]
                        }
                        add_to_FNS(from_planet, PLANETS_TO_DEF[j], diff, null, true, "fix")
                        diff_arr[i] -= diff
                        diff_arr[j] += diff
                    }
                }
            }

        }

        if (SPECIALTY === Specialty.COMBAT && !TOTAL_WAR) {
            let workers_num = []
            let skip_flag = false
            let combat_farms_ids = COMBAT_FARMS.map((el) => el.planet_idx)
            // if(game.currentTick===50){
            //     for (const farm of COMBAT_FARMS) {
            //         console.log(get_how_many_flying_to_planet(farm.planet_idx, "initial_building"))
            //      }
            //      exit()
            // }

            for (const farm of COMBAT_FARMS) {
                if (get_how_many_flying_to_planet(farm.planet_idx, "initial_building") > 0) {
                    skip_flag = true
                    break
                }
                workers_num.push(get_total_num_of_my_workers_on_planet(farm.planet_idx) - get_how_many_foreign_workers_excluding_if_our_destination(farm.planet_idx) + get_how_many_flying_to_planet(farm.planet_idx, "fix") + get_how_many_flying_to_planet(farm.planet_idx, "initial_building"))
            }
            // if (game.currentTick === 50) {
            //     console.log(workers_num)
            //     for (const farm of COMBAT_FARMS) {
            //         console.log(get_total_num_of_my_workers_on_planet(farm.planet_idx))
            //     }
            //     exit()
            // }
            if (!skip_flag && game.currentTick > 2) {
                // console.log(`tick ${game.currentTick}`)
                // console.log(workers_num)
                const workers_sum = get_total_number_of_workers_in_game(MY_INDEX)
                // let avg = Math.round(workers_num.reduce((a, b) => a + b, 0) / workers_num.length)
                const eq_arr = equalize_array(workers_sum, workers_num.length)
                const diff_arr = []
                for (let i = 0; i < workers_num.length; i++) {
                    diff_arr[i] = workers_num[i] - eq_arr[i]
                }
                let pizdec_obj: { [key: number]: number } = {}
                for (const planet of ALL_PLANETS) {
                    let num = get_total_num_of_my_workers_on_planet(planet.id) - get_how_many_foreign_workers(planet.id)
                    if (num > 0 && !combat_farms_ids.includes(planet.id)) {
                        pizdec_obj[diff_arr.length] = planet.id
                        diff_arr.push(num)
                    }
                }
                // console.log(pizdec_obj)
                // console.log(diff_arr)
                for (let i = 0; i < diff_arr.length; i++) {
                    let val = diff_arr[i]
                    if (val <= 0) { continue }
                    for (let j = 0; j < diff_arr.length; j++) {
                        if (i === j) { continue }
                        if (val <= 0) { break }
                        const val2 = diff_arr[j]
                        if (val2 < 0) {
                            const needed = -val2
                            const diff = Math.min(val, needed)
                            val -= diff
                            let from_planet
                            if (COMBAT_FARMS[i] === undefined) {
                                from_planet = pizdec_obj[i]
                            } else {
                                from_planet = COMBAT_FARMS[i].planet_idx
                            }
                            add_to_FNS(from_planet, COMBAT_FARMS[j].planet_idx, diff, null, true, "fix")
                            diff_arr[i] -= diff
                            diff_arr[j] += diff
                        }
                    }
                }

            }



            for (let i = 0; i < COMBAT_FARMS.length; i++) {
                const farm = COMBAT_FARMS[i]

                if (farm.done) { continue }
                if (check_if_already_flying_to_planet(farm.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 50)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 50)
                farm.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, farm.planet_idx, 50, Resource.STONE, true, "initial_building")
                console.log("FARM_SENT")
                const aaa = game.buildingProperties.get(BuildingType.FARM)!.buildResources
                BUILD_LIST.push({
                    planet_idx: farm.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(farm.planet_idx, BuildingType.FARM as BuildingType)
                })
            }

        }

        if (SPECIALTY === Specialty.PRODUCTION && !TOTAL_WAR) {
            //initial building
            for (let i = 0; i < INITIAL_BUILDINGS.MINES.length; i++) {
                const mine = INITIAL_BUILDINGS.MINES[i]

                if (mine.done) { continue }
                if (check_if_already_flying_to_planet(mine.planet_idx, "initial_building")) {
                    continue
                }

                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 50)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 50)

                mine.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, mine.planet_idx, 50, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[mine.planet_idx] > 50 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[mine.planet_idx] - 50)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, mine.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.MINES)!.buildResources
                BUILD_LIST.push({
                    planet_idx: mine.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(mine.planet_idx, BuildingType.MINES as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.FARM.length; i++) {
                const farm = INITIAL_BUILDINGS.FARM[i]

                if (farm.done) { continue }
                if (check_if_already_flying_to_planet(farm.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 50)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 50)
                farm.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, farm.planet_idx, 50, Resource.STONE, true, "initial_building")
                console.log("FARM_SENT")
                // if (TOTAL_BUILDINGS[farm.planet_idx] > 50 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[farm.planet_idx] - 50)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, farm.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.FARM)!.buildResources
                BUILD_LIST.push({
                    planet_idx: farm.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(farm.planet_idx, BuildingType.FARM as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.CAREER.length; i++) {
                const career = INITIAL_BUILDINGS.CAREER[i]

                if (career.done) { continue }
                if (check_if_already_flying_to_planet(career.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 50)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 50)
                career.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, career.planet_idx, 50, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[career.planet_idx] > 50 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[career.planet_idx] - 50)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, career.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.CAREER)!.buildResources
                BUILD_LIST.push({
                    planet_idx: career.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(career.planet_idx, BuildingType.CAREER as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.FOUNDRY.length; i++) {
                const foundry = INITIAL_BUILDINGS.FOUNDRY[i]

                if (foundry.done) { continue }
                if (check_if_already_flying_to_planet(foundry.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 100)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 100)
                foundry.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, foundry.planet_idx, 100, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[foundry.planet_idx] > 100 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[foundry.planet_idx] - 100)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, foundry.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.FOUNDRY)!.buildResources
                BUILD_LIST.push({
                    planet_idx: foundry.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(foundry.planet_idx, BuildingType.FOUNDRY as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.FURNANCE.length; i++) {
                const furnace = INITIAL_BUILDINGS.FURNANCE[i]

                if (furnace.done) { continue }
                if (check_if_already_flying_to_planet(furnace.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 100)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 100)
                furnace.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, furnace.planet_idx, 100, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[furnace.planet_idx] > 100 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[furnace.planet_idx] - 100)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, furnace.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.FURNACE)!.buildResources
                BUILD_LIST.push({
                    planet_idx: furnace.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(furnace.planet_idx, BuildingType.FURNACE as BuildingType)
                })
            }
            // console.log(FLYING_NAVIGATION_SYSTEM)
            for (let i = 0; i < INITIAL_BUILDINGS.BIOREACTOR.length; i++) {
                const bioreactor = INITIAL_BUILDINGS.BIOREACTOR[i]
                if (bioreactor.done) { continue }
                if (check_if_already_flying_to_planet(bioreactor.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 100)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 100)
                bioreactor.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, bioreactor.planet_idx, 100, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[bioreactor.planet_idx] > 100 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[bioreactor.planet_idx] - 100)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, bioreactor.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.BIOREACTOR)!.buildResources
                BUILD_LIST.push({
                    planet_idx: bioreactor.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(bioreactor.planet_idx, BuildingType.BIOREACTOR as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.CHIP_FACTORY.length; i++) {
                const chip_factory = INITIAL_BUILDINGS.CHIP_FACTORY[i]
                if (chip_factory.done) { continue }
                if (check_if_already_flying_to_planet(chip_factory.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 100)) {
                    break
                }
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 100)
                chip_factory.done = true
                add_to_FNS(OUR_STARTING_PLANET_IDX, chip_factory.planet_idx, 100, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[chip_factory.planet_idx] > 100 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[chip_factory.planet_idx] - 100)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, chip_factory.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.CHIP_FACTORY)!.buildResources
                BUILD_LIST.push({
                    planet_idx: chip_factory.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(chip_factory.planet_idx, BuildingType.CHIP_FACTORY as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.ACC_FACTORY.length; i++) {
                const acc_factory = INITIAL_BUILDINGS.ACC_FACTORY[i]
                if (acc_factory.done) { continue }
                if (check_if_already_flying_to_planet(acc_factory.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 100)) {
                    break
                }
                acc_factory.done = true
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 100)
                add_to_FNS(OUR_STARTING_PLANET_IDX, acc_factory.planet_idx, 100, Resource.STONE, true, "initial_building")
                // if (TOTAL_BUILDINGS[acc_factory.planet_idx] > 100 && left_on_starting_planet > 0) {
                //     const diff = Math.min(left_on_starting_planet, TOTAL_BUILDINGS[acc_factory.planet_idx] - 100)
                //     add_to_FNS(OUR_STARTING_PLANET_IDX, acc_factory.planet_idx, diff, null, true, "initial_building")
                // }
                const aaa = game.buildingProperties.get(BuildingType.ACCUMULATOR_FACTORY)!.buildResources
                BUILD_LIST.push({
                    planet_idx: acc_factory.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(acc_factory.planet_idx, BuildingType.ACCUMULATOR_FACTORY as BuildingType)
                })
            }

            for (let i = 0; i < INITIAL_BUILDINGS.REPLICATOR.length; i++) {
                const replicator = INITIAL_BUILDINGS.REPLICATOR[i]
                if (replicator.done) { continue }
                if (check_if_already_flying_to_planet(replicator.planet_idx, "initial_building")) {
                    continue
                }
                const res = ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.get(Resource.STONE)
                if (!(res && res >= 200)) {
                    break
                }
                replicator.done = true
                ALL_PLANETS[OUR_STARTING_PLANET_IDX].resources.set(Resource.STONE, res - 200)
                add_to_FNS(OUR_STARTING_PLANET_IDX, replicator.planet_idx, 200, Resource.STONE, true, "initial_building")
                const aaa = game.buildingProperties.get(BuildingType.REPLICATOR)!.buildResources
                BUILD_LIST.push({
                    planet_idx: replicator.planet_idx,
                    needed_resources: [...aaa].map(([name, value]) => ({ name, value })),
                    action: new BuildingAction(replicator.planet_idx, BuildingType.REPLICATOR as BuildingType)
                })
            }

            {

                if (!INIT_BUILDING_DONE) {
                    console.log(INIT_DONE_PLANET)
                    const _TOTAL_BUILDINGS = Object.entries(TOTAL_BUILDINGS)
                    for (const [key, needed_workers] of _TOTAL_BUILDINGS) {
                        const building_planet_idx = parseInt(key)
                        const planet = ALL_PLANETS[parseInt(key)]
                        if (INIT_DONE_PLANET.includes(planet.id)) {
                            continue
                        }

                        if (get_how_many_flying_to_planet(planet.id, "courier") + get_how_many_flying_to_planet(planet.id, "courier_empty_back") > 0) { continue }
                        if (planet.building) {
                            const real_num_of_workers_planet1 = get_num_of_workers_fail_safe(planet.id) - get_how_many_foreign_workers(planet.id) + get_how_many_flying_to_planet(planet.id, "send_free_workers")

                            if (get_num_of_workers_fail_safe(planet.id) - get_how_many_foreign_workers(planet.id) < needed_workers) {
                                // if(game.currentTick>=146){
                                //     console.log(`____ ${building_planet_idx}`)
                                // }
                                if (real_num_of_workers_planet1 >= needed_workers) { continue }
                                let workers_needed_left = needed_workers - real_num_of_workers_planet1
                                const planets_with_our_workers = get_planets_with_our_workers()
                                const arr = planets_with_our_workers.slice()
                                arr.sort((a, b) => cached_a_star_search(building_planet_idx, a.id, true, true) - cached_a_star_search(building_planet_idx, b.id, true, true))
                                // console.log(`___ ${key}`)
                                // console.log(workers_needed_left)
                                for (const our_pl of arr) {

                                    if (building_planet_idx === our_pl.id) { continue }
                                    if (workers_needed_left === 0) { break }
                                    const real_num_of_workers_planet2 = get_num_of_workers_fail_safe(our_pl.id) - get_how_many_foreign_workers(our_pl.id)
                                    if (real_num_of_workers_planet2 <= 0) { continue }

                                    if (TOTAL_BUILDINGS[our_pl.id] !== undefined) { //our_pl has building 
                                        if (get_how_many_flying_to_planet(our_pl.id, "courier") + get_how_many_flying_to_planet(our_pl.id, "courier_empty_back") > 0) { continue }
                                        // if(game.currentTick===76){console.log(`__ ${our_pl.id}`)}
                                        let taken_off_couriers = false
                                        for (const [key, value] of COURIER_SYSTEM) {
                                            if (value.from_planet_idx === our_pl.id) {
                                                const fl_grp = FLYING_NAVIGATION_SYSTEM.get(value.flying_id)
                                                if (fl_grp && fl_grp.from_planet === our_pl.id) {
                                                    taken_off_couriers = true
                                                }
                                            }
                                        }

                                        // if(game.currentTick===76){console.log(taken_off_couriers)}

                                        if (INIT_DONE_PLANET.includes(our_pl.id) && our_pl.building) {
                                            if (!taken_off_couriers && real_num_of_workers_planet2 > TOTAL_BUILDINGS[our_pl.id]) { // has free workers and is ready
                                                const workers_free = real_num_of_workers_planet2 - TOTAL_BUILDINGS[our_pl.id]
                                                const diff = Math.min(workers_free, workers_needed_left)
                                                workers_needed_left -= diff

                                                remove_workers_from_our_wrk_group_on_planet(our_pl.id, diff)
                                                // ALL_PLANETS[our_pl.id].workerGroups[0].number -= diff
                                                // if(building_planet_idx===6){
                                                //     console.log("============")
                                                //     console.log("SEND_TO_6")
                                                //     console.log(diff)
                                                //     console.log("============")
                                                // }
                                                add_to_FNS(our_pl.id, building_planet_idx, diff, null, true, "send_free_workers")
                                            } else if (taken_off_couriers) {
                                                let workers_free = real_num_of_workers_planet2 - BUILDING_SELF_WORKERS_NUM[our_pl.id]
                                                // if (workers_free < 0) {
                                                //     workers_free = real_num_of_workers_planet2 - BUILDING_SELF_WORKERS_NUM[our_pl.id]
                                                // }
                                                const diff = Math.min(workers_free, workers_needed_left)
                                                if (diff > 0) {
                                                    workers_needed_left -= diff
                                                    remove_workers_from_our_wrk_group_on_planet(our_pl.id, diff)
                                                    // ALL_PLANETS[our_pl.id].workerGroups[0].number -= diff
                                                    add_to_FNS(our_pl.id, building_planet_idx, diff, null, true, "send_free_workers")
                                                }
                                            }
                                        }
                                    } else {
                                        if (our_pl.id === OUR_STARTING_PLANET_IDX && game.currentTick < 100) { continue }
                                        if (BUILD_LIST.find((el) => el.planet_idx === our_pl.id && (ALL_PLANETS[el.planet_idx].resources.get(Resource.STONE) || 0) >= el.needed_resources[0].value)) { continue }
                                        const workers_free = real_num_of_workers_planet2
                                        const diff = Math.min(workers_free, workers_needed_left)
                                        workers_needed_left -= diff
                                        remove_workers_from_our_wrk_group_on_planet(our_pl.id, diff)
                                        // ALL_PLANETS[our_pl.id].workerGroups[0].number -= diff
                                        add_to_FNS(our_pl.id, building_planet_idx, diff, null, true, "send_free_workers")
                                    }
                                }

                            } else {
                                // if (planet.id === 29) {
                                //     console.log("==========")
                                //     console.log(planet.workerGroups[0].number)
                                //     console.log(get_passing_by_flying_couriers(planet.id))
                                //     console.log(FLYING_NAVIGATION_SYSTEM)
                                //     console.log(get_how_many_flying_to_planet(planet.id, "send_free_workers"))
                                //     console.log(real_num_of_workers_planet1)
                                //     console.log("==========")
                                //     exit()
                                // }
                                INIT_DONE_PLANET.push(planet.id)
                            }
                        }
                    }
                    if (INIT_DONE_PLANET.length === _TOTAL_BUILDINGS.length) {
                        INIT_BUILDING_DONE = true
                        console.log("INIT BUILDING DONE")
                    }
                }
                // if(game.currentTick===398){exit()}
                if (game.currentTick > 20) {
                    for (const planet of INITIAL_BUILDINGS.FOUNDRY) {
                        for (const [key, value] of Object.entries(planet.ore_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                // console.log(")))))))))))))))))))))))))))))))))))))))))")
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.ORE)
                            }
                        }
                    }
                    for (const planet of INITIAL_BUILDINGS.FURNANCE) {
                        for (const [key, value] of Object.entries(planet.sand_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.SAND)
                            }
                        }
                    }
                    for (const planet of INITIAL_BUILDINGS.BIOREACTOR) {
                        for (const [key, value] of Object.entries(planet.organics_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.ORGANICS)
                            }
                        }
                    }

                    for (const planet of INITIAL_BUILDINGS.CHIP_FACTORY) {
                        for (const [key, value] of Object.entries(planet.metal_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.METAL)
                            }
                        }
                        for (const [key, value] of Object.entries(planet.silicon_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            // console.log("=======================================")
                            // if(ALL_PLANETS[parseInt(key)].workerGroups.length === 1){
                            // console.log(key)
                            // console.log(ALL_PLANETS[parseInt(key)].workerGroups[0].number)
                            // console.log(get_how_many_foreign_workers(parseInt(key)))
                            // console.log(ALL_PLANETS[parseInt(key)].workerGroups[0].number-get_how_many_foreign_workers(parseInt(key)))
                            // console.log(TOTAL_BUILDINGS[key])}

                            // console.log("=======================================")
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                // console.log("=======================================")
                                // exit()
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.SILICON)
                            }
                        }
                    }
                    for (const planet of INITIAL_BUILDINGS.ACC_FACTORY) {
                        for (const [key, value] of Object.entries(planet.metal_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.METAL)
                            }
                        }
                        for (const [key, value] of Object.entries(planet.plastic_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.PLASTIC)
                            }
                        }
                    }


                    for (const planet of INITIAL_BUILDINGS.REPLICATOR) {
                        for (const [key, value] of Object.entries(planet.metal_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.METAL)
                            }

                        }
                        for (const [key, value] of Object.entries(planet.chip_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.CHIP)
                            }
                        }

                        for (const [key, value] of Object.entries(planet.acc_sources)) {
                            const hash = `${key}_${planet.planet_idx}`
                            if (INIT_DONE_PLANET.includes(parseInt(key)) && get_num_of_workers_fail_safe(parseInt(key)) - get_how_many_foreign_workers(parseInt(key)) >= TOTAL_BUILDINGS[key] && !INIT_COURIERS.includes(hash)) {
                                INIT_COURIERS.push(hash)
                                add_to_CS(parseInt(key), planet.planet_idx, value, Resource.ACCUMULATOR)
                            }
                        }
                    }
                }
            }
            // if(game.currentTick===150){
            //     console.log(get_missing_buildings().length === 0)
            //     console.log(check_if_not_enough_workers())
            //     exit()
            // }
            // {
            //     for(const cour)
            // }
            // console.log(check_if_not_enough_workers())|| NUM_OF_COURIERS!==COURIER_SYSTEM.size
            if (game.currentTick >= 100 && get_missing_buildings().length === 0 &&
                ((game.currentTick % 2 === 0 && check_if_not_enough_workers()) ||
                    (game.currentTick % 10 === 0 && NUM_OF_COURIERS !== COURIER_SYSTEM.size)
                ) // || (game.currentTick % 20 === 0) && NUM_OF_COURIERS !== COURIER_SYSTEM.size)
            ) {
                console.log(check_if_not_enough_workers())
                console.log(NUM_OF_COURIERS !== COURIER_SYSTEM.size)
                // if(game.currentTick>800){
                //     console.log(`tick === ${game.currentTick}`)
                //     console.log(FLYING_NAVIGATION_SYSTEM)
                //     console.log(TOTAL_BUILDINGS)
                //     console.log(BUILDING_SELF_WORKERS_NUM)
                //     exit()
                // }
                TOP_ACHIEVED = false
                // console.log(check_if_not_enough_workers())
                console.log("===============================")
                console.log("BROKEN PLACEMENT DETECTED")
                console.log("===============================")
                // if(1===1){exit()}
                let our_planets_captured = false
                for (const planet_id of Object.keys(TOTAL_BUILDINGS)) {
                    // console.log(`___ ${planet_id}`)
                    if (get_total_num_of_enemies_on_planet(parseInt(planet_id)) > get_how_many_flying_to_planet(parseInt(planet_id), "battle_clearing_our_planet") + get_total_num_of_allies_on_planet(parseInt(planet_id))) {
                        our_planets_captured = true
                        // console.log(planet_id)

                        // console.log(planet_id)
                        let workers_needed = 2 * (get_total_num_of_enemies_on_planet(parseInt(planet_id)) - get_total_num_of_allies_on_planet(parseInt(planet_id)))

                        const planets_with_our_workers = get_planets_with_our_workers()
                        const arr = planets_with_our_workers.slice()
                        arr.sort((a, b) => cached_a_star_search(parseInt(planet_id), a.id, true, true) - cached_a_star_search(parseInt(planet_id), b.id, true, true))

                        for (const our_planet of arr) {
                            if (parseInt(planet_id) === our_planet.id) { continue }
                            if (workers_needed === 0) { break }
                            const real_num_of_workers_planet2 = get_num_of_workers_fail_safe(our_planet.id) - get_how_many_foreign_workers(our_planet.id)
                            if (real_num_of_workers_planet2 > 0) {

                                const workers_free = real_num_of_workers_planet2
                                const diff = Math.min(workers_free, workers_needed)
                                workers_needed -= diff
                                remove_workers_from_our_wrk_group_on_planet(our_planet.id, diff)
                                // for (const planet of ALL_PLANETS) {
                                //     if (planet.id === our_planet.id) {
                                //         for (const worker_group of planet.workerGroups) {
                                //             if (worker_group.playerIndex === MY_INDEX) {
                                //                 worker_group.number -= diff
                                //             }
                                //         }
                                //     }
                                // }
                                add_to_FNS(our_planet.id, parseInt(planet_id), diff, null, true, "battle_clearing_our_planet")
                            }

                        }
                    }
                }


                if (!our_planets_captured) {
                    if (((game.currentTick - last_success_reorg_call) > 30 && (game.currentTick - last_non_enemy_broken_placement_call) > 40)) {
                        last_non_enemy_broken_placement_call = game.currentTick
                        let workers = 0
                        for (const planet of ALL_PLANETS) {
                            workers += Math.max(get_total_num_of_my_workers_on_planet(planet.id) - get_total_num_of_enemies_on_planet(planet.id), 0)
                            // if (planet.workerGroups.length === 1 && planet.workerGroups[0].playerIndex === MY_INDEX) {
                            //     workers += planet.workerGroups[0].number
                            // } else if (planet.workerGroups.length >= 2) {
                            //     for (const worker_group of planet.workerGroups) {
                            //         if (worker_group.playerIndex === MY_INDEX) {
                            //             workers += worker_group.number
                            //         } else {
                            //             workers -= worker_group.number
                            //         }
                            //     }
                            // }
                        }
                        console.log(`workers without flying= ${workers}`)
                        for (const flying_group of game.flyingWorkerGroups) {
                            if (flying_group.playerIndex === MY_INDEX) {
                                workers += flying_group.number
                            }
                        }

                        console.log(`Detected workers = ${workers}`)
                        calculate_best_placement(false, workers)
                        COURIER_SYSTEM.clear() //жесть
                        INIT_BUILDING_DONE = false
                        INIT_DONE_PLANET = []
                        INIT_COURIERS = []
                    }

                } else {
                    console.log("OUR_PLANETS_CAPTURED")
                    COURIER_SYSTEM.clear() //жесть
                    INIT_BUILDING_DONE = false
                    INIT_DONE_PLANET = []
                    INIT_COURIERS = []
                }
            }


            if (INIT_BUILDING_DONE && game.currentTick >= 100 && game.currentTick % 50 === 0 && get_missing_buildings().length === 0 && !check_if_not_enough_workers()) {

                let workers = 0
                for (const planet_id of Object.keys(TOTAL_BUILDINGS)) {
                    workers += get_num_of_workers_fail_safe(parseInt(planet_id))
                }
                for (const flyting_group of game.flyingWorkerGroups) {
                    if (flyting_group.playerIndex === MY_INDEX) {
                        workers += flyting_group.number
                    }
                }
                console.log(workers)
                const old_copy = JSON.parse(JSON.stringify(TOTAL_BUILDINGS))
                const old_number = Object.values(old_copy).reduce((a: any, b: any) => a + b, 0)
                const res = calculate_best_placement(false, workers)
                const new_number = Object.values(TOTAL_BUILDINGS).reduce((a, b) => a + b, 0)
                console.log("==================")
                console.log(old_number)
                console.log(new_number)
                console.log("==================")
                if (old_number !== new_number || NUM_OF_COURIERS !== COURIER_SYSTEM.size) {
                    last_success_reorg_call = game.currentTick
                    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
                    console.log("REORG")
                    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
                    if (NUM_OF_COURIERS !== COURIER_SYSTEM.size && old_number === new_number) {
                        console.log("REORG BECAUSE NOT ENOUGH COURIERS")
                        // exit()
                    }
                    console.log(TOTAL_BUILDINGS)
                    COURIER_SYSTEM.clear() //жесть
                    INIT_BUILDING_DONE = false
                    INIT_DONE_PLANET = []
                    INIT_COURIERS = []
                } else {
                    if (res !== undefined && res.msg === "not_enough_planets_not_init") {
                        TOP_ACHIEVED = true
                    }
                }
            }


            aab: if (INIT_BUILDING_DONE && get_missing_buildings().length === 0 && !check_if_not_enough_workers() && TOP_ACHIEVED) {
                let real_num_of_workers_planets = get_num_of_workers_fail_safe(INITIAL_BUILDINGS.REPLICATOR[0].planet_idx) - get_how_many_foreign_workers(INITIAL_BUILDINGS.REPLICATOR[0].planet_idx) - INITIAL_BUILDINGS.REPLICATOR[0].cur_workers
                if (real_num_of_workers_planets < 2) { break aab }
                // console.log(real_num_of_workers_planets)
                const our_planets = get_planets_with_our_workers()
                const enemy_planets = get_planets_with_enemy_workers().filter((el) => el.building !== null)
                enemy_planets.sort((a, b) => get_building_priority(a?.building?.buildingType) - get_building_priority(b?.building?.buildingType))
                for (const planet of enemy_planets) {
                    if (get_total_num_of_enemies_on_planet(planet.id) > get_how_many_flying_to_planet(planet.id, "battle_clearing_enemy_planet") + get_total_num_of_allies_on_planet(planet.id)) {
                        let enemy_planet_workers = get_total_num_of_enemies_on_planet(planet.id) - get_total_num_of_allies_on_planet(planet.id)
                        if (real_num_of_workers_planets > 0) {
                            const diff = Math.min(real_num_of_workers_planets, enemy_planet_workers)
                            real_num_of_workers_planets -= diff
                            enemy_planet_workers -= diff
                            add_to_FNS(INITIAL_BUILDINGS.REPLICATOR[0].planet_idx, planet.id, diff, null, true, "battle_clearing_enemy_planet")
                        }
                        for (const pl of our_planets) {
                            if (enemy_planet_workers > 0 && TOTAL_BUILDINGS[pl.id] === undefined) {
                                let real_num_of_workers_planets = get_num_of_workers_fail_safe(pl.id) - get_how_many_foreign_workers(pl.id)
                                if (real_num_of_workers_planets > 0) {
                                    const diff = Math.min(real_num_of_workers_planets, enemy_planet_workers)
                                    enemy_planet_workers -= diff

                                    for (const worker_group of pl.workerGroups) {
                                        if (worker_group.playerIndex === MY_INDEX) {
                                            worker_group.number -= diff
                                        }
                                    }
                                    add_to_FNS(pl.id, planet.id, diff, null, true, "battle_clearing_enemy_planet")
                                }
                            }
                        }
                    }
                }
                // for (const planet of ALL_PLANETS) {
                //     if (planet.building && real_num_of_workers_planets > 0 && get_total_num_of_enemies_on_planet(planet.id) > get_how_many_flying_to_planet(planet.id, "battle_clearing_enemy_planet") + get_total_num_of_allies_on_planet(planet.id)) {
                //         const diff = Math.min(real_num_of_workers_planets, get_total_num_of_enemies_on_planet(planet.id))
                //         real_num_of_workers_planets -= diff
                //         add_to_FNS(INITIAL_BUILDINGS.REPLICATOR[0].planet_idx, planet.id, diff, null, true, "battle_clearing_enemy_planet")
                //     }
                // }
                if (real_num_of_workers_planets > 0) {
                    let flag = false
                    for (const planet of ALL_PLANETS) {
                        if (get_total_num_of_enemies_on_planet(planet.id) > get_total_num_of_allies_on_planet(planet.id)) {
                            flag = true
                        }
                    }
                    if (flag === false) { //врагов не осталось?
                        for (const planet of ALL_PLANETS) {
                            if (planet.building?.buildingType === BuildingType.FARM || planet.building?.buildingType === BuildingType.CAREER || planet.building?.buildingType === BuildingType.MINES || planet.building?.buildingType === BuildingType.QUARRY) {
                                if (real_num_of_workers_planets > 0 && get_how_many_flying_to_planet(planet.id, "conquest_free") === 0) {
                                    const current_workers = get_total_num_of_allies_on_planet(planet.id)
                                    if (current_workers >= 100) {
                                        continue
                                    }
                                    const diff = Math.min(real_num_of_workers_planets, 100 - current_workers)
                                    real_num_of_workers_planets -= diff
                                    // console.log(diff)
                                    if (diff > 0) {
                                        add_to_FNS(INITIAL_BUILDINGS.REPLICATOR[0].planet_idx, planet.id, diff, null, true, "conquest_free")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        {
            if (game.currentTick > 20) {
                let my_team_production = 0

                for (const planet of ALL_PLANETS_ORIGINAL) {
                    if (planet.workerGroups.length > 0) {
                        for (const worker_group of planet.workerGroups) {
                            if (PLAYERS[worker_group.playerIndex].teamIndex === MY_TEAM && PLAYERS[worker_group.playerIndex].specialty === Specialty.PRODUCTION) {
                                my_team_production += worker_group.number
                            }
                        }
                    }
                }
                for (const flying_group of game.flyingWorkerGroups) {
                    if (PLAYERS[flying_group.playerIndex].teamIndex === MY_TEAM && PLAYERS[flying_group.playerIndex].specialty === Specialty.PRODUCTION) {
                        my_team_production += flying_group.number
                    }
                }
                if (my_team_production === 0) {
                    TOTAL_WAR = true
                }
            }

        }

        {
            if (game.currentTick > 30) {
                let enemy_workers = 0
                let allied_workers = 0
                for (const planet of ALL_PLANETS_ORIGINAL) {
                    if (planet.workerGroups.length > 0) {
                        for (const worker_group of planet.workerGroups) {
                            if (PLAYERS[worker_group.playerIndex].teamIndex === MY_TEAM) {
                                if (PLAYERS[worker_group.playerIndex].specialty === Specialty.COMBAT) {
                                    allied_workers += 1.2 * worker_group.number
                                } else {
                                    allied_workers += worker_group.number
                                }
                            } else {
                                if (PLAYERS[worker_group.playerIndex].specialty === Specialty.COMBAT) {
                                    enemy_workers += 1.2 * worker_group.number
                                } else {
                                    enemy_workers += worker_group.number
                                }
                            }
                        }
                    }
                }
                for (const flying_group of game.flyingWorkerGroups) {
                    if (PLAYERS[flying_group.playerIndex].teamIndex === MY_TEAM) {
                        if (PLAYERS[flying_group.playerIndex].specialty === Specialty.COMBAT) {
                            allied_workers += 1.2 * flying_group.number
                        } else {
                            allied_workers += flying_group.number
                        }
                    } else {
                        if (PLAYERS[flying_group.playerIndex].specialty === Specialty.COMBAT) {
                            enemy_workers += 1.2 * flying_group.number
                        } else {
                            enemy_workers += flying_group.number
                        }
                    }
                }
                // console.log(allied_workers)
                // console.log(enemy_workers)
                if (allied_workers - enemy_workers >= 50) {
                    TOTAL_WAR = true
                }
            }
        }


        if (game.currentTick > 100 && get_missing_buildings().length !== 0 || TOTAL_WAR) { //|| (game.currentTick === 120) ||
            TOTAL_WAR = true
            COURIER_SYSTEM.clear() //жесть
            INIT_BUILDING_DONE = false
            INIT_DONE_PLANET = []
            INIT_COURIERS = []
            TOTAL_BUILDINGS = {}
            BUILDING_SELF_WORKERS_NUM = {}
            const enemy_planets = get_planets_with_enemy_workers()
            const planets_with_our_workers = get_planets_with_our_workers()
            for (const enemy_planet of enemy_planets) {
                let workers_needed = get_total_num_of_enemies_on_planet(enemy_planet.id)
                for (const our_planet of planets_with_our_workers) {
                    if (workers_needed === 0) { break }
                    const real_num_of_workers = get_num_of_workers_fail_safe(our_planet.id)
                    if (real_num_of_workers > 0) {
                        const workers_free = real_num_of_workers
                        const diff = Math.min(workers_free, workers_needed)
                        workers_needed -= diff
                        remove_workers_from_our_wrk_group_on_planet(our_planet.id, diff)
                        // ALL_PLANETS[our_planet.id].workerGroups[0].number -= diff
                        add_to_FNS(our_planet.id, enemy_planet.id, diff, null, true, "kamikaze")
                    }
                }
            }
            if (enemy_planets.length === 0) {
                const farm_planets = ALL_PLANETS.filter((el) => el.building?.buildingType === BuildingType.FARM)
                const career_planets = ALL_PLANETS.filter((el) => el.building?.buildingType === BuildingType.CAREER)
                const mines_planets = ALL_PLANETS.filter((el) => el.building?.buildingType === BuildingType.MINES)
                const quarry_planets = ALL_PLANETS.filter((el) => el.building?.buildingType === BuildingType.QUARRY)
                const planets_with_our_workers = get_planets_with_our_workers()

                const farm_cnst: any = [BuildingType.FARM]
                const career_cnst: any = [BuildingType.FARM, BuildingType.CAREER]
                const mines_cnst: any = [BuildingType.FARM, BuildingType.CAREER, BuildingType.MINES]
                const quarry_cnst: any = [BuildingType.FARM, BuildingType.CAREER, BuildingType.MINES, BuildingType.QUARRY]
                for (const planet of farm_planets) {
                    let workers_needed = 100 - get_total_num_of_allies_on_planet(planet.id)
                    if (workers_needed > 0) {
                        for (const our_planet of planets_with_our_workers) {
                            if (!farm_cnst.includes(our_planet.building?.buildingType) ||
                                farm_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                let real_num_of_workers = get_num_of_workers_fail_safe(our_planet.id)
                                if (farm_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                    let max_workers= -1
                                    let pl_idx=-1
                                    for(const wrk_group of our_planet.workerGroups){
                                        if(wrk_group.number>=max_workers){
                                            max_workers=wrk_group.number
                                            pl_idx=wrk_group.playerIndex
                                        }
                                    }
                                    if(pl_idx !== MY_INDEX){continue}
                                    real_num_of_workers = Math.min(get_total_num_of_allies_on_planet(our_planet.id) - 100, real_num_of_workers)
                                }
                                if (real_num_of_workers > 0 && get_how_many_flying_to_planet(planet.id, "last_build") === 0) {
                                    const workers_free = real_num_of_workers
                                    const diff = Math.min(workers_free, workers_needed)
                                    workers_needed -= diff
                                    remove_workers_from_our_wrk_group_on_planet(our_planet.id, diff)
                                    // ALL_PLANETS[our_planet.id].workerGroups[0].number -= diff
                                    add_to_FNS(our_planet.id, planet.id, diff, null, true, "last_build")
                                }
                            }
                        }
                    }
                }
                for (const planet of career_planets) {
                    let workers_needed = 100 - get_total_num_of_allies_on_planet(planet.id)
                    if (workers_needed > 0) {
                        for (const our_planet of planets_with_our_workers) {
                            if (!career_cnst.includes(our_planet.building?.buildingType) ||
                                career_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100
                            ) {
                                let real_num_of_workers = get_num_of_workers_fail_safe(our_planet.id)
                                if (career_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                    let max_workers= -1
                                    let pl_idx=-1
                                    for(const wrk_group of our_planet.workerGroups){
                                        if(wrk_group.number>=max_workers){
                                            max_workers=wrk_group.number
                                            pl_idx=wrk_group.playerIndex
                                        }
                                    }
                                    if(pl_idx !== MY_INDEX){continue}
                                    real_num_of_workers = Math.min(get_total_num_of_allies_on_planet(our_planet.id) - 100, real_num_of_workers)
                                }
                                if (real_num_of_workers > 0 && get_how_many_flying_to_planet(planet.id, "last_build") === 0) {
                                    const workers_free = real_num_of_workers
                                    const diff = Math.min(workers_free, workers_needed)
                                    workers_needed -= diff
                                    remove_workers_from_our_wrk_group_on_planet(our_planet.id, diff)
                                    // ALL_PLANETS[our_planet.id].workerGroups[0].number -= diff
                                    add_to_FNS(our_planet.id, planet.id, diff, null, true, "last_build")
                                }
                            }
                        }
                    }
                }
                for (const planet of mines_planets) {
                    let workers_needed = 100 - get_total_num_of_allies_on_planet(planet.id)
                    if (workers_needed > 0) {
                        for (const our_planet of planets_with_our_workers) {
                            if (!mines_cnst.includes(our_planet.building?.buildingType) ||
                                mines_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                let real_num_of_workers = get_num_of_workers_fail_safe(our_planet.id)
                                if (mines_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                    let max_workers= -1
                                    let pl_idx=-1
                                    for(const wrk_group of our_planet.workerGroups){
                                        if(wrk_group.number>=max_workers){
                                            max_workers=wrk_group.number
                                            pl_idx=wrk_group.playerIndex
                                        }
                                    }
                                    if(pl_idx !== MY_INDEX){continue}
                                    real_num_of_workers = Math.min(get_total_num_of_allies_on_planet(our_planet.id) - 100, real_num_of_workers)
                                }
                                if (real_num_of_workers > 0 && get_how_many_flying_to_planet(planet.id, "last_build") === 0) {
                                    const workers_free = real_num_of_workers
                                    const diff = Math.min(workers_free, workers_needed)
                                    workers_needed -= diff
                                    remove_workers_from_our_wrk_group_on_planet(our_planet.id, diff)
                                    // ALL_PLANETS[our_planet.id].workerGroups[0].number -= diff
                                    add_to_FNS(our_planet.id, planet.id, diff, null, true, "last_build")
                                }
                            }
                        }
                    }
                }
                for (const planet of quarry_planets) {
                    let workers_needed = 100 - get_total_num_of_allies_on_planet(planet.id)
                    if (workers_needed > 0) {
                        for (const our_planet of planets_with_our_workers) {
                            if (!quarry_cnst.includes(our_planet.building?.buildingType) ||
                                quarry_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                    
                                let real_num_of_workers = get_num_of_workers_fail_safe(our_planet.id)
                                if (quarry_cnst.includes(our_planet.building?.buildingType) && get_total_num_of_allies_on_planet(our_planet.id) > 100) {
                                    let max_workers= -1
                                    let pl_idx=-1
                                    for(const wrk_group of our_planet.workerGroups){
                                        if(wrk_group.number>=max_workers){
                                            max_workers=wrk_group.number
                                            pl_idx=wrk_group.playerIndex
                                        }
                                    }
                                    if(pl_idx !== MY_INDEX){continue}
                                    real_num_of_workers = Math.min(get_total_num_of_allies_on_planet(our_planet.id) - 100, real_num_of_workers)
                                }

                                if (real_num_of_workers > 0 && get_how_many_flying_to_planet(planet.id, "last_build") === 0) {
                                    const workers_free = real_num_of_workers
                                    const diff = Math.min(workers_free, workers_needed)
                                    workers_needed -= diff
                                    remove_workers_from_our_wrk_group_on_planet(our_planet.id, diff)
                                    // ALL_PLANETS[our_planet.id].workerGroups[0].number -= diff
                                    add_to_FNS(our_planet.id, planet.id, diff, null, true, "last_build")
                                }
                            }
                        }
                    }
                }
            }
        }

        if (BUILD_LIST.length !== 0) {
            console.log(BUILD_LIST)
        }
        const delete_from_BUILD_LIST: number[] = []
        for (let i = 0; i < BUILD_LIST.length; i++) {
            const building = BUILD_LIST[i]
            if (ALL_PLANETS[building.planet_idx].building?.buildingType === building.action.buildingType) {
                delete_from_BUILD_LIST.push(i)
                continue
            }
            let skip_flag = true
            // console.log(planets[building.planet_idx])
            for (const [key, flying_group] of FLYING_NAVIGATION_SYSTEM) {
                if (flying_group.next_arrival_tick === game.currentTick && flying_group.destination === building.planet_idx && flying_group.intent === "initial_building") {
                    skip_flag = false
                }
            }
            if (skip_flag) {
                for (const [key, flying_group] of FNS_ARCHIVE) {
                    if (flying_group.next_arrival_tick <= game.currentTick && flying_group.destination === building.planet_idx && flying_group.intent === "initial_building") {
                        skip_flag = false
                    }
                }
            }

            if (!skip_flag && ALL_PLANETS[building.planet_idx].workerGroups.length > 0 && get_total_num_of_my_workers_on_planet(building.planet_idx) > 0) {
                for (const { name, value } of building.needed_resources) {
                    const res_on_planet = ALL_PLANETS[building.planet_idx].resources.get(name)
                    if (res_on_planet === undefined || res_on_planet < value) {
                        skip_flag = true
                        break
                    }
                }
                if (skip_flag) {
                    continue
                }
                BUILDS.push(building.action) // ENOUGH RESOURCES
            }
        }

        BUILD_LIST = BUILD_LIST.filter((_, idx) => !delete_from_BUILD_LIST.includes(idx))



        console.log(`current_tick: ${game.currentTick}`)
        if (SPECIALTY === Specialty.PRODUCTION) {
            execute_CS()
        }

        execute_FNS(MOVES)
        // if(game.currentTick===700){
        //     // console.log(our_planet.id)
        //     // console.log(TOTAL_BUILDINGS)
        //     console.log(FLYING_NAVIGATION_SYSTEM)
        //     console.log(MOVES)
        //     exit()
        // }
        // if (game.currentTick === 200) {
        //     exit()
        // }
        // console.log("==============================")
        // if (game.currentTick > 50) {
        //     console.log(COURIER_SYSTEM.size)
        //     console.log(NUM_OF_COURIERS)
        //     console.log(INIT_COURIERS)
        // }

        // console.log("==============================")
        // if (CURRENT_TICK === 178) {
        //     // console.log(x)
        //     // console.log(ALL_PLANETS_ORIGINAL[parseInt(x)].workerGroups)
        //     // console.log(ALL_PLANETS[parseInt(x)].workerGroups)
        //     // console.log(num_of_workers)
        //     // console.log(get_how_many_foreign_workers(parseInt(x)))
        //     console.log(COURIER_SYSTEM)
        //     console.log(FLYING_NAVIGATION_SYSTEM)
        //     // console.log(get_how_many_flying_to_planet(parseInt(x), "send_free_workers"))
        //     // console.log(BUILDING_SELF_WORKERS_NUM[parseInt(x)])
        //     exit()
        // }
        // console.log(FLYING_NAVIGATION_SYSTEM)
        console.timeEnd()
        return new Action(MOVES, BUILDS, SPECIALTY)
    }
}