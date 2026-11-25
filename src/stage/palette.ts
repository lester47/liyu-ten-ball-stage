export { rainbow } from '../timeline';

/** 隊色：藍隊 L、橘隊 R（與鯉魚市集同一組飽和度）。 */
export const TEAM = { left: '#2f8fe0', right: '#f08a2c' };
export const teamColor = (i: number) => (i < 5 ? TEAM.left : TEAM.right);

/** 球道底色：五條淡彩條，取自市集攤位的糖果色。 */
export const LANE_COLORS = ['#cfe9ff', '#e4dcff', '#ffd9e4', '#d3f1dc', '#ffe8c7'];

export const SKIN = ['#f6cfaa', '#efbf96', '#e7b088', '#f3c7a1', '#d9a07a'];
export const HAIR = ['#3a2a22', '#5b3a26', '#262626', '#7a4b2a', '#3d2f2a'];
