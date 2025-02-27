//custom.d.ts
declare module '*.js' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: any;
    export = value;
  }
  