// 색상을 16진수로 변환하는 함수
export const colorToHex = (color?: string) => {
  if (!color) return 0x000000;
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  return 0x000000;
};
