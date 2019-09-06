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

class Bot {
    public readonly id: number;
    public readonly trackingId: number;
    public readonly ipAddress: string;
    public readonly leftCenter: number;
    public readonly rightCenter: number;
    public pos: BotPos = new BotPos(0,0,0);
    public power: EnginePower = new EnginePower(0,0);

    constructor(def:BotDefinition){
        this.id = def.id;
        this.trackingId = def.trackingId;
        this.ipAddress = def.ipAddress;
        this.leftCenter = def.leftCenter;
        this.rightCenter = def.rightCenter;
    }

    public getPower(): Uint8Array{
        let array = new Uint8Array(2);
        array[0] = this.powerToByte(this.power.left, this.leftCenter)
        array[1] = this.powerToByte(this.power.right, this.rightCenter)
        return array;
    }

    public sendPower(socket: Socket) {
        socket.send(this.getPower(),4210,this.ipAddress)
    }

    private powerToByte(power: number, mid: number): number{
        if(power == 0) return mid;
        if(power > 0) return Math.round((180 - mid) * power)
        return Math.round(mid * Math.abs(power))
    }
}

export default class RealBots implements IBotPhysics{
    private bots: Bot[] = [];
    private onUpdate: IPositionCallback = () => {}
    private socket: Socket = dgram.createSocket('udp4');
    private camera: ChildProcess;

    constructor(robotconfig: RobotConfig){
        const bots = robotconfig.definition.map(d => new Bot(d));
        for (const id of robotconfig.use) {
            this.bots.push(bots.find(b => b.id == id)!);
        }

        setInterval(this.sendPower.bind(this), 25);

        this.camera = spawn("python3", ["./camserver/marker_manager/scanner.py"]);
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
            this.bots.find(b => b.id == id)!.pos = pos;
        }
        this.onUpdate(this.bots.map(b => b.pos))
    }
}