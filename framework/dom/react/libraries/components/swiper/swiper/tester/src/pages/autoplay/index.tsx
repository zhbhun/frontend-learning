import "swiper/css";
import { Autoplay } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import styles from "./index.module.less";

export default function App() {
  return (
    <Swiper
      className={styles.swiper}
      modules={[Autoplay]}
      autoplay={{
        disableOnInteraction: false,
        delay: 1000,
      }}
      loop
      spaceBetween={30}
      speed={3000}
      slidesPerView={3}
    >
      <SwiperSlide>Slide 1</SwiperSlide>
      <SwiperSlide>Slide 2</SwiperSlide>
      <SwiperSlide>Slide 3</SwiperSlide>
      <SwiperSlide>Slide 4</SwiperSlide>
      <SwiperSlide>Slide 5</SwiperSlide>
      <SwiperSlide>Slide 6</SwiperSlide>
      <SwiperSlide>Slide 7</SwiperSlide>
      <SwiperSlide>Slide 8</SwiperSlide>
      <SwiperSlide>Slide 9</SwiperSlide>
    </Swiper>
  );
}
