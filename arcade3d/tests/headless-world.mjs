import {World as RealWorld} from '../world.js';
export class World extends RealWorld{
 constructor(host,options){super(host,{...options,headless:true});this.renderer={shadowMap:{enabled:false},setPixelRatio(){},render(){},dispose(){}};}
}
