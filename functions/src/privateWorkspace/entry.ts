import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(__dirname, "../../secure-entry");
export async function publicEntry(path: string) {
  const file = path === "/" ? "index.html" : path.slice(1);
  if (file !== "index.html" && !/^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(file)) return null;
  const body = await readFile(resolve(root, file));
  return {body, type:file.endsWith(".html")?"text/html":file.endsWith(".css")?"text/css":"application/javascript"};
}
export const gatePolicy = "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self'; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src https://dandd-ea955.firebaseapp.com https://dandd-ea955.web.app; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";
