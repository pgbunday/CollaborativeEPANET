import { NodeProperty, TimeParameter } from "epanet-js";
import { EpanetWrapper } from "./epanet/EpanetWrapper";
const epanet = new EpanetWrapper('utm15n');
console.log(epanet);
epanet.addReservoir({
    type: "add_reservoir_action",
    id: 'r1',
    x: 0.0,
    y: 0.0,
});
epanet.addJunction({
    type: "add_junction_action",
    id: 'j1',
    elevation: 0,
    x: 1.0,
    y: 0.0,
});
epanet.addPipe({
    start_node: 'r1',
    end_node: 'j1',
    id: 'p1',
    length: 1.0,
    type: "add_pipe_action",
    vertices: [],
});
epanet.reservoirProperties({
    type: "set_reservoir_properties_action",
    new_id: 'r1',
    old_id: 'r1',
    total_head: 1.0,
})
epanet.project.setTimeParameter(TimeParameter.Duration, 86400);
epanet.openH();
epanet.initH();
while (true) {
    const currentStep = epanet.runH();
    console.log(epanet.getNodePressures());
    console.log(currentStep);
    if (epanet.nextH() == 0) {
        break;
    } else {
        continue;
    }
}