import "./fonts/fonts.css";
import "./style.css";
import { shell } from "./ui/shell";
import { mountVina } from "./ui/vina";

const app = document.querySelector<HTMLDivElement>("#app");
const main = app ? shell(app, "india") : null;
if (main) mountVina(main);
