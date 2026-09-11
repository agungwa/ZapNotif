declare module "qrcode-terminal" {
  export function generate(text: string, opts?: { small?: boolean }): void;
  const qrcode: { generate: typeof generate };
  export default qrcode;
}
