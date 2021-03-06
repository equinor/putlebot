import BotPos from "../bots/BotPos";
import EnginePower from "../bots/EnginePower";
import Point from "./Point";


export default class Bot{
    public constructor(
        public readonly pos: BotPos,
        public readonly controller: BotController = stop,
    ) {
    }

    public setPos(pos: BotPos): Bot {
        return this.set({pos: pos})
    }

    public get power(): EnginePower {
        return this.controller(this.pos);
    }
  

    public setPower(power: EnginePower) { 
        return this.set({controller: setPower(power)});
    }

    public goTo(point:Point): Bot{
        return this.set({controller: goTo(point)});
    }

    public turnToPoint(point:Point): Bot{
        return this.set({controller: turnToPoint(point)});
    }

    public stop() {
        return this.set({controller: stop});
    }

    public set({pos = this.pos, controller = this.controller}): Bot{
        return new Bot(pos, controller)
    }
}

export interface BotController{
    (pos: BotPos): EnginePower
}

function goTo(point:Point): BotController {
    return (pos:BotPos) => {
        const delta = point.sub(pos.point);
        let offset = delta.asAngle().sub(pos.angle).right * 0.5;
        let right = 0.5;
        let left = 0.5;
        if(offset > 0 ){
            left = -offset / Math.PI
        }
        if(offset < 0) {
            right = offset / Math.PI
        }
        let maxPower = Math.min(delta.distance(), 1);
        
        return new EnginePower(left * maxPower, right * maxPower);
    }

}

function turnToPoint(point: Point): BotController {
    return (pos: BotPos) => {
        const target = point.sub(pos.point).asAngle();
        const right = target.sub(pos.angle).right * 0.5;
        return new EnginePower(-right, right);
    }
}

function setPower(power: EnginePower): BotController {
    return () => power;
}

function stop(): EnginePower {
    return EnginePower.NoPower;
}