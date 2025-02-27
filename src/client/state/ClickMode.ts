export type ClickModes = "pan" | "add_junction" | "add_reservoir" | "add_tank" | "add_pipe"

export default class ClickMode {
    value: ClickModes
    constructor() {
        this.value = "pan";
    }
    getClickMode(): ClickModes {
        return this.value;
    }
    setClickMode(mode: ClickModes): void {
        this.value = mode;
    }
}
