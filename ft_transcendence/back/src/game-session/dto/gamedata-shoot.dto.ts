import { OrientationEnum } from '../enum/orientation.enum';

export class GamedataShootDto {
  x: number;
  y: number;
  orientation: OrientationEnum;
  balls: { x: number; y: number }[];
}
