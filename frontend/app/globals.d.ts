// This tells TypeScript that importing CSS files is allowed
declare module "*.css" {
  const content: any;
  export default content;
}
