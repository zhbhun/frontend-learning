import styles from './icon.module.scss';
import type { ColorName } from '../../../globals/colors';
import { IconName, icons } from '../../../globals/icons';
import vars from '../../../globals/variables.module.scss';

export type Direction = 'left' | 'up' | 'right' | 'down';

export interface IconProps {
    color?: ColorName;
    name?: IconName;
    direction?: Direction;
}

const rotation = {
    left: -90,
    up: 0,
    right: 90,
    down: 180,
};

export const Icon = ({
    color = 'black',
    name = 'arrow',
    direction = 'up',
}: IconProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={styles.root}
        >
            <title>{icons[name].title}</title>
            <g
                fill={vars[color]}
                transform={`rotate(${
                    icons[name].rotateable ? rotation[direction] : 0
                }, 12, 12)`}
            >
                {icons[name].paths
                    ? icons[name].paths.map((path, idx) => (
                          <path
                              key={idx}
                              d={path}
                              clipRule="evenodd"
                              fillRule="evenodd"
                          />
                      ))
                    : null}
            </g>
        </svg>
    );
};
