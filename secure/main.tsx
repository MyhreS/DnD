import {createRoot} from "react-dom/client";
import {SecureEntry} from "../src/secure/SecureEntry";
import "../src/secure/secure.css";
createRoot(document.getElementById("root")!).render(<SecureEntry/>);
