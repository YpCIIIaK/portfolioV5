declare module "mailparser" {
  interface AddressObject {
    value?: { name?: string; address?: string }[];
    text?: string;
  }
  interface ParsedMail {
    from?: AddressObject;
    subject?: string;
    date?: Date;
    text?: string;
    html?: string | false;
  }
  export function simpleParser(source: Buffer | string): Promise<ParsedMail>;
}
