interface Colorful2 {
  color: string;
}
interface Circle2 {
  radius: number;
}

type ColorfulCircle2 = Colorful2 & Circle2;
