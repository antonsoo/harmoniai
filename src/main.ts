import "./fonts/fonts.css";
import "./style.css";
import { mount } from "./ui/app";
import { shell } from "./ui/shell";

const app = document.querySelector<HTMLDivElement>("#app");
const main = app ? shell(app, "greek") : null;
if (main) mount(main);
