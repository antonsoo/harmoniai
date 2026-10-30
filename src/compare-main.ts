import "./fonts/fonts.css";
import "./style.css";
import "./compare.css";
import { mountComparison } from "./ui/comparison";
import { shell } from "./ui/shell";

const app = document.querySelector<HTMLDivElement>("#app");
const main = app ? shell(app, "comparison") : null;
if (main) mountComparison(main);
