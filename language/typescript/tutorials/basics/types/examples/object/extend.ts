interface Colorful1 {
  color: string;
}

interface Circle1 {
  radius: number;
}

interface ColorfulCircle1 extends Colorful1, Circle1 {}

const cc: ColorfulCircle1 = {
  color: "red",
  radius: 42,
};
