import IBotPhysics, { IPositionCallback } from "./IBotPhysics";
import BotPos from "./BotPos";
import EnginePower from "./EnginePower";
import dgram, { Socket } from 'dgram'
import { ChildProcess, spawn } from "child_process";
import readline from 'readline';

interface BotDefinition {
    name: string;
    id: number;
    trackingId: number;
    ipAddress: string;
    leftCenter: number;
    rightCenter: number;
    flipped?: boolean;
}

interface RobotConfig {
    definition: BotDefinition[];
    use: number[];
}

export class Bot {
    public readonly id: number;
    public readonly trackingId: number;
    public readonly ipAddress: string;
    public pos: BotPos = new BotPos(0,0,0);
    public power: EnginePower = new EnginePower(0,0);

    constructor(def:BotDefinition){
        this.id = def.id;
        this.trackingId = def.trackingId;
        this.ipAddress = def.ipAddress;
    }

    public getPower(): Uint8Array{
        let array = new Uint8Array(2);
        array[1] = Bot.powerToByte(this.power.left)
        array[0] = Bot.powerToByte(this.power.right)
        return array;
    }

    public sendPower(socket: Socket) {
        socket.send(this.getPower(),4210,this.ipAddress)
    }

    public static powerToByte(power: number): number{
        power += 1; // have it go from 0 - 2 and not -1 to 1;
        return Math.round(power * 90); // multiply by 90 to get from 0-180 and round to whole integer.
    }
}

export default class RealBots implements IBotPhysics{
    private bots: Bot[] = [];
    private onUpdate: IPositionCallback = () => {}
    private socket: Socket = dgram.createSocket('udp4');
    private camera: ChildProcess;

    constructor(robotConfig: RobotConfig){
        const bots = robotConfig.definition.map(d => new Bot(d));
        for (const id of robotConfig.use) {
            this.bots.push(bots.find(b => b.id == id)!);
        }
        console.log(this.bots);

        setInterval(this.sendPower.bind(this), 25);

        this.camera = spawn("python", ["./cameraserver/marker_manager/scaner.py"]);
        this.camera.stderr!.on('data', (data) => console.error(`child stderr:\n${data}`));
        let lines = readline.createInterface(this.camera.stdout!);
        lines.on("line", this.readLine.bind(this));

    }

    public start(onUpdate: IPositionCallback, pos: BotPos[]): void {
        const length = Math.min(pos.length, this.bots.length);
        for (let i = 0; i < length; i += 1) {
            this.bots[i].pos = pos[i];
        }
        this.onUpdate = onUpdate;
    }
    
    public setPower(power: EnginePower[]): void {
        const length = Math.min(power.length, this.bots.length);
        for (let i = 0; i < length; i += 1) {
            this.bots[i].power = power[i];
        }
    }

    private sendPower(){
        for (const bot of this.bots) {
            bot.sendPower(this.socket);
        }
    }

    private readLine(line:string){
        const list = line.split("|").map(Number.parseFloat);
        for (let index = 0; index + 4 < list.length; index += 4) {
            const id = list[index];
            const pos = new BotPos(list[index + 1], list[index + 2], list[index + 3]);
            const bot = this.bots.find(b => b.trackingId == id);
            if(bot){
                bot.pos = pos;
            }
        }
        this.onUpdate(this.bots.map(b => b.pos));
    }
}