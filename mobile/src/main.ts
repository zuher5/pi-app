import { mount } from "svelte";
import "./lib/theme.css";
import "./lib/theme.svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
